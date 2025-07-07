const hre = require("hardhat");

async function main() {
  console.log("Checking funded account status...");
  
  const fundedAccountAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  
  // Check if the account has any ETH
  const balance = await hre.ethers.provider.getBalance(fundedAccountAddress);
  console.log(`Funded account balance: ${hre.ethers.utils.formatEther(balance)} ETH`);
  
  // Check if there's any code at this address (contract deployment)
  const code = await hre.ethers.provider.getCode(fundedAccountAddress);
  if (code === "0x") {
    console.log("✅ This is an EOA (Externally Owned Account) - no contract deployed here");
  } else {
    console.log("❌ This address has contract code - it's not a regular account");
  }
  
  // Let's use account 0 as the admin instead since we know its private key
  const [account0] = await hre.ethers.getSigners();
  console.log(`\nAccount 0 address: ${account0.address}`);
  console.log(`Account 0 balance: ${hre.ethers.utils.formatEther(await account0.getBalance())} ETH`);
  
  // Check if account 0 is the same as the funded account
  if (account0.address.toLowerCase() === fundedAccountAddress.toLowerCase()) {
    console.log("✅ Account 0 is the funded account!");
  } else {
    console.log("❌ Account 0 is NOT the funded account");
    console.log("We need to use account 0 as admin since we know its private key");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 