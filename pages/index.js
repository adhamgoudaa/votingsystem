import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import ProposalCard from '../components/ProposalCard';
import Header from '../components/Header';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { contract, account, isAdmin } = useWeb3();

  useEffect(() => {
    if (contract) {
      console.log("Contract available, loading proposals...");
      loadProposals();
    } else {
      console.log("No contract instance available");
      setLoading(false);
    }
  }, [contract]);

  const loadProposals = async () => {
    try {
      console.log("Starting to load proposals...");
      const loadedProposals = [];
      
      // Try to get the first proposal
      try {
        const details = await contract.getProposalDetails(0);
        console.log("First proposal details:", details);
        loadedProposals.push({
          id: 0,
          description: details.description,
          startTime: new Date(details.startTime.toNumber() * 1000),
          endTime: new Date(details.endTime.toNumber() * 1000),
          finalized: details.finalized,
          totalVotes: details.totalVotes.toNumber(),
          optionCount: details.optionCount.toNumber()
        });
      } catch (error) {
        console.log("No proposals found or error loading first proposal:", error);
      }

      setProposals(loadedProposals);
      setLoading(false);
      console.log("Finished loading proposals:", loadedProposals);
    } catch (error) {
      console.error('Error in loadProposals:', error);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Boardroom Voting System</title>
        <meta name="description" content="Blockchain-based boardroom voting system" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Boardroom Voting
        </h1>

        {isAdmin && (
          <div className={styles.createSection}>
            <button
              className={styles.createButton}
              onClick={() => window.location.href = '/create-proposal'}
            >
              Create New Proposal
            </button>
          </div>
        )}

        <div className={styles.grid}>
          {loading ? (
            <div className={styles.loading}>
              Loading proposals...
              <br />
              {contract ? "Contract connected" : "Waiting for contract connection"}
            </div>
          ) : proposals.length === 0 ? (
            <div className={styles.noProposals}>
              No active proposals found
              <br />
              {isAdmin && "Click 'Create New Proposal' to get started"}
            </div>
          ) : (
            proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                account={account}
              />
            ))
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Powered by Ethereum Blockchain</p>
      </footer>
    </div>
  );
} 