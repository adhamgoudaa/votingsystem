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
  const [departments, setDepartments] = useState([]);
  const [userDepartment, setUserDepartment] = useState(null);
  const { contract, account, isAdmin } = useWeb3();

  useEffect(() => {
    if (contract) {
      console.log("Contract available, loading proposals...");
      console.log("isAdmin:", isAdmin);
      console.log("account:", account);
      loadDepartments();
      loadProposals();
      if (account && !isAdmin) {
        loadUserDepartment();
      }
    } else {
      console.log("No contract instance available");
      setLoading(false);
    }
  }, [contract, isAdmin, account]);

  const loadUserDepartment = async () => {
    try {
      if (!account) return;
      
      // Try to get user's department from any proposal
      const proposalCount = await contract.getProposalCount();
      for (let i = 0; i < proposalCount.toNumber(); i++) {
        try {
          const voterDetails = await contract.getVoteDetails(i, account);
          const userDeptId = voterDetails[3].toNumber();
          const [name, weight, isActive, memberCount] = await contract.getDepartmentDetails(userDeptId);
          setUserDepartment({
            id: userDeptId,
            name,
            weight: weight.toNumber(),
            isActive,
            memberCount: memberCount.toNumber()
          });
          break;
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.error('Error loading user department:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const departmentCount = await contract.getDepartmentCount();
      const deptArray = [];

      for (let i = 0; i < departmentCount.toNumber(); i++) {
        const [name, weight, isActive, memberCount] = await contract.getDepartmentDetails(i);
        deptArray.push({
          id: i,
          name,
          weight: weight.toNumber(),
          isActive,
          memberCount: memberCount.toNumber()
        });
      }

      setDepartments(deptArray);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadProposals = async () => {
    try {
      console.log("Starting to load proposals...");
      const loadedProposals = [];
      
      // Get the total number of proposals from the contract
      let totalProposals = 0;
      try {
        totalProposals = await contract.getProposalCount();
        console.log("Total proposals in contract:", totalProposals.toNumber());
      } catch (error) {
        console.log("Could not get total proposals, will use fallback method");
      }
      
      // Try to get all proposals by incrementing the ID until we get an error
      let proposalId = 0;
      const maxProposals = totalProposals > 0 ? totalProposals.toNumber() : 1000; // Fallback limit
      
      while (proposalId < maxProposals) {
        try {
          const details = await contract.getProposalDetails(proposalId);
          console.log(`Proposal ${proposalId} details:`, details);
          
          // Check if this proposal actually exists by checking if description is not empty
          if (!details.description || details.description.trim() === '') {
            console.log(`Proposal ${proposalId} has empty description, stopping loop`);
            break;
          }
          
          console.log(`Processing proposal ${proposalId}: "${details.description}"`);
          
          // Debug: Show proposal timestamps
          const currentTime = Math.floor(Date.now() / 1000);
          console.log(`Proposal ${proposalId} timestamps:`, {
            startTime: details.startTime.toNumber(),
            endTime: details.endTime.toNumber(),
            currentBlockTime: currentTime,
            startTimeDate: new Date(details.startTime.toNumber() * 1000),
            endTimeDate: new Date(details.endTime.toNumber() * 1000),
            currentDate: new Date(currentTime * 1000)
          });
          
          // Load participating departments for this proposal
          const participatingDepartments = [];
          for (let i = 0; i < details.participatingDepartmentCount.toNumber(); i++) {
            const deptId = await contract.getProposalParticipatingDepartment(proposalId, i);
            participatingDepartments.push(deptId.toNumber());
          }
          console.log(`Proposal ${proposalId} participating departments:`, participatingDepartments);

          // Check if current user can vote on this proposal
          let canVote = false;
          if (account) {
            try {
              // First check if user is registered as a voter
              const isRegistered = await contract.isVoterRegistered(account);
              
              if (!isRegistered) {
                console.log(`User ${account} is not registered as a voter`);
                canVote = false;
              } else {
                // Get user's department info for debugging
                const voterDetails = await contract.getVoteDetails(proposalId, account);
                const userDeptId = voterDetails[3].toNumber(); // departmentId
                console.log(`User ${account} is registered, department ID: ${userDeptId}`);
                
                // Check if user's department is participating in this proposal
                const isParticipating = await contract.isDepartmentParticipatingInProposal(proposalId, userDeptId);
                console.log(`User's department ${userDeptId} participating in proposal ${proposalId}:`, isParticipating);
                
                // Debug: Check what canVoteOnProposal actually returns
                const [canVoteResult, reason] = await contract.canVoteOnProposal(proposalId, account);
                console.log(`canVoteOnProposal result for proposal ${proposalId}:`, { canVote: canVoteResult, reason });
                
                // Debug: Get current block timestamp from contract
                const currentBlock = await contract.provider.getBlock('latest');
                console.log(`Current block timestamp:`, currentBlock.timestamp);
                
                // Debug: Show the exact comparison
                console.log(`Timestamp comparison for proposal ${proposalId}:`, {
                  blockTimestamp: currentBlock.timestamp,
                  proposalStartTime: details.startTime.toNumber(),
                  proposalEndTime: details.endTime.toNumber(),
                  isAfterStart: currentBlock.timestamp >= details.startTime.toNumber(),
                  isBeforeEnd: currentBlock.timestamp <= details.endTime.toNumber(),
                  votingShouldBeActive: currentBlock.timestamp >= details.startTime.toNumber() && currentBlock.timestamp <= details.endTime.toNumber()
                });
                
                if (isParticipating) {
                  canVote = true;
                  console.log(`User CAN see proposal ${proposalId} (department participating)`);
                } else {
                  canVote = false;
                  console.log(`User CANNOT see proposal ${proposalId} (department not participating)`);
                }
              }
            } catch (error) {
              console.log(`Error checking if user can vote on proposal ${proposalId}:`, error);
              canVote = false;
            }
          }

          // Only add proposal if user can vote on it (or if user is admin)
          if (canVote || isAdmin) {
            loadedProposals.push({
              id: proposalId,
              description: details.description,
              startTime: new Date(details.startTime.toNumber() * 1000),
              endTime: new Date(details.endTime.toNumber() * 1000),
              finalized: details.finalized,
              totalVotes: details.totalVotes.toNumber(),
              optionCount: details.optionCount.toNumber(),
              participatingDepartments
            });
          }
          
          proposalId++; // Try next proposal
        } catch (error) {
          console.log(`No more proposals found after ID ${proposalId - 1}:`, error.message);
          break; // Exit loop when no more proposals
        }
      }

      setProposals(loadedProposals);
      setLoading(false);
      console.log("Finished loading proposals:", loadedProposals);
    } catch (error) {
      console.error('Error in loadProposals:', error);
      setLoading(false);
    }
  };

  const getRoleDisplay = () => {
    if (!account) return null;
    
    const activeProposals = proposals.filter(p => !p.finalized);
    const finalizedProposals = proposals.filter(p => p.finalized);
    const totalVotes = proposals.reduce((sum, p) => sum + p.totalVotes, 0);
    
    if (isAdmin) {
      return (
        <div className={styles.roleCard}>
          <div className={styles.roleIcon}>A</div>
          <div className={styles.roleContent}>
            <h3 className={styles.roleTitle}>System Administrator</h3>
            <p className={styles.roleDescription}>
              Full access to create proposals, manage departments, and oversee the voting system
            </p>
            <div className={styles.roleBadges}>
              <span className={styles.roleBadge}>Create Proposals</span>
              <span className={styles.roleBadge}>Manage Departments</span>
              <span className={styles.roleBadge}>Register Voters</span>
              <span className={styles.roleBadge}>Finalize Results</span>
            </div>
            {proposals.length > 0 && (
              <div className={styles.statsInline}>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{proposals.length}</span>
                  <span className={styles.statLabel}>Total Proposals</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{activeProposals.length}</span>
                  <span className={styles.statLabel}>Active</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{finalizedProposals.length}</span>
                  <span className={styles.statLabel}>Finalized</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{totalVotes}</span>
                  <span className={styles.statLabel}>Total Votes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else if (userDepartment) {
      return (
        <div className={styles.roleCard}>
          <div className={styles.roleIcon}>B</div>
          <div className={styles.roleContent}>
            <h3 className={styles.roleTitle}>Board Member</h3>
            <p className={styles.roleDescription}>
              Voting member of the <strong>{userDepartment.name}</strong> department
            </p>
            <div className={styles.roleBadges}>
              <span className={styles.roleBadge}>Voting Weight: {userDepartment.weight}</span>
              <span className={styles.roleBadge}>Department: {userDepartment.name}</span>
              <span className={styles.roleBadge}>Active Voter</span>
            </div>
            {proposals.length > 0 && (
              <div className={styles.statsInline}>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{proposals.length}</span>
                  <span className={styles.statLabel}>Total Proposals</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{activeProposals.length}</span>
                  <span className={styles.statLabel}>Active</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{finalizedProposals.length}</span>
                  <span className={styles.statLabel}>Finalized</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{totalVotes}</span>
                  <span className={styles.statLabel}>Total Votes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.roleCard}>
          <div className={styles.roleIcon}>U</div>
          <div className={styles.roleContent}>
            <h3 className={styles.roleTitle}>Connected User</h3>
            <p className={styles.roleDescription}>
              Wallet connected but not registered as a voter
            </p>
            <div className={styles.roleBadges}>
              <span className={styles.roleBadge}>Pending Registration</span>
            </div>
            {proposals.length > 0 && (
              <div className={styles.statsInline}>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{proposals.length}</span>
                  <span className={styles.statLabel}>Total Proposals</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{activeProposals.length}</span>
                  <span className={styles.statLabel}>Active</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{finalizedProposals.length}</span>
                  <span className={styles.statLabel}>Finalized</span>
                </div>
                <div className={styles.statInline}>
                  <span className={styles.statNumber}>{totalVotes}</span>
                  <span className={styles.statLabel}>Total Votes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const getStats = () => {
    const activeProposals = proposals.filter(p => !p.finalized);
    const finalizedProposals = proposals.filter(p => p.finalized);
    const totalVotes = proposals.reduce((sum, p) => sum + p.totalVotes, 0);

    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>T</div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{proposals.length}</h3>
            <p className={styles.statLabel}>Total Proposals</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>A</div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{activeProposals.length}</h3>
            <p className={styles.statLabel}>Active Proposals</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>F</div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{finalizedProposals.length}</h3>
            <p className={styles.statLabel}>Finalized</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>V</div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{totalVotes}</h3>
            <p className={styles.statLabel}>Total Votes Cast</p>
          </div>
        </div>
      </div>
    );
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
        {/* User Role Display */}
        {account && (
          <div className={styles.roleSection}>
            {getRoleDisplay()}
          </div>
        )}

        {/* Proposals Section */}
        <div className={styles.proposalsSection}>
          <h2 className={styles.sectionTitle}>
            {loading ? 'Loading Proposals...' : 
             proposals.length === 0 ? 'No Proposals Available' : 
             'Active Proposals'}
          </h2>

          <div className={styles.grid}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading proposals...</p>
                <small>{contract ? "Contract connected" : "Waiting for contract connection"}</small>
              </div>
            ) : proposals.length === 0 ? (
              <div className={styles.noProposals}>
                {account ? (
                  <>
                    <div className={styles.noProposalsIcon}>📋</div>
                    <h3>No proposals available for you to vote on</h3>
                    <p>
                      This could be because:
                    </p>
                    <ul className={styles.noProposalsList}>
                      <li>You are not registered as a voter</li>
                      <li>Your department is not participating in any active proposals</li>
                      <li>All proposals have ended or been finalized</li>
                    </ul>
                    {isAdmin && (
                      <button
                        className={styles.createButton}
                        onClick={() => window.location.href = '/create-proposal'}
                      >
                        Create New Proposal
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.noProposalsIcon}>🔒</div>
                    <h3>Connect your wallet to view proposals</h3>
                    <p>Please connect your MetaMask wallet to access the voting system</p>
                  </>
                )}
              </div>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  account={account}
                  departments={departments}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>Powered by Ethereum Blockchain</p>
          <p>Secure • Transparent • Decentralized</p>
        </div>
      </footer>
    </div>
  );
} 