const hre = require("hardhat");

async function main() {
  console.log("Transferring admin roles to funded account...");
  
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const newAdminAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  
  console.log("Contract address:", contractAddress);
  console.log("New admin address:", newAdminAddress);
  
  // Get the contract instance
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const contract = DepartmentVoting.attach(contractAddress);
  
  // Get the deployer (current admin)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Current admin (deployer):", deployer.address);
  
  // Check current roles
  const adminRole = await contract.ADMIN_ROLE();
  const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();
  
  console.log("\nChecking current roles...");
  const currentHasAdmin = await contract.hasRole(adminRole, deployer.address);
  const currentHasDefaultAdmin = await contract.hasRole(defaultAdminRole, deployer.address);
  const newHasAdmin = await contract.hasRole(adminRole, newAdminAddress);
  const newHasDefaultAdmin = await contract.hasRole(defaultAdminRole, newAdminAddress);
  
  console.log(`Current admin has ADMIN_ROLE: ${currentHasAdmin}`);
  console.log(`Current admin has DEFAULT_ADMIN_ROLE: ${currentHasDefaultAdmin}`);
  console.log(`New admin has ADMIN_ROLE: ${newHasAdmin}`);
  console.log(`New admin has DEFAULT_ADMIN_ROLE: ${newHasDefaultAdmin}`);
  
  // Transfer roles
  console.log("\nTransferring roles...");
  
  // Grant ADMIN_ROLE to new admin
  if (!newHasAdmin) {
    const tx1 = await contract.grantRole(adminRole, newAdminAddress);
    await tx1.wait();
    console.log("✅ Granted ADMIN_ROLE to new admin");
  }
  
  // Grant DEFAULT_ADMIN_ROLE to new admin
  if (!newHasDefaultAdmin) {
    const tx2 = await contract.grantRole(defaultAdminRole, newAdminAddress);
    await tx2.wait();
    console.log("✅ Granted DEFAULT_ADMIN_ROLE to new admin");
  }
  
  // Revoke roles from current admin
  if (currentHasAdmin) {
    const tx3 = await contract.revokeRole(adminRole, deployer.address);
    await tx3.wait();
    console.log("✅ Revoked ADMIN_ROLE from current admin");
  }
  
  if (currentHasDefaultAdmin) {
    const tx4 = await contract.revokeRole(defaultAdminRole, deployer.address);
    await tx4.wait();
    console.log("✅ Revoked DEFAULT_ADMIN_ROLE from current admin");
  }
  
  // Verify the transfer
  console.log("\nVerifying role transfer...");
  const finalNewHasAdmin = await contract.hasRole(adminRole, newAdminAddress);
  const finalNewHasDefaultAdmin = await contract.hasRole(defaultAdminRole, newAdminAddress);
  const finalCurrentHasAdmin = await contract.hasRole(adminRole, deployer.address);
  const finalCurrentHasDefaultAdmin = await contract.hasRole(defaultAdminRole, deployer.address);
  
  console.log(`New admin has ADMIN_ROLE: ${finalNewHasAdmin}`);
  console.log(`New admin has DEFAULT_ADMIN_ROLE: ${finalNewHasDefaultAdmin}`);
  console.log(`Current admin has ADMIN_ROLE: ${finalCurrentHasAdmin}`);
  console.log(`Current admin has DEFAULT_ADMIN_ROLE: ${finalCurrentHasDefaultAdmin}`);
  
  if (finalNewHasAdmin && finalNewHasDefaultAdmin && !finalCurrentHasAdmin && !finalCurrentHasDefaultAdmin) {
    console.log("\n🎉 Admin transfer successful!");
    console.log(`New admin: ${newAdminAddress}`);
  } else {
    console.log("\n❌ Admin transfer failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 