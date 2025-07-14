const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Company Dinner Voting Scenario", function () {
    let DepartmentVoting;
    let voting;
    let admin;
    let engineeringMembers = [];
    let marketingMembers = [];
    let salesMembers = [];
    let financeMembers = [];
    let allMembers = [];

    // Company departments with their voting weights
    const departments = [
        { name: "Engineering", weight: 5, size: 3 },
        { name: "Marketing", weight: 3, size: 2 },
        { name: "Sales", weight: 4, size: 2 },
        { name: "Finance", weight: 6, size: 1 }
    ];

    // Dinner options for voting
    const dinnerOptions = [
        "Italian Restaurant - Pasta & Pizza",
        "Japanese Sushi Bar",
        "Mexican Fiesta - Tacos & Margaritas",
        "American BBQ & Burgers",
        "Indian Curry House"
    ];

    // Custom voting agents with personalities
    const votingAgents = [
        // Engineering Team - Technical and practical
        { name: "Alice (Engineering Lead)", personality: "technical", preferences: [4, 3, 2, 5, 1] },
        { name: "Bob (Senior Developer)", personality: "practical", preferences: [3, 4, 2, 5, 1] },
        { name: "Charlie (DevOps Engineer)", personality: "efficient", preferences: [2, 3, 4, 5, 1] },
        
        // Marketing Team - Creative and social
        { name: "Diana (Marketing Manager)", personality: "creative", preferences: [1, 5, 4, 2, 3] },
        { name: "Eve (Content Creator)", personality: "trendy", preferences: [2, 5, 3, 1, 4] },
        
        // Sales Team - Client-focused and outgoing
        { name: "Frank (Sales Director)", personality: "outgoing", preferences: [3, 2, 5, 4, 1] },
        { name: "Grace (Account Manager)", personality: "client-focused", preferences: [2, 3, 5, 4, 1] },
        
        // Finance Team - Conservative and traditional
        { name: "Henry (CFO)", personality: "conservative", preferences: [5, 1, 2, 4, 3] }
    ];

    beforeEach(async function () {
        // Get signers
        [admin, ...allMembers] = await ethers.getSigners();
        
        // Deploy contract
        DepartmentVoting = await ethers.getContractFactory("DepartmentVoting");
        voting = await DepartmentVoting.deploy();
        await voting.deployed();

        console.log("🏢 Setting up company departments and members...");
        
        // Create departments
        for (let i = 0; i < departments.length; i++) {
            const dept = departments[i];
            await voting.createDepartment(dept.name, dept.weight);
            console.log(`Created department: ${dept.name} (Weight: ${dept.weight})`);
        }

        // Assign members to departments
        let memberIndex = 0;
        for (let i = 0; i < departments.length; i++) {
            const dept = departments[i];
            const deptMembers = [];
            
            for (let j = 0; j < dept.size; j++) {
                const member = allMembers[memberIndex];
                await voting.addMemberToDepartment(i, member.address);
                await voting.registerVoter(member.address, i);
                deptMembers.push(member);
                memberIndex++;
                
                console.log(`Added ${votingAgents[memberIndex - 1].name} to ${dept.name}`);
            }
            
            // Store department members
            switch (i) {
                case 0: engineeringMembers = deptMembers; break;
                case 1: marketingMembers = deptMembers; break;
                case 2: salesMembers = deptMembers; break;
                case 3: financeMembers = deptMembers; break;
            }
        }
    });

    describe("Company Dinner Voting Scenario", function () {
        it("Should successfully run the complete dinner voting scenario", async function () {
            console.log("\nStarting Company Dinner Voting Scenario...");
            
            // Step 1: Create the dinner proposal
            console.log("\nStep 1: Creating dinner proposal...");
            const startTime = (await time.latest()) + 60; // Start in 1 minute
            const duration = 3600; // 1 hour voting period
            const participatingDepartments = [0, 1, 2, 3]; // All departments participate
            
            const createProposalTx = await voting.createProposal(
                "Company Dinner - Where should we go for our team dinner?",
                dinnerOptions,
                startTime,
                duration,
                participatingDepartments
            );
            
            // Get the proposal ID from the transaction receipt
            const createReceipt = await createProposalTx.wait();
            const createEvent = createReceipt.events.find(e => e.event === 'ProposalCreated');
            const proposalId = createEvent.args.proposalId;
            
            console.log(`Created proposal #${proposalId.toString()} with ${dinnerOptions.length} options`);
            console.log("Voting starts in 1 minute, lasts 1 hour");
            
            // Step 2: Wait for voting to start
            console.log("\nStep 2: Waiting for voting to start...");
            await time.increaseTo(startTime + 1);
            console.log("Voting period has started!");
            
            // Step 3: Simulate voting with custom agents
            console.log("\nStep 3: Simulating department voting...");
            
            // Engineering Team votes (Weight: 5)
            console.log("\nEngineering Team voting (Weight: 5):");
            for (let i = 0; i < engineeringMembers.length; i++) {
                const member = engineeringMembers[i];
                const agent = votingAgents[i];
                const scores = agent.preferences;
                
                await voting.connect(member).completeVoting(proposalId, scores);
                console.log(`      ${agent.name}: ${scores.map((score, idx) => `${dinnerOptions[idx].split(' - ')[0]}(${score})`).join(', ')}`);
            }
            
            // Marketing Team votes (Weight: 3)
            console.log("\nMarketing Team voting (Weight: 3):");
            for (let i = 0; i < marketingMembers.length; i++) {
                const member = marketingMembers[i];
                const agent = votingAgents[i + 3];
                const scores = agent.preferences;
                
                await voting.connect(member).completeVoting(proposalId, scores);
                console.log(`      ${agent.name}: ${scores.map((score, idx) => `${dinnerOptions[idx].split(' - ')[0]}(${score})`).join(', ')}`);
            }
            
            // Sales Team votes (Weight: 4)
            console.log("\nSales Team voting (Weight: 4):");
            for (let i = 0; i < salesMembers.length; i++) {
                const member = salesMembers[i];
                const agent = votingAgents[i + 5];
                const scores = agent.preferences;
                
                await voting.connect(member).completeVoting(proposalId, scores);
                console.log(`${agent.name}: ${scores.map((score, idx) => `${dinnerOptions[idx].split(' - ')[0]}(${score})`).join(', ')}`);
            }
            
            // Finance Team votes (Weight: 6)
            console.log("\nFinance Team voting (Weight: 6):");
            for (let i = 0; i < financeMembers.length; i++) {
                const member = financeMembers[i];
                const agent = votingAgents[i + 7];
                const scores = agent.preferences;
                
                await voting.connect(member).completeVoting(proposalId, scores);
                console.log(`${agent.name}: ${scores.map((score, idx) => `${dinnerOptions[idx].split(' - ')[0]}(${score})`).join(', ')}`);
            }
            
            // Step 4: Wait for voting to end
            console.log("\nStep 4: Waiting for voting to end...");
            await time.increaseTo(startTime + duration + 1);
            console.log("Voting period has ended!");
            
            // Step 5: Finalize the proposal
            console.log("\nStep 5: Finalizing the proposal...");
            const finalizeTx = await voting.finalizeProposal(proposalId);
            const finalizeReceipt = await finalizeTx.wait();
            const finalizeEvent = finalizeReceipt.events.find(e => e.event === 'ProposalFinalized');
            const winningOption = finalizeEvent.args.winningOption;
            
            console.log(`   🎉 WINNER: ${dinnerOptions[winningOption]}`);
            
            // Step 6: Display detailed results
            console.log("\nStep 6: Detailed voting results:");
            
            for (let i = 0; i < dinnerOptions.length; i++) {
                const option = await voting.getOptionDetails(proposalId, i);
                const avgScore = option.weightedVoteCount.gt(0) ? option.totalScore.mul(100).div(option.weightedVoteCount).toNumber() / 100 : 0;
                console.log(`   ${dinnerOptions[i]}:`);
                console.log(`      Total Score: ${option.totalScore.toString()}`);
                console.log(`      Weighted Vote Count: ${option.weightedVoteCount.toString()}`);
                console.log(`      Average Score: ${avgScore.toFixed(2)}`);
                console.log(`      ${i === winningOption.toNumber() ? '🏆 WINNER!' : ''}`);
            }
            
            // Step 7: Verify the results
            console.log("\n✅ Step 7: Verifying results...");
            
            // Check that all members voted by checking proposal details
            const proposalDetails = await voting.getProposalDetails(proposalId);
            const expectedVotes = engineeringMembers.length + marketingMembers.length + salesMembers.length + financeMembers.length;
            expect(proposalDetails.totalVotes).to.equal(expectedVotes);
            console.log(`   ✅ Total votes cast: ${proposalDetails.totalVotes.toString()}/${expectedVotes}`);
            
            // Check that proposal is finalized
            expect(proposalDetails.finalized).to.be.true;
            console.log(`   ✅ Proposal finalized: ${proposalDetails.finalized}`);
            
            // Check that winning option is valid
            expect(winningOption).to.be.at.least(0);
            expect(winningOption).to.be.lessThan(dinnerOptions.length);
            console.log(`   ✅ Winning option is valid: ${winningOption.toString()}`);
            
            console.log("\n🎉 SCENARIO COMPLETED SUCCESSFULLY!");
            console.log("=====================================");
            console.log(`🏢 Company: 4 departments with weighted voting`);
            console.log(`👥 Participants: ${expectedVotes} team members`);
            console.log(`🍽️  Options: ${dinnerOptions.length} dinner choices`);
            console.log(`🏆 Winner: ${dinnerOptions[winningOption.toNumber()]}`);
            console.log("=====================================");
        });

        it("Should handle department weight differences correctly", async function () {
            console.log("\n⚖️  Testing department weight differences...");
            
            // Create a simple proposal
            const startTime = (await time.latest()) + 60;
            const createProposalTx = await voting.createProposal(
                "Quick Test",
                ["Option A", "Option B"],
                startTime,
                3600,
                [0, 1, 2, 3]
            );
            
            const createReceipt = await createProposalTx.wait();
            const createEvent = createReceipt.events.find(e => e.event === 'ProposalCreated');
            const proposalId = createEvent.args.proposalId;
            
            await time.increaseTo(startTime + 1);
            
            // Engineering (weight 5) votes for Option A
            await voting.connect(engineeringMembers[0]).completeVoting(proposalId, [5, 1]);
            
            // Marketing (weight 3) votes for Option B
            await voting.connect(marketingMembers[0]).completeVoting(proposalId, [1, 5]);
            
            await time.increaseTo(startTime + 3601);
            
            // Finalize and check results
            const finalizeTx = await voting.finalizeProposal(proposalId);
            const finalizeReceipt = await finalizeTx.wait();
            const finalizeEvent = finalizeReceipt.events.find(e => e.event === 'ProposalFinalized');
            const winningOption = finalizeEvent.args.winningOption;
            
            // Engineering's weighted score: 5 * 5 = 25
            // Marketing's weighted score: 3 * 5 = 15
            // Engineering should win
            expect(winningOption).to.equal(0);
            console.log("   ✅ Department weights correctly applied");
        });

        it("Should prevent double voting", async function () {
            console.log("\n🚫 Testing double voting prevention...");
            
            const startTime = (await time.latest()) + 60;
            const createProposalTx = await voting.createProposal(
                "Double Vote Test",
                ["Option A", "Option B"],
                startTime,
                3600,
                [0]
            );
            
            const createReceipt = await createProposalTx.wait();
            const createEvent = createReceipt.events.find(e => e.event === 'ProposalCreated');
            const proposalId = createEvent.args.proposalId;
            
            await time.increaseTo(startTime + 1);
            
            // First vote should succeed
            await voting.connect(engineeringMembers[0]).completeVoting(proposalId, [3, 4]);
            
            // Second vote should fail
            await expect(
                voting.connect(engineeringMembers[0]).completeVoting(proposalId, [4, 3])
            ).to.be.revertedWith("Already completed voting");
            
            console.log("   ✅ Double voting correctly prevented");
        });
    });
}); 