const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting complete deployment process...");
  
  // Load environment variables
  require('dotenv').config();
  
  // The funded account details from .env
  const fundedAccountPrivateKey = process.env.PRIVATE_KEY;
  if (!fundedAccountPrivateKey) {
    throw new Error("PRIVATE_KEY not found in .env file");
  }
  
  // Create funded account signer
  const fundedAccountSigner = new hre.ethers.Wallet(fundedAccountPrivateKey, hre.ethers.provider);
  const fundedAccountAddress = fundedAccountSigner.address;
  
  console.log("📋 Configuration:");
  console.log(`   Funded Account: ${fundedAccountAddress}`);
  console.log(`   Private Key: ${fundedAccountPrivateKey.substring(0, 10)}...`);
  
  // Get the default Hardhat account (account 0) for funding
  const [defaultAccount] = await hre.ethers.getSigners();
  console.log(`   Default Account: ${defaultAccount.address}`);
  
  // Step 1: Fund the account if needed
  console.log("\n💰 Step 1: Funding account...");
  const fundedBalance = await fundedAccountSigner.getBalance();
  console.log(`   Current balance: ${hre.ethers.utils.formatEther(fundedBalance)} ETH`);
  
  if (fundedBalance.lt(hre.ethers.utils.parseEther("1"))) {
    console.log("   Account needs funding...");
    const fundTx = await defaultAccount.sendTransaction({
      to: fundedAccountAddress,
      value: hre.ethers.utils.parseEther("1000")
    });
    await fundTx.wait();
    console.log("   ✅ Account funded with 1000 ETH");
  } else {
    console.log("   ✅ Account already has sufficient funds");
  }
  
  // Step 2: Deploy the contract with the funded account as admin
  console.log("\n📦 Step 2: Deploying contract...");
  console.log(`   Deploying with admin: ${fundedAccountAddress}`);
  
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const voting = await DepartmentVoting.connect(fundedAccountSigner).deploy();
  await voting.deployed();
  
  console.log("   ✅ Contract deployed successfully!");
  console.log(`   Contract Address: ${voting.address}`);
  
  // Step 3: Verify admin roles
  console.log("\n🔐 Step 3: Verifying admin roles...");
  const adminRole = await voting.ADMIN_ROLE();
  const defaultAdminRole = await voting.DEFAULT_ADMIN_ROLE();
  
  const hasAdminRole = await voting.hasRole(adminRole, fundedAccountAddress);
  const hasDefaultAdminRole = await voting.hasRole(defaultAdminRole, fundedAccountAddress);
  
  console.log(`   ADMIN_ROLE: ${hasAdminRole}`);
  console.log(`   DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);
  
  if (hasAdminRole && hasDefaultAdminRole) {
    console.log("   ✅ Admin roles correctly assigned!");
  } else {
    console.log("   ❌ Admin roles not correctly assigned!");
    throw new Error("Admin roles assignment failed");
  }
  
  // Step 4: Create sample departments
  console.log("\n🏢 Step 4: Creating sample departments...");
  const departments = [
    { name: "Engineering", weight: 5 },
    { name: "Marketing", weight: 3 },
    { name: "Sales", weight: 4 },
    { name: "Finance", weight: 6 },
    { name: "HR", weight: 2 }
  ];
  
  for (let i = 0; i < departments.length; i++) {
    const dept = departments[i];
    const tx = await voting.connect(fundedAccountSigner).createDepartment(dept.name, dept.weight);
    await tx.wait();
    console.log(`   ✅ Created department: ${dept.name} (Weight: ${dept.weight})`);
  }
  
  // Step 5: Set up test board members
  console.log("\n👥 Step 5: Setting up test board members...");
  const testAccounts = await hre.ethers.getSigners();
  const boardMembers = testAccounts.slice(1, 6); // Use accounts 1-5 as board members
  
  for (let i = 0; i < boardMembers.length; i++) {
    const departmentId = i; // Assign to different departments
    const member = boardMembers[i];
    
    // Add member to department
    const addTx = await voting.connect(fundedAccountSigner).addMemberToDepartment(departmentId, member.address);
    await addTx.wait();
    console.log(`   ✅ Added ${member.address.substring(0, 10)}... to ${departments[departmentId].name}`);
    
    // Register as voter
    const registerTx = await voting.connect(fundedAccountSigner).registerVoter(member.address, departmentId);
    await registerTx.wait();
    console.log(`   ✅ Registered ${member.address.substring(0, 10)}... as voter in ${departments[departmentId].name}`);
  }
  
  // Step 6: Update environment files
  console.log("\n📝 Step 6: Updating environment files...");
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${voting.address}\nNEXT_PUBLIC_NETWORK_ID=1337`;
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log("   ✅ Updated .env.local file");
    console.log(`   📁 File location: ${envPath}`);
  } catch (error) {
    console.error("   ❌ Error updating .env.local file:", error.message);
  }
  
  // Step 7: Final verification
  console.log("\n🔍 Step 7: Final verification...");
  try {
    const departmentCount = await voting.getDepartmentCount();
    console.log(`   ✅ Department count: ${departmentCount.toString()}`);
    
    // Test admin functionality
    const testDeptName = "Test Department";
    const testTx = await voting.connect(fundedAccountSigner).createDepartment(testDeptName, 1);
    await testTx.wait();
    console.log("   ✅ Admin can create departments");
    
    // Clean up test department
    const newDeptCount = await voting.getDepartmentCount();
    const testDeptId = newDeptCount.sub(1);
    const deactivateTx = await voting.connect(fundedAccountSigner).deactivateDepartment(testDeptId);
    await deactivateTx.wait();
    console.log("   ✅ Admin can deactivate departments");
    
  } catch (error) {
    console.error("   ❌ Error in final verification:", error.message);
  }
  
  // Summary
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("===================");
  console.log(`📋 Contract Address: ${voting.address}`);
  console.log(`👑 Admin Address: ${fundedAccountAddress}`);
  console.log(`🔑 Admin Private Key: ${fundedAccountPrivateKey}`);
  console.log("===================");
  
  console.log("\n📊 Sample departments created:");
  departments.forEach((dept, index) => {
    console.log(`   ${index}: ${dept.name} (Weight: ${dept.weight})`);
  });
  
  console.log("\n🚀 Next steps:");
  console.log("   1. Start your Next.js application: npm run dev");
  console.log("   2. Connect your wallet to the local network");
  console.log("   3. Use the admin account for administrative functions");
  console.log("   4. Use test accounts for voting");
  
  console.log("\n💡 Test accounts (for voting):");
  boardMembers.forEach((member, index) => {
    console.log(`   Account ${index + 1}: ${member.address}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }); 