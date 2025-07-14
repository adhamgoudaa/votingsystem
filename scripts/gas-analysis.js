const hre = require("hardhat");

async function main() {
  console.log("🔍 Gas Cost Analysis for Voting System");
  console.log("=====================================");
  
  // Load environment variables
  require('dotenv').config();
  
  // Get the funded account signer
  const fundedAccountPrivateKey = process.env.PRIVATE_KEY;
  const fundedAccountSigner = new hre.ethers.Wallet(fundedAccountPrivateKey, hre.ethers.provider);
  const fundedAccountAddress = fundedAccountSigner.address;
  
  // Get test accounts - use hardcoded addresses for reliability
  const testUserAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat account 1
  const testUserPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const testUserSigner = new hre.ethers.Wallet(testUserPrivateKey, hre.ethers.provider);
  
  console.log("📋 Test Configuration:");
  console.log(`   Admin: ${fundedAccountAddress}`);
  console.log(`   Test User: ${testUserAddress}`);
  
  // Deploy a fresh contract for testing
  console.log("\n📦 Deploying fresh contract for testing...");
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const voting = await DepartmentVoting.connect(fundedAccountSigner).deploy();
  await voting.deployed();
  console.log(`   Contract: ${voting.address}`);
  
  // Track gas costs
  let totalGasCost = 0;
  let gasCosts = {};
  
  // Step 1: Admin creates a department
  console.log("\n🏢 Step 1: Creating department...");
  const createDeptTx = await voting.connect(fundedAccountSigner).createDepartment("Test Department", 5);
  const createDeptReceipt = await createDeptTx.wait();
  const createDeptGas = createDeptReceipt.gasUsed.toNumber();
  totalGasCost += createDeptGas;
  gasCosts.createDepartment = createDeptGas;
  console.log(`   ✅ Department created - Gas used: ${createDeptGas.toLocaleString()}`);
  
  // Step 2: Admin adds user to department
  console.log("\n👤 Step 2: Adding user to department...");
  const addUserTx = await voting.connect(fundedAccountSigner).addMemberToDepartment(0, testUserAddress);
  const addUserReceipt = await addUserTx.wait();
  const addUserGas = addUserReceipt.gasUsed.toNumber();
  totalGasCost += addUserGas;
  gasCosts.addMemberToDepartment = addUserGas;
  console.log(`   ✅ User added - Gas used: ${addUserGas.toLocaleString()}`);
  
  // Step 3: Admin registers user as voter
  console.log("\n📝 Step 3: Registering user as voter...");
  const registerVoterTx = await voting.connect(fundedAccountSigner).registerVoter(testUserAddress, 0);
  const registerVoterReceipt = await registerVoterTx.wait();
  const registerVoterGas = registerVoterReceipt.gasUsed.toNumber();
  totalGasCost += registerVoterGas;
  gasCosts.registerVoter = registerVoterGas;
  console.log(`   ✅ User registered - Gas used: ${registerVoterGas.toLocaleString()}`);
  
  // Step 4: Admin creates a proposal
  console.log("\n📋 Step 4: Creating proposal...");
  const proposalOptions = ["Option A", "Option B", "Option C"];
  const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
  const duration = 3600; // 1 hour
  const participatingDepartments = [0]; // Department 0
  
  const createProposalTx = await voting.connect(fundedAccountSigner).createProposal(
    "Test Proposal",
    proposalOptions,
    startTime,
    duration,
    participatingDepartments
  );
  const createProposalReceipt = await createProposalTx.wait();
  const createProposalGas = createProposalReceipt.gasUsed.toNumber();
  totalGasCost += createProposalGas;
  gasCosts.createProposal = createProposalGas;
  console.log(`   ✅ Proposal created - Gas used: ${createProposalGas.toLocaleString()}`);
  
  // Step 5: User votes on the proposal
  console.log("\n🗳️ Step 5: User voting on proposal...");
  const scores = [4, 3, 5]; // Score each option 1-5
  const voteTx = await voting.connect(testUserSigner).completeVoting(0, scores);
  const voteReceipt = await voteTx.wait();
  const voteGas = voteReceipt.gasUsed.toNumber();
  totalGasCost += voteGas;
  gasCosts.completeVoting = voteGas;
  console.log(`   ✅ User voted - Gas used: ${voteGas.toLocaleString()}`);
  
  // Calculate costs in ETH and USD (assuming 20 gwei gas price)
  const gasPrice = hre.ethers.utils.parseUnits("20", "gwei");
  const ethPrice = 2000; // Assume $2000 per ETH
  
  console.log("\n💰 Gas Cost Analysis");
  console.log("===================");
  console.log("Individual Operations:");
  Object.entries(gasCosts).forEach(([operation, gas]) => {
    const costInEth = hre.ethers.utils.formatEther(gasPrice.mul(gas));
    const costInUsd = parseFloat(costInEth) * ethPrice;
    console.log(`   ${operation}: ${gas.toLocaleString()} gas ($${costInUsd.toFixed(2)})`);
  });
  
  console.log("\n📊 Total for Single User Workflow:");
  const totalCostInEth = hre.ethers.utils.formatEther(gasPrice.mul(totalGasCost));
  const totalCostInUsd = parseFloat(totalCostInEth) * ethPrice;
  console.log(`   Total Gas: ${totalGasCost.toLocaleString()}`);
  console.log(`   Total Cost: $${totalCostInUsd.toFixed(2)}`);
  
  // Calculate for 50 users
  console.log("\n🏢 Scaling Analysis for 50 Users");
  console.log("===============================");
  
  // Admin operations (one-time)
  const adminOperations = gasCosts.createDepartment + gasCosts.createProposal;
  const adminCostInEth = hre.ethers.utils.formatEther(gasPrice.mul(adminOperations));
  const adminCostInUsd = parseFloat(adminCostInEth) * ethPrice;
  
  // Per-user operations (repeated for each user)
  const perUserOperations = gasCosts.addMemberToDepartment + gasCosts.registerVoter + gasCosts.completeVoting;
  const perUserCostInEth = hre.ethers.utils.formatEther(gasPrice.mul(perUserOperations));
  const perUserCostInUsd = parseFloat(perUserCostInEth) * ethPrice;
  
  // Total for 50 users
  const total50Users = adminOperations + (perUserOperations * 50);
  const total50UsersCostInEth = hre.ethers.utils.formatEther(gasPrice.mul(total50Users));
  const total50UsersCostInUsd = parseFloat(total50UsersCostInEth) * ethPrice;
  
  console.log("Admin Operations (one-time):");
  console.log(`   Create Department + Create Proposal: $${adminCostInUsd.toFixed(2)}`);
  
  console.log("\nPer-User Operations:");
  console.log(`   Add Member + Register Voter + Vote: $${perUserCostInUsd.toFixed(2)}`);
  
  console.log("\nTotal for 50 Users:");
  console.log(`   Total Gas: ${total50Users.toLocaleString()}`);
  console.log(`   Total Cost: $${total50UsersCostInUsd.toFixed(2)}`);
  console.log(`   Cost per User: $${(total50UsersCostInUsd / 50).toFixed(2)}`);
  
  // Gas optimization suggestions
  console.log("\n💡 Gas Optimization Suggestions:");
  console.log("===============================");
  console.log("1. Batch operations - Add multiple users in one transaction");
  console.log("2. Use events instead of storage for non-critical data");
  console.log("3. Optimize data structures to reduce storage costs");
  console.log("4. Consider Layer 2 solutions for high-volume voting");
  console.log("5. Implement gas-efficient voting mechanisms");
  
  // Batch operation analysis
  console.log("\n🔄 Batch Operation Analysis:");
  console.log("============================");
  
  // Estimate batch adding users (simplified)
  const batchAddUsersGas = gasCosts.addMemberToDepartment * 50 * 0.7; // 30% savings
  const batchAddUsersCostInEth = hre.ethers.utils.formatEther(gasPrice.mul(batchAddUsersGas));
  const batchAddUsersCostInUsd = parseFloat(batchAddUsersCostInEth) * ethPrice;
  
  const batchTotal = adminOperations + batchAddUsersGas + (gasCosts.registerVoter * 50) + (gasCosts.completeVoting * 50);
  const batchTotalCostInEth = hre.ethers.utils.formatEther(gasPrice.mul(batchTotal));
  const batchTotalCostInUsd = parseFloat(batchTotalCostInEth) * ethPrice;
  
  console.log(`   Batch Add Users (50 users): $${batchAddUsersCostInUsd.toFixed(2)}`);
  console.log(`   Total with Batching: $${batchTotalCostInUsd.toFixed(2)}`);
  console.log(`   Savings: $${(total50UsersCostInUsd - batchTotalCostInUsd).toFixed(2)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Gas analysis failed:", error);
    process.exit(1);
  }); 