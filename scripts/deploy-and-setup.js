const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying BoardroomVoting contract...");

  // Deploy the contract
  const BoardroomVoting = await hre.ethers.getContractFactory("BoardroomVoting");
  const voting = await BoardroomVoting.deploy();
  await voting.deployed();

  console.log("\nDeployment successful!");
  console.log("===================");
  console.log(`Contract Address: ${voting.address}`);
  console.log("===================");

  // Create or update .env.local with the contract address
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${voting.address}\nNEXT_PUBLIC_NETWORK_ID=1337`;
  
  fs.writeFileSync(envPath, envContent);
  console.log("\nUpdated .env.local file with contract address");

  // Get the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeployer address (default admin): ${deployer.address}`);

  // Optional: Set up some test board members
  const testAccounts = await hre.ethers.getSigners();
  const boardMembers = testAccounts.slice(1, 4); // Use accounts 1-3 as board members

  console.log("\nSetting up test board members...");
  for (let i = 0; i < boardMembers.length; i++) {
    const weight = i + 1; // Assign different weights (1, 2, 3)
    await voting.registerVoter(boardMembers[i].address, weight);
    console.log(`Registered board member ${i + 1}:`);
    console.log(`  Address: ${boardMembers[i].address}`);
    console.log(`  Weight: ${weight}`);
  }

  console.log("\nSetup complete! You can now start your Next.js application.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 