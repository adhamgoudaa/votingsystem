// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DepartmentVoting
 * @dev A smart contract for department-based weighted voting with score-based options
 */
contract DepartmentVoting is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    bytes32 public constant BOARD_MEMBER_ROLE = keccak256("BOARD_MEMBER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Department {
        string name;
        uint256 weight;
        bool isActive;
        address[] members;
        mapping(address => bool) isMember;
    }

    struct Voter {
        uint256 weight;
        bool isRegistered;
        uint256 departmentId;
        mapping(uint256 => bool) hasVotedForProposal;
        mapping(uint256 => mapping(uint256 => uint8)) optionScores; // proposalId => optionId => score
        mapping(uint256 => uint256) ratedOptionsCount; // proposalId => number of options rated
    }

    struct VoteOption {
        string description;
        uint256 totalScore;
        uint256 totalRatings;
        uint256 weightedVoteCount;
    }

    struct Proposal {
        string description;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        VoteOption[] options;
        uint256 totalVotes;
        mapping(address => bool) hasCompletedVoting;
        uint256[] participatingDepartments;
        mapping(uint256 => bool) isDepartmentParticipating;
    }

    mapping(uint256 => Department) public departments;
    mapping(address => Voter) public voters;
    mapping(uint256 => Proposal) public proposals;
    Counters.Counter private _departmentIds;
    Counters.Counter private _proposalIds;

    event DepartmentCreated(uint256 indexed departmentId, string name, uint256 weight);
    event DepartmentUpdated(uint256 indexed departmentId, string name, uint256 weight);
    event DepartmentDeactivated(uint256 indexed departmentId);
    event MemberAddedToDepartment(uint256 indexed departmentId, address indexed member);
    event MemberRemovedFromDepartment(uint256 indexed departmentId, address indexed member);
    event VoterRegistered(address indexed voter, uint256 weight, uint256 departmentId);
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 startTime, uint256 endTime, uint256[] participatingDepartments);
    event OptionRated(uint256 indexed proposalId, address indexed voter, uint256 optionId, uint8 score);
    event VotingCompleted(uint256 indexed proposalId, address indexed voter);
    event ProposalFinalized(uint256 indexed proposalId, uint256 winningOption);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Creates a new department
     * @param name The name of the department
     * @param weight The voting weight of the department
     */
    function createDepartment(string memory name, uint256 weight) external onlyRole(ADMIN_ROLE) {
        require(weight > 0, "Weight must be positive");
        require(bytes(name).length > 0, "Department name cannot be empty");

        uint256 departmentId = _departmentIds.current();
        _departmentIds.increment();

        Department storage dept = departments[departmentId];
        dept.name = name;
        dept.weight = weight;
        dept.isActive = true;

        emit DepartmentCreated(departmentId, name, weight);
    }

    /**
     * @dev Updates department information
     * @param departmentId The ID of the department to update
     * @param name The new name of the department
     * @param weight The new voting weight of the department
     */
    function updateDepartment(uint256 departmentId, string memory name, uint256 weight) external onlyRole(ADMIN_ROLE) {
        require(departmentId < _departmentIds.current(), "Department does not exist");
        require(departments[departmentId].isActive, "Department is not active");
        require(weight > 0, "Weight must be positive");
        require(bytes(name).length > 0, "Department name cannot be empty");

        Department storage dept = departments[departmentId];
        dept.name = name;
        dept.weight = weight;

        emit DepartmentUpdated(departmentId, name, weight);
    }

    /**
     * @dev Deactivates a department
     * @param departmentId The ID of the department to deactivate
     */
    function deactivateDepartment(uint256 departmentId) external onlyRole(ADMIN_ROLE) {
        require(departmentId < _departmentIds.current(), "Department does not exist");
        require(departments[departmentId].isActive, "Department is already inactive");

        departments[departmentId].isActive = false;

        emit DepartmentDeactivated(departmentId);
    }

    /**
     * @dev Adds a member to a department
     * @param departmentId The ID of the department
     * @param member The address of the member to add
     */
    function addMemberToDepartment(uint256 departmentId, address member) external onlyRole(ADMIN_ROLE) {
        require(departmentId < _departmentIds.current(), "Department does not exist");
        require(departments[departmentId].isActive, "Department is not active");
        require(member != address(0), "Invalid member address");
        require(!departments[departmentId].isMember[member], "Member already in department");

        Department storage dept = departments[departmentId];
        dept.members.push(member);
        dept.isMember[member] = true;

        // Auto-register the member for all existing proposals where this department participates
        uint256 totalProposals = _proposalIds.current();
        for (uint256 i = 0; i < totalProposals; i++) {
            Proposal storage proposal = proposals[i];
            if (proposal.isDepartmentParticipating[departmentId]) {
                // Register the member as a voter for this proposal if not already registered
                if (!voters[member].isRegistered) {
                    voters[member].weight = dept.weight;
                    voters[member].isRegistered = true;
                    voters[member].departmentId = departmentId;
                    
                    // Grant board member role
                    if (!hasRole(BOARD_MEMBER_ROLE, member)) {
                        grantRole(BOARD_MEMBER_ROLE, member);
                    }
                    
                    emit VoterRegistered(member, dept.weight, departmentId);
                    break; // Only register once, then break
                } else {
                    // Update existing voter's department and weight if needed
                    if (voters[member].departmentId != departmentId) {
                        voters[member].departmentId = departmentId;
                        voters[member].weight = dept.weight;
                        emit VoterRegistered(member, dept.weight, departmentId);
                        break; // Only update once, then break
                    }
                }
            }
        }

        emit MemberAddedToDepartment(departmentId, member);
    }

    /**
     * @dev Removes a member from a department
     * @param departmentId The ID of the department
     * @param member The address of the member to remove
     */
    function removeMemberFromDepartment(uint256 departmentId, address member) external onlyRole(ADMIN_ROLE) {
        require(departmentId < _departmentIds.current(), "Department does not exist");
        require(departments[departmentId].isMember[member], "Member not in department");

        Department storage dept = departments[departmentId];
        dept.isMember[member] = false;

        // Remove from members array
        for (uint256 i = 0; i < dept.members.length; i++) {
            if (dept.members[i] == member) {
                dept.members[i] = dept.members[dept.members.length - 1];
                dept.members.pop();
                break;
            }
        }

        emit MemberRemovedFromDepartment(departmentId, member);
    }

    /**
     * @dev Registers a voter with a specific department
     * @param voter The address of the voter
     * @param departmentId The ID of the department
     */
    function registerVoter(address voter, uint256 departmentId) external onlyRole(ADMIN_ROLE) {
        require(!voters[voter].isRegistered, "Voter already registered");
        require(departmentId < _departmentIds.current(), "Department does not exist");
        require(departments[departmentId].isActive, "Department is not active");
        require(departments[departmentId].isMember[voter], "Voter not in department");

        // Automatically grant board member role
        if (!hasRole(BOARD_MEMBER_ROLE, voter)) {
            grantRole(BOARD_MEMBER_ROLE, voter);
        }

        voters[voter].weight = departments[departmentId].weight;
        voters[voter].isRegistered = true;
        voters[voter].departmentId = departmentId;

        emit VoterRegistered(voter, departments[departmentId].weight, departmentId);
    }

    /**
     * @dev Updates voter's department and weight
     * @param voter The address of the voter
     * @param newDepartmentId The new department ID
     */
    function updateVoterDepartment(address voter, uint256 newDepartmentId) external onlyRole(ADMIN_ROLE) {
        require(voters[voter].isRegistered, "Voter not registered");
        require(newDepartmentId < _departmentIds.current(), "Department does not exist");
        require(departments[newDepartmentId].isActive, "Department is not active");
        require(departments[newDepartmentId].isMember[voter], "Voter not in new department");

        voters[voter].departmentId = newDepartmentId;
        voters[voter].weight = departments[newDepartmentId].weight;

        emit VoterRegistered(voter, departments[newDepartmentId].weight, newDepartmentId);
    }

    /**
     * @dev Creates a proposal with specific departments that can vote
     * @param description The proposal description
     * @param optionDescriptions Array of voting options
     * @param startTime When voting starts
     * @param duration How long voting lasts
     * @param participatingDepartmentIds Array of department IDs that can vote
     */
    function createProposal(
        string memory description,
        string[] memory optionDescriptions,
        uint256 startTime,
        uint256 duration,
        uint256[] memory participatingDepartmentIds
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(optionDescriptions.length >= 2, "Minimum 2 options required");
        require(startTime >= block.timestamp, "Start time must be in the future");
        require(duration > 0, "Duration must be positive");
        require(participatingDepartmentIds.length > 0, "At least one department must participate");

        uint256 proposalId = _proposalIds.current();
        _proposalIds.increment();

        Proposal storage proposal = proposals[proposalId];
        proposal.description = description;
        proposal.startTime = startTime;
        proposal.endTime = startTime + duration;

        // Add voting options
        for (uint i = 0; i < optionDescriptions.length; i++) {
            proposal.options.push(VoteOption({
                description: optionDescriptions[i],
                totalScore: 0,
                totalRatings: 0,
                weightedVoteCount: 0
            }));
        }

        // Set participating departments and register all members as voters
        for (uint i = 0; i < participatingDepartmentIds.length; i++) {
            uint256 deptId = participatingDepartmentIds[i];
            require(deptId < _departmentIds.current(), "Department does not exist");
            require(departments[deptId].isActive, "Department is not active");
            require(!proposal.isDepartmentParticipating[deptId], "Department already participating");

            proposal.participatingDepartments.push(deptId);
            proposal.isDepartmentParticipating[deptId] = true;

            // Register all department members as voters for this proposal
            Department storage dept = departments[deptId];
            for (uint j = 0; j < dept.members.length; j++) {
                address member = dept.members[j];
                
                // Always ensure the member is registered as a voter with the correct department and weight
                if (!voters[member].isRegistered) {
                    // New voter registration
                    voters[member].weight = dept.weight;
                    voters[member].isRegistered = true;
                    voters[member].departmentId = deptId;
                    
                    // Grant board member role
                    if (!hasRole(BOARD_MEMBER_ROLE, member)) {
                        grantRole(BOARD_MEMBER_ROLE, member);
                    }
                    
                    emit VoterRegistered(member, dept.weight, deptId);
                } else {
                    // Update existing voter's department and weight if they're in a different department
                    if (voters[member].departmentId != deptId) {
                        voters[member].departmentId = deptId;
                        voters[member].weight = dept.weight;
                        emit VoterRegistered(member, dept.weight, deptId);
                    }
                }
            }
        }

        emit ProposalCreated(proposalId, description, startTime, proposal.endTime, participatingDepartmentIds);
        return proposalId;
    }

    /**
     * @dev Rate a specific option for a proposal
     * @param proposalId The ID of the proposal
     * @param optionId The ID of the option to rate
     * @param score The score (1-5) for this option
     */
    function rateOption(uint256 proposalId, uint256 optionId, uint8 score) external nonReentrant {
        require(voters[msg.sender].isRegistered, "Voter not registered");
        require(!voters[msg.sender].hasVotedForProposal[proposalId], "Already completed voting");
        require(!proposals[proposalId].hasCompletedVoting[msg.sender], "Already completed voting");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.finalized, "Proposal already finalized");
        require(optionId < proposal.options.length, "Invalid option");
        require(score >= 1 && score <= 5, "Score must be between 1 and 5");

        // Check if voter's department is participating in this proposal
        uint256 voterDeptId = voters[msg.sender].departmentId;
        require(proposal.isDepartmentParticipating[voterDeptId], "Your department is not participating in this proposal");

        // Check if this option was already rated by this voter
        require(voters[msg.sender].optionScores[proposalId][optionId] == 0, "Option already rated");

        // Record the score
        voters[msg.sender].optionScores[proposalId][optionId] = score;
        voters[msg.sender].ratedOptionsCount[proposalId]++;

        // Update option statistics with weighted score
        uint256 weight = voters[msg.sender].weight;
        uint256 weightedScore = score * weight;
        proposal.options[optionId].totalScore += weightedScore;
        proposal.options[optionId].totalRatings++;
        proposal.options[optionId].weightedVoteCount += weight;

        emit OptionRated(proposalId, msg.sender, optionId, score);

        // Check if all options have been rated
        if (voters[msg.sender].ratedOptionsCount[proposalId] == proposal.options.length) {
            // Complete the voting
            voters[msg.sender].hasVotedForProposal[proposalId] = true;
            proposal.hasCompletedVoting[msg.sender] = true;
            proposal.totalVotes++;
            
            emit VotingCompleted(proposalId, msg.sender);
        }
    }

    /**
     * @dev Complete voting by rating all options at once (gas efficient)
     * @param proposalId The ID of the proposal
     * @param scores Array of scores for all options (must match the number of options)
     */
    function completeVoting(uint256 proposalId, uint8[] memory scores) external nonReentrant {
        require(voters[msg.sender].isRegistered, "Voter not registered");
        require(!voters[msg.sender].hasVotedForProposal[proposalId], "Already completed voting");
        require(!proposals[proposalId].hasCompletedVoting[msg.sender], "Already completed voting");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.finalized, "Proposal already finalized");
        require(scores.length == proposal.options.length, "Must provide scores for all options");

        // Check if voter's department is participating in this proposal
        uint256 voterDeptId = voters[msg.sender].departmentId;
        require(proposal.isDepartmentParticipating[voterDeptId], "Your department is not participating in this proposal");

        uint256 weight = voters[msg.sender].weight;

        // Rate all options
        for (uint256 i = 0; i < proposal.options.length; i++) {
            require(scores[i] >= 1 && scores[i] <= 5, "Score must be between 1 and 5");
            
            // Only rate if not already rated
            if (voters[msg.sender].optionScores[proposalId][i] == 0) {
                voters[msg.sender].optionScores[proposalId][i] = scores[i];
                voters[msg.sender].ratedOptionsCount[proposalId]++;
                
                // Update option statistics with weighted score
                uint256 weightedScore = scores[i] * weight;
                proposal.options[i].totalScore += weightedScore;
                proposal.options[i].totalRatings++;
                proposal.options[i].weightedVoteCount += weight;
                
                emit OptionRated(proposalId, msg.sender, i, scores[i]);
            }
        }

        // Complete the voting
        voters[msg.sender].hasVotedForProposal[proposalId] = true;
        proposal.hasCompletedVoting[msg.sender] = true;
        proposal.totalVotes++;
        
        emit VotingCompleted(proposalId, msg.sender);
    }

    function finalizeProposal(uint256 proposalId) external onlyRole(ADMIN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.finalized, "Already finalized");

        uint256 winningOption = 0;
        uint256 highestTotalScore = 0;

        for (uint256 i = 0; i < proposal.options.length; i++) {
            if (proposal.options[i].totalScore > highestTotalScore) {
                highestTotalScore = proposal.options[i].totalScore;
                winningOption = i;
            }
        }

        proposal.finalized = true;
        emit ProposalFinalized(proposalId, winningOption);
    }

    /**
     * @dev Manually register a voter for a specific proposal (admin only)
     * @param voter The address of the voter to register
     * @param proposalId The ID of the proposal
     */
    function registerVoterForProposal(address voter, uint256 proposalId) external onlyRole(ADMIN_ROLE) {
        require(proposalId < _proposalIds.current(), "Proposal does not exist");
        require(!voters[voter].hasVotedForProposal[proposalId], "Voter already voted for this proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        // Check if voter is a member of any participating department
        bool isParticipating = false;
        uint256 participatingDeptId = 0;
        
        for (uint i = 0; i < proposal.participatingDepartments.length; i++) {
            uint256 deptId = proposal.participatingDepartments[i];
            if (departments[deptId].isMember[voter]) {
                isParticipating = true;
                participatingDeptId = deptId;
                break;
            }
        }
        
        require(isParticipating, "Voter is not a member of any participating department");
        
        // Register or update voter
        if (!voters[voter].isRegistered) {
            voters[voter].weight = departments[participatingDeptId].weight;
            voters[voter].isRegistered = true;
            voters[voter].departmentId = participatingDeptId;
            
            // Grant board member role
            if (!hasRole(BOARD_MEMBER_ROLE, voter)) {
                grantRole(BOARD_MEMBER_ROLE, voter);
            }
            
            emit VoterRegistered(voter, departments[participatingDeptId].weight, participatingDeptId);
        } else {
            // Update voter's department and weight if needed
            if (voters[voter].departmentId != participatingDeptId) {
                voters[voter].departmentId = participatingDeptId;
                voters[voter].weight = departments[participatingDeptId].weight;
                emit VoterRegistered(voter, departments[participatingDeptId].weight, participatingDeptId);
            }
        }
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
        
        // Check if proposal is finalized
        if (proposal.finalized) {
            return (false, "Proposal already finalized");
        }
        
        // Check if voter's department is participating
        uint256 voterDeptId = voters[voter].departmentId;
        if (!proposal.isDepartmentParticipating[voterDeptId]) {
            return (false, "Your department is not participating in this proposal");
        }
        
        return (true, "");
    }

    /**
     * @dev Check if a user can still rate options (hasn't completed voting yet)
     * @param proposalId The ID of the proposal
     * @param voter The address of the voter
     * @return canVote Whether the user can still rate options
     * @return reason Reason why they cannot vote (empty if they can vote)
     */
    function canStillVote(uint256 proposalId, address voter) external view returns (bool canVote, string memory reason) {
        // First check if they can vote on the proposal at all
        (bool canVoteOnProposal, string memory voteReason) = this.canVoteOnProposal(proposalId, voter);
        if (!canVoteOnProposal) {
            return (false, voteReason);
        }
        
        // Check if they have already completed voting
        if (voters[voter].hasVotedForProposal[proposalId]) {
            return (false, "Already completed voting");
        }
        
        return (true, "");
    }

    /**
     * @dev Get the total number of proposals
     * @return Total number of proposals created
     */
    function getProposalCount() external view returns (uint256) {
        return _proposalIds.current();
    }

    // View functions
    function getDepartmentCount() external view returns (uint256) {
        return _departmentIds.current();
    }

    function getDepartmentDetails(uint256 departmentId) external view returns (
        string memory name,
        uint256 weight,
        bool isActive,
        uint256 memberCount
    ) {
        require(departmentId < _departmentIds.current(), "Department does not exist");
        Department storage dept = departments[departmentId];
        return (dept.name, dept.weight, dept.isActive, dept.members.length);
    }

    function getDepartmentMember(uint256 departmentId, uint256 index) external view returns (address) {
        require(departmentId < _departmentIds.current(), "Department does not exist");
        Department storage dept = departments[departmentId];
        require(index < dept.members.length, "Index out of bounds");
        return dept.members[index];
    }

    function isMemberOfDepartment(uint256 departmentId, address member) external view returns (bool) {
        require(departmentId < _departmentIds.current(), "Department does not exist");
        return departments[departmentId].isMember[member];
    }

    function getProposalDetails(uint256 proposalId) external view returns (
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool finalized,
        uint256 totalVotes,
        uint256 optionCount,
        uint256 participatingDepartmentCount
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.finalized,
            proposal.totalVotes,
            proposal.options.length,
            proposal.participatingDepartments.length
        );
    }

    function getProposalParticipatingDepartment(uint256 proposalId, uint256 index) external view returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        require(index < proposal.participatingDepartments.length, "Index out of bounds");
        return proposal.participatingDepartments[index];
    }

    function isDepartmentParticipatingInProposal(uint256 proposalId, uint256 departmentId) external view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        return proposal.isDepartmentParticipating[departmentId];
    }

    function getOptionDetails(uint256 proposalId, uint256 optionIndex) external view returns (
        string memory description,
        uint256 totalScore,
        uint256 totalRatings,
        uint256 weightedVoteCount
    ) {
        Proposal storage proposal = proposals[proposalId];
        require(optionIndex < proposal.options.length, "Invalid option index");
        
        VoteOption storage option = proposal.options[optionIndex];
        return (
            option.description,
            option.totalScore,
            option.totalRatings,
            option.weightedVoteCount
        );
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return voters[voter].hasVotedForProposal[proposalId];
    }

    function getVoteDetails(uint256 proposalId, address voter) external view returns (
        bool userHasVoted,
        uint256[] memory optionScores,
        uint256 voterWeight,
        uint256 departmentId,
        uint256 ratedOptionsCount
    ) {
        userHasVoted = voters[voter].hasVotedForProposal[proposalId];
        voterWeight = voters[voter].weight;
        departmentId = voters[voter].departmentId;
        ratedOptionsCount = voters[voter].ratedOptionsCount[proposalId];
        
        Proposal storage proposal = proposals[proposalId];
        optionScores = new uint256[](proposal.options.length);
        
        for (uint256 i = 0; i < proposal.options.length; i++) {
            optionScores[i] = voters[voter].optionScores[proposalId][i];
        }
        
        return (userHasVoted, optionScores, voterWeight, departmentId, ratedOptionsCount);
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