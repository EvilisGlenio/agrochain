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
}
