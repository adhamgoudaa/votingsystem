const hre = require("hardhat");

async function main() {
  console.log("Deploying BoardroomVoting contract...");

  const BoardroomVoting = await hre.ethers.getContractFactory("BoardroomVoting");
  const voting = await BoardroomVoting.deploy();

  await voting.deployed();

  console.log("BoardroomVoting deployed to:", voting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 