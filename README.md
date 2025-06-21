# Boardroom Voting System

A blockchain-based voting system designed specifically for boardroom scenarios, featuring weighted voting mechanisms and score-based voting options.

## Features

- Ethereum-based smart contracts for secure voting
- Support for weighted voting mechanisms
- Score-based voting (beyond simple yes/no)
- Identity verification for board members
- Real-time vote tracking and results
- Simulation framework with virtual agents
- Self-tallying capability
- Complete vote privacy and security

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask or similar Web3 wallet

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/boardroom-voting-system.git
cd boardroom-voting-system
```

2. Install dependencies:
```bash
npm install
```

3. Configure the local blockchain network:
```bash
npx hardhat node
```

4. Deploy smart contracts:
```bash
npm run deploy
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

- `/contracts` - Smart contracts for the voting system
- `/scripts` - Deployment and utility scripts
- `/test` - Test files for smart contracts and components
- `/pages` - Next.js pages and API routes
- `/components` - React components
- `/utils` - Utility functions and helpers
- `/simulation` - Simulation framework and virtual agents

## Usage

1. Start the local blockchain network
2. Deploy the smart contracts
3. Configure board member identities
4. Create and manage voting sessions
5. Run simulations with virtual agents

## Testing

Run the test suite:
```bash
npm test
```

## License

MIT 

# Voting System Deployment Guide

This guide will help you set up, deploy, and run the Voting System project on your local Hardhat network. Follow these steps to avoid common issues.

---

## 1. Clone the Repository

```
git clone https://github.com/adhamgoudaa/votingsystem.git
cd votingsystem
```

---

## 2. Install Dependencies

```
npm install
```

---

## 3. Set Up Environment Variables

Create a `.env` file in the project root with the following content:

```
PRIVATE_KEY=<YOUR_DEPLOYER_PRIVATE_KEY>
```
- Use one of the pre-funded private keys from the Hardhat node (see below for how to get them).

---

## 4. Start the Hardhat Local Node

In a terminal, run:
```
npx hardhat node
```
This will start a local blockchain and print 20 pre-funded accounts and their private keys. Use one of these for deployment and funding.

---

## 5. Fund Your Deployer Account (if needed)

If your deployer account is not one of the default Hardhat accounts, use the funding script:

- Edit `scripts/fund-account.js` and set `const receiverAddress = "<YOUR_DEPLOYER_ADDRESS>";`
- Run:
```
npx hardhat run scripts/fund-account.js --network localhost
```

---

## 6. Deploy the Smart Contract

Run the deployment script:
```
npx hardhat run scripts/deploy.js --network localhost
```
- This will deploy the contract and print the contract address.

---

## 7. Update Frontend Environment Variables

Create or update `.env.local` in the project root:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
```
- Replace `<DEPLOYED_CONTRACT_ADDRESS>` with the address printed by the deploy script.

---

## 8. Start the Frontend

In a new terminal, run:
```
npm run dev
```

---

## 9. Connect MetaMask

- Add the Hardhat Local network to MetaMask:
  - **Network Name:** Hardhat Local
  - **New RPC URL:** http://127.0.0.1:8545
  - **Chain ID:** 1337
  - **Currency Symbol:** ETH
- Import your deployer account using its private key.

---

## 10. Admin Access

- The deployer account (used in `.env` and MetaMask) will have admin privileges in the contract and see admin UI options.

---

## Parameters to Change
- `.env`: Set `PRIVATE_KEY` to a pre-funded Hardhat account's private key.
- `scripts/fund-account.js`: Set `receiverAddress` to your deployer address if funding is needed.
- `.env.local`: Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to the deployed contract address.

---

## Troubleshooting
- If you see "not a contract" errors, check that `.env.local` has the correct contract address.
- Always restart the frontend after changing `.env.local`.
- Make sure the Hardhat node is running before deploying or using the frontend.

---

## Example Hardhat Account

```
Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

Happy building! 