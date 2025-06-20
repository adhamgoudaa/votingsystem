const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    // Deploy the contract
    const BoardroomVoting = await hre.ethers.getContractFactory("BoardroomVoting");
    const voting = await BoardroomVoting.deploy();
    await voting.deployed();
    console.log("BoardroomVoting deployed to:", voting.address);

    // Get signers to act as board members
    const [admin, ...boardMembers] = await hre.ethers.getSigners();
    const numBoardMembers = 5; // Using 5 board members for simulation
    
    console.log("\n=== Registering Board Members ===");
    // Register board members with different voting weights
    const weights = [3, 2, 2, 1, 1]; // Different voting weights for members
    for (let i = 0; i < numBoardMembers; i++) {
        await voting.registerVoter(boardMembers[i].address, weights[i]);
        console.log(`Registered board member ${i + 1} with weight ${weights[i]}`);
    }

    // Create a proposal
    console.log("\n=== Creating Proposal ===");
    const startTime = (await time.latest()) + 60; // Start in 1 minute
    const duration = 3600; // 1 hour duration
    const proposalTx = await voting.createProposal(
        "Strategic Investment Decision",
        [
            "Invest in R&D",
            "Expand Market Presence",
            "Acquire Competitor",
            "Return to Shareholders"
        ],
        startTime,
        duration
    );
    await proposalTx.wait();
    console.log("Created proposal for strategic investment decision");

    // Simulate voting process
    console.log("\n=== Simulating Voting Process ===");
    await time.increaseTo(startTime + 1);

    // Define voting preferences for each board member
    const votingPreferences = [
        { option: 0, score: 85 }, // Strong preference for R&D
        { option: 1, score: 90 }, // Strong preference for Market Expansion
        { option: 0, score: 70 }, // Moderate preference for R&D
        { option: 2, score: 95 }, // Strong preference for Acquisition
        { option: 1, score: 80 }  // Moderate preference for Market Expansion
    ];

    // Cast votes
    for (let i = 0; i < numBoardMembers; i++) {
        const pref = votingPreferences[i];
        await voting.connect(boardMembers[i]).castVote(0, pref.option, pref.score);
        console.log(`Board member ${i + 1} voted for option ${pref.option} with score ${pref.score}`);
    }

    // Get intermediate results
    console.log("\n=== Intermediate Results ===");
    for (let i = 0; i < 4; i++) {
        const option = await voting.getOptionDetails(0, i);
        console.log(`Option ${i}:`);
        console.log(`- Total Score: ${option.scoreSum}`);
        console.log(`- Weighted Votes: ${option.weightedVoteCount}`);
    }

    // Finalize the proposal
    console.log("\n=== Finalizing Proposal ===");
    await time.increaseTo(startTime + duration + 1);
    const finalizeTx = await voting.finalizeProposal(0);
    const receipt = await finalizeTx.wait();
    const event = receipt.events.find(e => e.event === 'ProposalFinalized');
    
    console.log(`Winning option: ${event.args.winningOption}`);

    // Get final proposal details
    const finalDetails = await voting.getProposalDetails(0);
    console.log("\n=== Final Proposal Details ===");
    console.log(`Total Votes Cast: ${finalDetails.totalVotes}`);
    console.log(`Proposal Finalized: ${finalDetails.finalized}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 