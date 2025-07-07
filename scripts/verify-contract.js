const hre = require("hardhat");

async function main() {
  console.log("Verifying contract deployment...");
  
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  console.log("Contract address:", contractAddress);
  
  // Get the contract instance
  const DepartmentVoting = await hre.ethers.getContractFactory("DepartmentVoting");
  const contract = DepartmentVoting.attach(contractAddress);
  
  // Check if contract exists by calling a simple view function
  try {
    const departmentCount = await contract.getDepartmentCount();
    console.log("✅ Contract exists and is accessible");
    console.log("Department count:", departmentCount.toString());
  } catch (error) {
    console.error("❌ Error accessing contract:", error.message);
    return;
  }
  
  // Try to get the admin role
  try {
    const adminRole = await contract.ADMIN_ROLE();
    console.log("✅ ADMIN_ROLE function works");
    console.log("Admin role hash:", adminRole);
  } catch (error) {
    console.error("❌ Error calling ADMIN_ROLE():", error.message);
  }
  
  // Try to get the default admin role
  try {
    const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();
    console.log("✅ DEFAULT_ADMIN_ROLE function works");
    console.log("Default admin role hash:", defaultAdminRole);
  } catch (error) {
    console.error("❌ Error calling DEFAULT_ADMIN_ROLE():", error.message);
  }
  
  // Check admin roles for the funded account
  const fundedAccount = "0xb4b7B16AB32Ed31a7cD5BCcC65051b8716205203";
  
  try {
    const adminRole = await contract.ADMIN_ROLE();
    const hasAdminRole = await contract.hasRole(adminRole, fundedAccount);
    console.log(`Funded account has ADMIN_ROLE: ${hasAdminRole}`);
  } catch (error) {
    console.error("❌ Error checking admin role:", error.message);
  }
  
  try {
    const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();
    const hasDefaultAdminRole = await contract.hasRole(defaultAdminRole, fundedAccount);
    console.log(`Funded account has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);
  } catch (error) {
    console.error("❌ Error checking default admin role:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 