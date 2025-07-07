const hre = require("hardhat");

async function main() {
  console.log("Checking account balances...");
  
  // Get all signers
  const signers = await hre.ethers.getSigners();
  
  console.log("\nAccount balances:");
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const balance = await signer.getBalance();
    console.log(`Account ${i}: ${signer.address} - ${hre.ethers.utils.formatEther(balance)} ETH`);
  }
  
  // Check the funded account specifically
  const fundedAccountAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  const fundedAccountPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const fundedAccountSigner = new hre.ethers.Wallet(fundedAccountPrivateKey, hre.ethers.provider);
  
  const fundedBalance = await fundedAccountSigner.getBalance();
  console.log(`\nFunded account (${fundedAccountAddress}): ${hre.ethers.utils.formatEther(fundedBalance)} ETH`);
  
  // Check if the deployer (account 0) has enough funds
  const deployer = signers[0];
  const deployerBalance = await deployer.getBalance();
  
  console.log(`\nDeployer (${deployer.address}): ${hre.ethers.utils.formatEther(deployerBalance)} ETH`);
  
  if (deployerBalance.isZero()) {
    console.log("❌ Deployer has no funds! This is likely the problem.");
    console.log("Let's fund the deployer from the funded account...");
    
    // Fund the deployer with 100 ETH
    const tx = await fundedAccountSigner.sendTransaction({
      to: deployer.address,
      value: hre.ethers.utils.parseEther("100")
    });
    
    await tx.wait();
    console.log("✅ Funded deployer with 100 ETH");
    
    // Check new balance
    const newBalance = await deployer.getBalance();
    console.log(`New deployer balance: ${hre.ethers.utils.formatEther(newBalance)} ETH`);
  } else {
    console.log("✅ Deployer has funds");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 