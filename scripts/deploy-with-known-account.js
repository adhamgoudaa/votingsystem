const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying DepartmentVoting contract with known Hardhat account as admin...");

  // Use account 1 as the admin (we know its private key)
  const [deployer, adminAccount] = await hre.ethers.getSigners();
  const adminAddress = adminAccount.address;
  
  console.log("Deploying with admin address:", adminAddress);
  console.log("Deployer address:", deployer.address);

  // Deploy the contract using the admin account
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const voting = await DepartmentVoting.connect(adminAccount).deploy();
  await voting.deployed();

  console.log("\nDeployment successful!");
  console.log("===================");
  console.log(`Contract Address: ${voting.address}`);
  console.log(`Admin Address: ${adminAddress}`);
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
    
    const hasAdminRole = await voting.hasRole(adminRole, adminAddress);
    const hasDefaultAdminRole = await voting.hasRole(defaultAdminRole, adminAddress);
    
    console.log(`Admin account has ADMIN_ROLE: ${hasAdminRole}`);
    console.log(`Admin account has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);
    
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
    await voting.connect(adminAccount).createDepartment(dept.name, dept.weight);
    console.log(`Created department: ${dept.name} (Weight: ${dept.weight})`);
  }

  // Get some test accounts and add them to departments
  const testAccounts = await hre.ethers.getSigners();
  const boardMembers = testAccounts.slice(2, 7); // Use accounts 2-6 as board members (skip admin account)

  console.log("\nSetting up test board members in departments...");
  for (let i = 0; i < boardMembers.length; i++) {
    const departmentId = i; // Assign to different departments
    const member = boardMembers[i];
    
    // Add member to department
    await voting.connect(adminAccount).addMemberToDepartment(departmentId, member.address);
    console.log(`Added ${member.address} to department ${departments[departmentId].name}`);
    
    // Register as voter
    await voting.connect(adminAccount).registerVoter(member.address, departmentId);
    console.log(`Registered ${member.address} as voter in ${departments[departmentId].name}`);
  }

  console.log("\n🎉 Setup complete! You can now start your Next.js application.");
  console.log("\nSample departments created:");
  departments.forEach((dept, index) => {
    console.log(`  ${index}: ${dept.name} (Weight: ${dept.weight})`);
  });
  
  console.log(`\n📋 Contract Address for frontend: ${voting.address}`);
  console.log(`👑 Admin Address: ${adminAddress}`);
  console.log(`🔑 Admin Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 