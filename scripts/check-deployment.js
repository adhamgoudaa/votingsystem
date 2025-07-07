const hre = require("hardhat");

async function main() {
  console.log("Checking contract deployment...");
  
  // Get the current block number to see if we're on the right network
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
  
  // Get the latest block to see recent transactions
  const latestBlock = await hre.ethers.provider.getBlock(blockNumber);
  console.log("Latest block timestamp:", new Date(latestBlock.timestamp * 1000));
  
  // Check if there are any transactions in the latest block
  if (latestBlock.transactions.length > 0) {
    console.log("Recent transactions found:", latestBlock.transactions.length);
    
    // Get the last few transactions
    for (let i = Math.max(0, latestBlock.transactions.length - 5); i < latestBlock.transactions.length; i++) {
      const txHash = latestBlock.transactions[i];
      const tx = await hre.ethers.provider.getTransaction(txHash);
      console.log(`Transaction ${i}: ${txHash}`);
      console.log(`  From: ${tx.from}`);
      console.log(`  To: ${tx.to || 'Contract Creation'}`);
      console.log(`  Value: ${hre.ethers.utils.formatEther(tx.value)} ETH`);
    }
  }
  
  // Try to get the contract code at the expected address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const code = await hre.ethers.provider.getCode(contractAddress);
  
  if (code === "0x") {
    console.log("❌ No contract found at address:", contractAddress);
  } else {
    console.log("✅ Contract found at address:", contractAddress);
    console.log("Contract code length:", code.length);
  }
  
  // Let's try to deploy a fresh contract
  console.log("\nDeploying a fresh contract...");
  
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const voting = await DepartmentVoting.deploy();
  await voting.deployed();
  
  console.log("✅ New contract deployed at:", voting.address);
  
  // Test the new contract
  try {
    const departmentCount = await voting.getDepartmentCount();
    console.log("✅ Contract is working! Department count:", departmentCount.toString());
    
    const adminRole = await voting.ADMIN_ROLE();
    console.log("✅ ADMIN_ROLE function works:", adminRole);
    
    const defaultAdminRole = await voting.DEFAULT_ADMIN_ROLE();
    console.log("✅ DEFAULT_ADMIN_ROLE function works:", defaultAdminRole);
    
    // Get the deployer
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    const hasAdminRole = await voting.hasRole(adminRole, deployer.address);
    console.log("Deployer has ADMIN_ROLE:", hasAdminRole);
    
    const hasDefaultAdminRole = await voting.hasRole(defaultAdminRole, deployer.address);
    console.log("Deployer has DEFAULT_ADMIN_ROLE:", hasDefaultAdminRole);
    
  } catch (error) {
    console.error("❌ Error testing new contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 