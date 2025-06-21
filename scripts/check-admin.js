const hre = require("hardhat");

async function main() {
  const contractAddress = "0x1B45F1c058D6936Db65dAdFE669c47D12CeD8900";
  const deployerAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  
  console.log("Checking admin role for deployer account...");
  console.log("Contract address:", contractAddress);
  console.log("Deployer address:", deployerAddress);
  
  const BoardroomVoting = await hre.ethers.getContractFactory("BoardroomVoting");
  const contract = BoardroomVoting.attach(contractAddress);
  
  // Check if deployer has admin role
  const adminRole = await contract.ADMIN_ROLE();
  console.log("Admin role hash:", adminRole);
  
  const hasAdminRole = await contract.hasRole(adminRole, deployerAddress);
  console.log("Deployer has admin role:", hasAdminRole);
  
  // Check if deployer has default admin role
  const hasDefaultAdminRole = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), deployerAddress);
  console.log("Deployer has default admin role:", hasDefaultAdminRole);
  
  // Check if deployer has board member role
  const boardMemberRole = await contract.BOARD_MEMBER_ROLE();
  const hasBoardMemberRole = await contract.hasRole(boardMemberRole, deployerAddress);
  console.log("Deployer has board member role:", hasBoardMemberRole);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 