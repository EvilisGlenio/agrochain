// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract AgroDAO is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TARGET_ROLE = keccak256("TARGET_ROLE");
    bytes32 public constant PARAMETER_ROLE = keccak256("PARAMETER_ROLE");

    enum ProposalState {
        Unknown,
        Pending,
        Active,
        Defeated,
        Succeeded,
        Executed
    }

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes data;
        bytes32 descriptionHash;
        uint64 snapshotBlock;
        uint64 deadlineBlock;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
    }

    IVotes public immutable votesToken;

    uint256 public proposalCount;
    uint256 public proposalThreshold;
    uint256 public quorumVotes;
    uint64 public votingDelay;
    uint64 public votingPeriod;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => bool) public allowedTargets;

    event Proposed(
        uint256 indexed id,
        address indexed proposer,
        address indexed target,
        uint256 value,
        bytes32 descriptionHash,
        uint64 snapshotBlock,
        uint64 deadlineBlock
    );
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event Executed(uint256 indexed id, address indexed target, uint256 value);
    event AllowedTargetUpdated(address indexed target, bool allowed);
    event VotingParamsUpdated(
        uint256 oldProposalThreshold,
        uint256 newProposalThreshold,
        uint256 oldQuorumVotes,
        uint256 newQuorumVotes,
        uint64 oldVotingDelay,
        uint64 newVotingDelay,
        uint64 oldVotingPeriod,
        uint64 newVotingPeriod
    );

    constructor(
        address admin,
        address votesToken_,
        uint256 proposalThreshold_,
        uint256 quorumVotes_,
        uint64 votingDelay_,
        uint64 votingPeriod_
    ) {
        require(admin != address(0), "invalid admin");
        require(votesToken_ != address(0), "invalid votes token");
        require(quorumVotes_ > 0, "invalid quorum");
        require(votingPeriod_ > 0, "invalid voting period");

        votesToken = IVotes(votesToken_);
        proposalThreshold = proposalThreshold_;
        quorumVotes = quorumVotes_;
        votingDelay = votingDelay_;
        votingPeriod = votingPeriod_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(TARGET_ROLE, admin);
        _grantRole(PARAMETER_ROLE, admin);
    }

    function setAllowedTarget(address target, bool allowed) external onlyRole(TARGET_ROLE) {
        require(target != address(0), "invalid target");

        allowedTargets[target] = allowed;

        emit AllowedTargetUpdated(target, allowed);
    }

    function setVotingParams(
        uint256 proposalThreshold_,
        uint256 quorumVotes_,
        uint64 votingDelay_,
        uint64 votingPeriod_
    ) external onlyRole(PARAMETER_ROLE) {
        require(quorumVotes_ > 0, "invalid quorum");
        require(votingPeriod_ > 0, "invalid voting period");

        uint256 oldProposalThreshold = proposalThreshold;
        uint256 oldQuorumVotes = quorumVotes;
        uint64 oldVotingDelay = votingDelay;
        uint64 oldVotingPeriod = votingPeriod;

        proposalThreshold = proposalThreshold_;
        quorumVotes = quorumVotes_;
        votingDelay = votingDelay_;
        votingPeriod = votingPeriod_;

        emit VotingParamsUpdated(
            oldProposalThreshold,
            proposalThreshold_,
            oldQuorumVotes,
            quorumVotes_,
            oldVotingDelay,
            votingDelay_,
            oldVotingPeriod,
            votingPeriod_
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function propose(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external whenNotPaused returns (uint256 id) {
        require(allowedTargets[target], "target not allowed");
        require(data.length > 0, "empty proposal data");

        uint256 snapshotReferenceBlock = block.number - 1;
        require(
            votesToken.getPastVotes(msg.sender, snapshotReferenceBlock) >= proposalThreshold,
            "proposal threshold"
        );

        id = ++proposalCount;

        uint64 snapshotBlock = uint64(block.number + votingDelay);
        uint64 deadlineBlock = snapshotBlock + votingPeriod;
        bytes32 descriptionHash = keccak256(bytes(description));

        proposals[id] = Proposal({
            proposer: msg.sender,
            target: target,
            value: value,
            data: data,
            descriptionHash: descriptionHash,
            snapshotBlock: snapshotBlock,
            deadlineBlock: deadlineBlock,
            forVotes: 0,
            againstVotes: 0,
            executed: false
        });

        emit Proposed(id, msg.sender, target, value, descriptionHash, snapshotBlock, deadlineBlock);
    }

    function vote(uint256 id, bool support) external whenNotPaused {
        Proposal storage proposal = proposals[id];

        require(_exists(proposal), "unknown proposal");
        require(block.number >= proposal.snapshotBlock, "voting not started");
        require(block.number <= proposal.deadlineBlock, "voting ended");
        require(!hasVoted[id][msg.sender], "already voted");

        uint256 weight = votesToken.getPastVotes(msg.sender, proposal.snapshotBlock);
        require(weight > 0, "no voting power");

        hasVoted[id][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit Voted(id, msg.sender, support, weight);
    }

    function execute(uint256 id) external payable nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[id];

        require(_exists(proposal), "unknown proposal");
        require(block.number > proposal.deadlineBlock, "voting still active");
        require(!proposal.executed, "proposal already executed");
        require(proposal.forVotes >= quorumVotes, "quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "proposal defeated");
        require(allowedTargets[proposal.target], "target not allowed");

        proposal.executed = true;

        (bool ok,) = proposal.target.call{ value: proposal.value }(proposal.data);
        require(ok, "execution failed");

        emit Executed(id, proposal.target, proposal.value);
    }

    function state(uint256 id) external view returns (ProposalState) {
        Proposal storage proposal = proposals[id];

        if (!_exists(proposal)) {
            return ProposalState.Unknown;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.number < proposal.snapshotBlock) {
            return ProposalState.Pending;
        }

        if (block.number <= proposal.deadlineBlock) {
            return ProposalState.Active;
        }

        if (proposal.forVotes >= quorumVotes && proposal.forVotes > proposal.againstVotes) {
            return ProposalState.Succeeded;
        }

        return ProposalState.Defeated;
    }

    function _exists(Proposal storage proposal) internal view returns (bool) {
        return proposal.proposer != address(0);
    }
}
