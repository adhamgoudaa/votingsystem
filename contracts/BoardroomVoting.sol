// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BoardroomVoting
 * @dev A smart contract for weighted boardroom voting with score-based options
 */
contract BoardroomVoting is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    bytes32 public constant BOARD_MEMBER_ROLE = keccak256("BOARD_MEMBER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Voter {
        uint256 weight;
        bool isRegistered;
        mapping(uint256 => bool) hasVotedForProposal;
    }

    struct VoteOption {
        string description;
        uint256 scoreSum;
        uint256 weightedVoteCount;
    }

    struct Proposal {
        string description;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        VoteOption[] options;
        uint256 totalVotes;
        mapping(address => uint8) votes;
    }

    mapping(address => Voter) public voters;
    mapping(uint256 => Proposal) public proposals;
    Counters.Counter private _proposalIds;

    event VoterRegistered(address indexed voter, uint256 weight);
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 option, uint256 weight);
    event ProposalFinalized(uint256 indexed proposalId, uint256 winningOption);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Assigns or revokes board member role for an address
     * @param account The address to modify board member status for
     * @param isBoardMember True to grant role, false to revoke
     */
    function setBoardMemberStatus(address account, bool isBoardMember) external onlyRole(ADMIN_ROLE) {
        if (isBoardMember) {
            grantRole(BOARD_MEMBER_ROLE, account);
        } else {
            revokeRole(BOARD_MEMBER_ROLE, account);
        }
    }

    function registerVoter(address voter, uint256 weight) external onlyRole(ADMIN_ROLE) {
        require(!voters[voter].isRegistered, "Voter already registered");
        require(weight > 0, "Weight must be positive");
        
        // Automatically grant board member role
        if (!hasRole(BOARD_MEMBER_ROLE, voter)) {
            grantRole(BOARD_MEMBER_ROLE, voter);
        }

        voters[voter].weight = weight;
        voters[voter].isRegistered = true;

        emit VoterRegistered(voter, weight);
    }

    function createProposal(
        string memory description,
        string[] memory optionDescriptions,
        uint256 startTime,
        uint256 duration
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(optionDescriptions.length >= 2, "Minimum 2 options required");
        require(startTime >= block.timestamp, "Start time must be in the future");
        require(duration > 0, "Duration must be positive");

        uint256 proposalId = _proposalIds.current();
        _proposalIds.increment();

        Proposal storage proposal = proposals[proposalId];
        proposal.description = description;
        proposal.startTime = startTime;
        proposal.endTime = startTime + duration;

        for (uint i = 0; i < optionDescriptions.length; i++) {
            proposal.options.push(VoteOption({
                description: optionDescriptions[i],
                scoreSum: 0,
                weightedVoteCount: 0
            }));
        }

        emit ProposalCreated(proposalId, description, startTime, proposal.endTime);
        return proposalId;
    }

    function castVote(uint256 proposalId, uint8 option, uint256 score) external nonReentrant {
        require(voters[msg.sender].isRegistered, "Voter not registered");
        require(!voters[msg.sender].hasVotedForProposal[proposalId], "Already voted");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.finalized, "Proposal already finalized");
        require(option < proposal.options.length, "Invalid option");
        require(score > 0 && score <= 100, "Score must be between 1 and 100");

        uint256 weight = voters[msg.sender].weight;
        proposal.options[option].scoreSum += score * weight;
        proposal.options[option].weightedVoteCount += weight;
        proposal.votes[msg.sender] = option;
        proposal.totalVotes += 1;
        voters[msg.sender].hasVotedForProposal[proposalId] = true;

        emit VoteCast(proposalId, msg.sender, option, weight);
    }

    function finalizeProposal(uint256 proposalId) external onlyRole(ADMIN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.finalized, "Already finalized");

        uint256 winningOption = 0;
        uint256 highestScore = 0;

        for (uint256 i = 0; i < proposal.options.length; i++) {
            uint256 avgScore = proposal.options[i].weightedVoteCount > 0 ?
                proposal.options[i].scoreSum / proposal.options[i].weightedVoteCount : 0;
            
            if (avgScore > highestScore) {
                highestScore = avgScore;
                winningOption = i;
            }
        }

        proposal.finalized = true;
        emit ProposalFinalized(proposalId, winningOption);
    }

    function getProposalDetails(uint256 proposalId) external view returns (
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool finalized,
        uint256 totalVotes,
        uint256 optionCount
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.finalized,
            proposal.totalVotes,
            proposal.options.length
        );
    }

    function getOptionDetails(uint256 proposalId, uint256 optionIndex) external view returns (
        string memory description,
        uint256 scoreSum,
        uint256 weightedVoteCount
    ) {
        Proposal storage proposal = proposals[proposalId];
        require(optionIndex < proposal.options.length, "Invalid option index");
        
        VoteOption storage option = proposal.options[optionIndex];
        return (
            option.description,
            option.scoreSum,
            option.weightedVoteCount
        );
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return voters[voter].hasVotedForProposal[proposalId];
    }

    function getVoteDetails(uint256 proposalId, address voter) external view returns (
        bool userHasVoted,
        uint8 votedOption,
        uint256 voterWeight
    ) {
        userHasVoted = voters[voter].hasVotedForProposal[proposalId];
        if (userHasVoted) {
            votedOption = proposals[proposalId].votes[voter];
        } else {
            votedOption = 0;
        }
        voterWeight = voters[voter].weight;
        return (userHasVoted, votedOption, voterWeight);
    }

    /**
     * @dev Check if a user can vote on a specific proposal
     * @param proposalId The ID of the proposal
     * @param voter The address of the voter
     * @return canVote Whether the user can vote on this proposal
     * @return reason Reason why they cannot vote (empty if they can vote)
     */
    function canVoteOnProposal(uint256 proposalId, address voter) external view returns (bool canVote, string memory reason) {
        // Check if proposal exists
        if (proposalId >= _proposalIds.current()) {
            return (false, "Proposal does not exist");
        }
        
        // Check if voter is registered
        if (!voters[voter].isRegistered) {
            return (false, "Voter not registered");
        }
        
        Proposal storage proposal = proposals[proposalId];
        
        // Check if proposal is finalized - only check this, not timestamps
        if (proposal.finalized) {
            return (false, "Proposal already finalized");
        }
        
        return (true, "");
    }

    /**
     * @dev Check if a user can still cast a vote (hasn't voted yet)
     * @param proposalId The ID of the proposal
     * @param voter The address of the voter
     * @return canStillVote Whether the user can still cast a vote
     * @return reason Reason why they cannot vote (empty if they can vote)
     */
    function canStillVote(uint256 proposalId, address voter) external view returns (bool canStillVote, string memory reason) {
        // First check if they can vote on the proposal at all
        (bool canVote, string memory voteReason) = this.canVoteOnProposal(proposalId, voter);
        if (!canVote) {
            return (false, voteReason);
        }
        
        // Check if they have already voted
        if (voters[voter].hasVotedForProposal[proposalId]) {
            return (false, "Already voted");
        }
        
        return (true, "");
    }

    /**
     * @dev Check if a user is registered as a voter
     * @param voter The address of the voter
     * @return True if the user is registered
     */
    function isVoterRegistered(address voter) external view returns (bool) {
        return voters[voter].isRegistered;
    }
} 