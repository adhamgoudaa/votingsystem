const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BoardroomVoting", function () {
    let BoardroomVoting;
    let voting;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        BoardroomVoting = await ethers.getContractFactory("BoardroomVoting");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        voting = await BoardroomVoting.deploy();
        await voting.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right admin", async function () {
            expect(await voting.hasRole(await voting.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(true);
            expect(await voting.hasRole(await voting.ADMIN_ROLE(), owner.address)).to.equal(true);
        });
    });

    describe("Voter Registration", function () {
        it("Should allow admin to register voters with weights", async function () {
            await voting.registerVoter(addr1.address, 2);
            const voter = await voting.voters(addr1.address);
            expect(voter.weight).to.equal(2);
            expect(voter.isRegistered).to.equal(true);
        });

        it("Should not allow non-admin to register voters", async function () {
            await expect(
                voting.connect(addr1).registerVoter(addr2.address, 1)
            ).to.be.reverted;
        });

        it("Should not allow registering with zero weight", async function () {
            await expect(
                voting.registerVoter(addr1.address, 0)
            ).to.be.revertedWith("Weight must be positive");
        });
    });

    describe("Proposal Creation and Voting", function () {
        beforeEach(async function () {
            await voting.registerVoter(addr1.address, 2);
            await voting.registerVoter(addr2.address, 1);
        });

        it("Should create a proposal with multiple options", async function () {
            const startTime = (await time.latest()) + 100;
            const duration = 3600;
            const tx = await voting.createProposal(
                "Test Proposal",
                ["Option 1", "Option 2"],
                startTime,
                duration
            );

            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'ProposalCreated');
            expect(event).to.not.be.undefined;

            const proposalDetails = await voting.getProposalDetails(0);
            expect(proposalDetails.description).to.equal("Test Proposal");
            expect(proposalDetails.startTime).to.equal(startTime);
            expect(proposalDetails.endTime).to.equal(startTime + duration);
            expect(proposalDetails.optionCount).to.equal(2);
        });

        it("Should allow weighted voting", async function () {
            const startTime = (await time.latest()) + 100;
            await voting.createProposal(
                "Test Proposal",
                ["Option 1", "Option 2"],
                startTime,
                3600
            );

            await time.increaseTo(startTime + 1);

            await voting.connect(addr1).castVote(0, 0, 75); // Weight: 2
            await voting.connect(addr2).castVote(0, 0, 100); // Weight: 1

            const option = await voting.getOptionDetails(0, 0);
            expect(option.scoreSum).to.equal(250); // (75 * 2) + (100 * 1)
            expect(option.weightedVoteCount).to.equal(3); // 2 + 1
        });

        it("Should calculate correct winner based on weighted average", async function () {
            const startTime = (await time.latest()) + 100;
            await voting.createProposal(
                "Test Proposal",
                ["Option 1", "Option 2"],
                startTime,
                3600
            );

            await time.increaseTo(startTime + 1);

            // addr1 (weight 2) votes for option 0 with score 75
            await voting.connect(addr1).castVote(0, 0, 75);
            // addr2 (weight 1) votes for option 1 with score 100
            await voting.connect(addr2).castVote(0, 1, 100);

            await time.increaseTo(startTime + 3601);

            const tx = await voting.finalizeProposal(0);
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'ProposalFinalized');
            
            // Option 1 should win because (100 * 1) / 1 > (75 * 2) / 2
            expect(event.args.winningOption).to.equal(1);
        });
    });
}); 