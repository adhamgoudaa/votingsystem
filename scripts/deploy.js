const hre = require("hardhat");

async function main() {
  console.log("Deploying BoardroomVoting contract...");

  // Use the first pre-funded account from Hardhat node
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const BoardroomVoting = await hre.ethers.getContractFactory("BoardroomVoting");
  const voting = await BoardroomVoting.deploy();

  await voting.deployed();

  console.log("BoardroomVoting deployed to:", voting.address);
  
  // Save the contract address for the frontend
  console.log("Contract address for frontend:", voting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 