import { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import BoardroomVotingABI from '../contracts/artifacts/contracts/BoardroomVoting.sol/BoardroomVoting.json';

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      // Handle account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });

      // Handle chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  useEffect(() => {
    if (provider && account) {
      initializeContract();
    }
  }, [provider, account]);

  const initializeContract = async () => {
    try {
      const signer = provider.getSigner();
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      const contract = new ethers.Contract(
        contractAddress,
        BoardroomVotingABI.abi,
        signer
      );
      setContract(contract);

      // Check if the connected account is an admin
      const adminRole = await contract.ADMIN_ROLE();
      const isAdmin = await contract.hasRole(adminRole, account);
      setIsAdmin(isAdmin);
    } catch (error) {
      console.error('Error initializing contract:', error);
    }
  };

  const connect = async () => {
    try {
      if (!provider) {
        alert('Please install MetaMask!');
        return;
      }

      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setContract(null);
    setIsAdmin(false);
  };

  return (
    <Web3Context.Provider
      value={{
        provider,
        contract,
        account,
        isAdmin,
        connect,
        disconnect
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
} 