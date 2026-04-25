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
}
