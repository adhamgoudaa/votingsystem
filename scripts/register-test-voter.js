const hre = require("hardhat");

async function main() {
  const contractAddress = "0x1b45f1c058d6936db65dadfe669c47d12ced8900";
  const voterAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const voterWeight = 2;

  console.log("Registering test voter...");
  console.log("Contract address:", contractAddress);
  console.log("Voter address:", voterAddress);
  console.log("Voter weight:", voterWeight);

  const BoardroomVoting = await hre.ethers.getContractFactory("BoardroomVoting");
  const contract = BoardroomVoting.attach(contractAddress);

  // Register the voter
  const tx = await contract.registerVoter(voterAddress, voterWeight);
  await tx.wait();

  console.log("Voter registered successfully!");
  console.log("Transaction hash:", tx.hash);

  // Verify the registration
  const voter = await contract.voters(voterAddress);
  console.log("Voter details:");
  console.log("- Weight:", voter.weight.toString());
  console.log("- Is Registered:", voter.isRegistered);

  // Check if they have board member role
  const boardMemberRole = await contract.BOARD_MEMBER_ROLE();
  const hasBoardMemberRole = await contract.hasRole(boardMemberRole, voterAddress);
  console.log("- Has Board Member Role:", hasBoardMemberRole);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 