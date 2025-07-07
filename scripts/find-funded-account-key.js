const hre = require("hardhat");

async function main() {
  console.log("Finding the correct private key for the funded account...");
  
  const fundedAccountAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  
  // Get all signers
  const signers = await hre.ethers.getSigners();
  
  console.log("\nChecking all Hardhat accounts:");
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    console.log(`Account ${i}: ${signer.address}`);
    
    if (signer.address.toLowerCase() === fundedAccountAddress.toLowerCase()) {
      console.log(`✅ Found funded account at index ${i}!`);
      
      // Get the private key for this account
      const privateKey = await hre.ethers.provider.send("hardhat_exportAccount", [signer.address]);
      console.log(`Private key: ${privateKey}`);
      
      // Test the private key
      const testSigner = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
      console.log(`Test signer address: ${testSigner.address}`);
      
      if (testSigner.address.toLowerCase() === fundedAccountAddress.toLowerCase()) {
        console.log("✅ Private key is correct!");
        return;
      }
    }
  }
  
  console.log("❌ Funded account not found in Hardhat accounts");
  console.log("This means the funded account was created differently");
  
  // Let's check if we can get the private key directly
  try {
    const privateKey = await hre.ethers.provider.send("hardhat_exportAccount", [fundedAccountAddress]);
    console.log(`\nDirect private key lookup: ${privateKey}`);
    
    const testSigner = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
    console.log(`Test signer address: ${testSigner.address}`);
    
    if (testSigner.address.toLowerCase() === fundedAccountAddress.toLowerCase()) {
      console.log("✅ Direct private key lookup successful!");
    }
  } catch (error) {
    console.error("❌ Cannot get private key directly:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 