const hre = require("hardhat");

async function main() {
  // Use the first Hardhat account which comes pre-funded
  const HARDHAT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const signer = new hre.ethers.Wallet(HARDHAT_PRIVATE_KEY, hre.ethers.provider);
  
  // Your address
  const receiverAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  
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