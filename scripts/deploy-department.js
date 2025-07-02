const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying DepartmentVoting contract...");

  // Deploy the contract
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const voting = await DepartmentVoting.deploy();
  await voting.deployed();

  console.log("\nDeployment successful!");
  console.log("===================");
  console.log(`Contract Address: ${voting.address}`);
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

  // Get the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeployer address (default admin): ${deployer.address}`);

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
    await voting.createDepartment(dept.name, dept.weight);
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
    await voting.addMemberToDepartment(departmentId, member.address);
    console.log(`Added ${member.address} to department ${departments[departmentId].name}`);
    
    // Register as voter
    await voting.registerVoter(member.address, departmentId);
    console.log(`Registered ${member.address} as voter in ${departments[departmentId].name}`);
  }

  console.log("\n🎉 Setup complete! You can now start your Next.js application.");
  console.log("\nSample departments created:");
  departments.forEach((dept, index) => {
    console.log(`  ${index}: ${dept.name} (Weight: ${dept.weight})`);
  });
  
  console.log(`\n📋 Contract Address for frontend: ${voting.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 