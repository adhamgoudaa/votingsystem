const hre = require("hardhat");

async function main() {
  console.log("Transferring admin roles to funded account...");
  
  const contractAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  const fundedAccountAddress = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  
  console.log("Contract address:", contractAddress);
  console.log("Funded account address:", fundedAccountAddress);
  
  // Get the contract instance
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const contract = DepartmentVoting.attach(contractAddress);
  
  // Get the current admin (account 1)
  const [deployer, currentAdmin] = await hre.ethers.getSigners();
  console.log("Current admin:", currentAdmin.address);
  
  // Check current roles
  const adminRole = await contract.ADMIN_ROLE();
  const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();
  
  console.log("\nChecking current roles...");
  const currentHasAdmin = await contract.hasRole(adminRole, currentAdmin.address);
  const currentHasDefaultAdmin = await contract.hasRole(defaultAdminRole, currentAdmin.address);
  const fundedHasAdmin = await contract.hasRole(adminRole, fundedAccountAddress);
  const fundedHasDefaultAdmin = await contract.hasRole(defaultAdminRole, fundedAccountAddress);
  
  console.log(`Current admin has ADMIN_ROLE: ${currentHasAdmin}`);
  console.log(`Current admin has DEFAULT_ADMIN_ROLE: ${currentHasDefaultAdmin}`);
  console.log(`Funded account has ADMIN_ROLE: ${fundedHasAdmin}`);
  console.log(`Funded account has DEFAULT_ADMIN_ROLE: ${fundedHasDefaultAdmin}`);
  
  // Transfer roles
  console.log("\nTransferring roles...");
  
  // Grant ADMIN_ROLE to funded account
  if (!fundedHasAdmin) {
    const tx1 = await contract.connect(currentAdmin).grantRole(adminRole, fundedAccountAddress);
    await tx1.wait();
    console.log("✅ Granted ADMIN_ROLE to funded account");
  }
  
  // Grant DEFAULT_ADMIN_ROLE to funded account
  if (!fundedHasDefaultAdmin) {
    const tx2 = await contract.connect(currentAdmin).grantRole(defaultAdminRole, fundedAccountAddress);
    await tx2.wait();
    console.log("✅ Granted DEFAULT_ADMIN_ROLE to funded account");
  }
  
  // Revoke roles from current admin
  if (currentHasAdmin) {
    const tx3 = await contract.connect(currentAdmin).revokeRole(adminRole, currentAdmin.address);
    await tx3.wait();
    console.log("✅ Revoked ADMIN_ROLE from current admin");
  }
  
  if (currentHasDefaultAdmin) {
    const tx4 = await contract.connect(currentAdmin).revokeRole(defaultAdminRole, currentAdmin.address);
    await tx4.wait();
    console.log("✅ Revoked DEFAULT_ADMIN_ROLE from current admin");
  }
  
  // Verify the transfer
  console.log("\nVerifying role transfer...");
  const finalFundedHasAdmin = await contract.hasRole(adminRole, fundedAccountAddress);
  const finalFundedHasDefaultAdmin = await contract.hasRole(defaultAdminRole, fundedAccountAddress);
  const finalCurrentHasAdmin = await contract.hasRole(adminRole, currentAdmin.address);
  const finalCurrentHasDefaultAdmin = await contract.hasRole(defaultAdminRole, currentAdmin.address);
  
  console.log(`Funded account has ADMIN_ROLE: ${finalFundedHasAdmin}`);
  console.log(`Funded account has DEFAULT_ADMIN_ROLE: ${finalFundedHasDefaultAdmin}`);
  console.log(`Current admin has ADMIN_ROLE: ${finalCurrentHasAdmin}`);
  console.log(`Current admin has DEFAULT_ADMIN_ROLE: ${finalCurrentHasDefaultAdmin}`);
  
  if (finalFundedHasAdmin && finalFundedHasDefaultAdmin && !finalCurrentHasAdmin && !finalCurrentHasDefaultAdmin) {
    console.log("\n🎉 Admin transfer successful!");
    console.log(`New admin: ${fundedAccountAddress}`);
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