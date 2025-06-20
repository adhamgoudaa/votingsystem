const hre = require("hardhat");

async function main() {
  // Use the first Hardhat account which comes pre-funded
  const HARDHAT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const signer = new hre.ethers.Wallet(HARDHAT_PRIVATE_KEY, hre.ethers.provider);
  
  // Your address
  const receiverAddress = "0x5A5D9Fe05Fb0b9E198CC48D505675F85D340BA6b";
  
  // Send 1000 ETH
  const tx = await signer.sendTransaction({
    to: receiverAddress,
    value: hre.ethers.utils.parseEther("1000")
  });

  await tx.wait();
  console.log(`Transferred 1000 ETH to ${receiverAddress}`);
  console.log(`Transaction hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 