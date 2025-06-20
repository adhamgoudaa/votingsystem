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