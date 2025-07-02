import { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import DepartmentVotingABI from '../contracts/artifacts/contracts/DepartmentVoting.sol/DepartmentVoting.json';

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize provider and check for existing connection
  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      // Check if already connected
      checkExistingConnection(provider);

      // Handle account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('Account changed:', accounts);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setContract(null);
          setIsAdmin(false);
        }
      });

      // Handle chain changes
      window.ethereum.on('chainChanged', () => {
        console.log('Chain changed, reloading...');
        window.location.reload();
      });
    }
  }, []);

  // Check for existing connection
  const checkExistingConnection = async (provider) => {
    try {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        console.log('Found existing connection:', accounts[0]);
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Error checking existing connection:', error);
    }
  };

  // Initialize contract and check admin role when account changes
  useEffect(() => {
    if (provider && account) {
      initializeContract();
    } else {
      setContract(null);
      setIsAdmin(false);
    }
  }, [provider, account]);

  const initializeContract = async () => {
    try {
      console.log('Initializing contract for account:', account);
      const signer = provider.getSigner();
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      const contract = new ethers.Contract(
        contractAddress,
        DepartmentVotingABI.abi,
        signer
      );
      setContract(contract);

      // Check if the connected account is an admin
      const adminRole = await contract.ADMIN_ROLE();
      const isAdmin = await contract.hasRole(adminRole, account);
      console.log('Admin check for', account, ':', isAdmin);
      setIsAdmin(isAdmin);
    } catch (error) {
      console.error('Error initializing contract:', error);
      setContract(null);
      setIsAdmin(false);
    }
  };

  const connect = async () => {
    try {
      setIsConnecting(true);
      if (!provider) {
        alert('Please install MetaMask!');
        return;
      }

      const accounts = await provider.send('eth_requestAccounts', []);
      console.log('Connected to account:', accounts[0]);
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    console.log('Disconnecting wallet');
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
        isConnecting,
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