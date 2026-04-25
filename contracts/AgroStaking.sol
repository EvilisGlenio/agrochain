// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract AgroStaking is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant PARAMETER_ROLE = keccak256("PARAMETER_ROLE");

    struct StakeInfo {
        uint256 amount;
        uint256 unclaimed;
        uint64 lastAccrual;
    }

    IERC20 public immutable token;
    AggregatorV3Interface public immutable priceFeed;

    mapping(address => StakeInfo) public stakeInfo;

    uint256 public baseAprBps;
    uint256 public minStake;
    uint256 public staleThreshold;
    int256 public floorPrice;
    int256 public ceilingPrice;

    event Staked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 reward);
    event Unstaked(address indexed user, uint256 amount);
    event AprUpdated(uint256 oldAprBps, uint256 newAprBps);
    event OracleParamsUpdated(
        uint256 oldStaleThreshold,
        uint256 newStaleThreshold,
        int256 oldFloorPrice,
        int256 newFloorPrice,
        int256 oldCeilingPrice,
        int256 newCeilingPrice
    );

    constructor(
        address admin,
        address token_,
        address priceFeed_,
        uint256 baseAprBps_,
        uint256 minStake_,
        uint256 staleThreshold_,
        int256 floorPrice_,
        int256 ceilingPrice_
    ) {
        require(admin != address(0), "invalid admin");
        require(token_ != address(0), "invalid token");
        require(priceFeed_ != address(0), "invalid price feed");
        require(floorPrice_ > 0, "invalid floor price");
        require(ceilingPrice_ >= floorPrice_, "invalid ceiling price");
        require(staleThreshold_ > 0, "invalid stale threshold");

        token = IERC20(token_);
        priceFeed = AggregatorV3Interface(priceFeed_);
        baseAprBps = baseAprBps_;
        minStake = minStake_;
        staleThreshold = staleThreshold_;
        floorPrice = floorPrice_;
        ceilingPrice = ceilingPrice_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(PARAMETER_ROLE, admin);
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= minStake, "min stake");

        _accrue(msg.sender);

        token.safeTransferFrom(msg.sender, address(this), amount);

        StakeInfo storage userStake = stakeInfo[msg.sender];
        userStake.amount += amount;
        userStake.lastAccrual = uint64(block.timestamp);

        emit Staked(msg.sender, amount);
    }

    function claim() external nonReentrant whenNotPaused {
        _accrue(msg.sender);

        StakeInfo storage userStake = stakeInfo[msg.sender];
        uint256 reward = userStake.unclaimed;

        require(reward > 0, "no rewards");

        userStake.unclaimed = 0;
        token.safeTransfer(msg.sender, reward);

        emit Claimed(msg.sender, reward);
    }

    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "invalid amount");

        _accrue(msg.sender);

        StakeInfo storage userStake = stakeInfo[msg.sender];
        require(userStake.amount >= amount, "insufficient stake");

        userStake.amount -= amount;
        userStake.lastAccrual = uint64(block.timestamp);

        token.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function setApr(uint256 newAprBps) external onlyRole(PARAMETER_ROLE) {
        require(newAprBps > 0, "invalid apr");

        uint256 oldAprBps = baseAprBps;
        baseAprBps = newAprBps;

        emit AprUpdated(oldAprBps, newAprBps);
    }

    function setOracleParams(
        uint256 newStaleThreshold,
        int256 newFloorPrice,
        int256 newCeilingPrice
    ) external onlyRole(PARAMETER_ROLE) {
        require(newStaleThreshold > 0, "invalid stale threshold");
        require(newFloorPrice > 0, "invalid floor price");
        require(newCeilingPrice >= newFloorPrice, "invalid ceiling price");

        uint256 oldStaleThreshold = staleThreshold;
        int256 oldFloorPrice = floorPrice;
        int256 oldCeilingPrice = ceilingPrice;

        staleThreshold = newStaleThreshold;
        floorPrice = newFloorPrice;
        ceilingPrice = newCeilingPrice;

        emit OracleParamsUpdated(
            oldStaleThreshold,
            newStaleThreshold,
            oldFloorPrice,
            newFloorPrice,
            oldCeilingPrice,
            newCeilingPrice
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function earned(address user) external view returns (uint256) {
        StakeInfo storage userStake = stakeInfo[user];

        if (userStake.amount == 0) {
            return userStake.unclaimed;
        }

        return userStake.unclaimed + _pendingReward(userStake.amount, userStake.lastAccrual);
    }

    function currentAprBps() external view returns (uint256) {
        (, int256 price,,,) = _latestValidRoundData();
        return _currentAprBps(price);
    }

    function _accrue(address user) internal {
        StakeInfo storage userStake = stakeInfo[user];

        if (userStake.amount == 0) {
            userStake.lastAccrual = uint64(block.timestamp);
            return;
        }

        uint256 reward = _pendingReward(userStake.amount, userStake.lastAccrual);

        if (reward > 0) {
            userStake.unclaimed += reward;
        }

        userStake.lastAccrual = uint64(block.timestamp);
    }

    function _pendingReward(uint256 amount, uint64 lastAccrual) internal view returns (uint256) {
        if (amount == 0 || lastAccrual == 0 || block.timestamp <= lastAccrual) {
            return 0;
        }

        (, int256 price,,,) = _latestValidRoundData();
        uint256 aprBps = _currentAprBps(price);
        uint256 dt = block.timestamp - lastAccrual;

        return (amount * aprBps * dt) / (365 days * 10_000);
    }

    function _currentAprBps(int256 price) internal view returns (uint256) {
        if (price < floorPrice) {
            return (baseAprBps * 90) / 100;
        }

        if (price > ceilingPrice) {
            return (baseAprBps * 110) / 100;
        }

        return baseAprBps;
    }

    function _latestValidRoundData()
        internal
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        (roundId, answer, startedAt, updatedAt, answeredInRound) = priceFeed.latestRoundData();

        require(answer > 0, "bad oracle");
        require(updatedAt > 0, "incomplete oracle round");
        require(updatedAt <= block.timestamp, "future oracle timestamp");
        require(answeredInRound >= roundId, "stale oracle round");
        require(block.timestamp - updatedAt <= staleThreshold, "stale oracle");
    }
}
