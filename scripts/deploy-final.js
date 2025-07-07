const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying DepartmentVoting contract with correct admin...");

  // The funded account address and private key
  const fundedAccountAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  const fundedAccountPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  
  // Create a signer for the funded account
  const fundedAccountSigner = new hre.ethers.Wallet(fundedAccountPrivateKey, hre.ethers.provider);
  
  console.log("Deploying with admin address:", fundedAccountAddress);
  console.log("Deployer signer address:", fundedAccountSigner.address);

  // Deploy the contract using the funded account signer
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const voting = await DepartmentVoting.connect(fundedAccountSigner).deploy();
  await voting.deployed();

  console.log("\nDeployment successful!");
  console.log("===================");
  console.log(`Contract Address: ${voting.address}`);
  console.log(`Admin Address: ${fundedAccountAddress}`);
  console.log("===================");

  // Create or update .env.local with the contract address
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${voting.address}\nNEXT_PUBLIC_NETWORK_ID=1337`;
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log("\n✅ Updated .env.local file with contract address");
    console.log(`📁 File location: ${envPath}`);
  } catch (error) {
    console.error("\n❌ Error updating .env.local file:", error.message);
    console.log("Please manually update .env.local with the contract address:", voting.address);
  }

  // Verify the admin roles
  console.log("\nVerifying admin roles...");
  try {
    const adminRole = await voting.ADMIN_ROLE();
    const defaultAdminRole = await voting.DEFAULT_ADMIN_ROLE();
    
    const hasAdminRole = await voting.hasRole(adminRole, fundedAccountAddress);
    const hasDefaultAdminRole = await voting.hasRole(defaultAdminRole, fundedAccountAddress);
    
    console.log(`Funded account has ADMIN_ROLE: ${hasAdminRole}`);
    console.log(`Funded account has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);
    
    if (hasAdminRole && hasDefaultAdminRole) {
      console.log("✅ Admin roles correctly assigned!");
    } else {
      console.log("❌ Admin roles not correctly assigned!");
    }
  } catch (error) {
    console.error("❌ Error verifying admin roles:", error.message);
  }

  // Create some sample departments
  console.log("\nCreating sample departments...");
  
  const departments = [
    { name: "Engineering", weight: 5 },
    { name: "Marketing", weight: 3 },
    { name: "Sales", weight: 4 },
    { name: "Finance", weight: 6 },
    { name: "HR", weight: 2 }
  ];

  for (let i = 0; i < departments.length; i++) {
    const dept = departments[i];
    await voting.connect(fundedAccountSigner).createDepartment(dept.name, dept.weight);
    console.log(`Created department: ${dept.name} (Weight: ${dept.weight})`);
  }

  // Get some test accounts and add them to departments
  const testAccounts = await hre.ethers.getSigners();
  const boardMembers = testAccounts.slice(1, 6); // Use accounts 1-5 as board members

  console.log("\nSetting up test board members in departments...");
  for (let i = 0; i < boardMembers.length; i++) {
    const departmentId = i; // Assign to different departments
    const member = boardMembers[i];
    
    // Add member to department
    await voting.connect(fundedAccountSigner).addMemberToDepartment(departmentId, member.address);
    console.log(`Added ${member.address} to department ${departments[departmentId].name}`);
    
    // Register as voter
    await voting.connect(fundedAccountSigner).registerVoter(member.address, departmentId);
    console.log(`Registered ${member.address} as voter in ${departments[departmentId].name}`);
  }

  console.log("\n🎉 Setup complete! You can now start your Next.js application.");
  console.log("\nSample departments created:");
  departments.forEach((dept, index) => {
    console.log(`  ${index}: ${dept.name} (Weight: ${dept.weight})`);
  });
  
  console.log(`\n📋 Contract Address for frontend: ${voting.address}`);
  console.log(`👑 Admin Address: ${fundedAccountAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 