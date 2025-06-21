import { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/ProposalCard.module.css';

export default function ProposalCard({ proposal }) {
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(50);
  const [loading, setLoading] = useState(false);
  const [userVote, setUserVote] = useState(null); // { hasVoted, votedOption, voterWeight }
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { contract, account } = useWeb3();

  useEffect(() => {
    loadOptions();
    if (account) {
      loadUserVote();
      checkAdminRole();
    } else {
      setUserVote(null);
      setIsAdmin(false);
    }
    setError(''); // Clear error on proposal/account change
    // eslint-disable-next-line
  }, [proposal.id, account]);

  const loadOptions = async () => {
    if (!contract) return;
    
    const loadedOptions = [];
    for (let i = 0; i < proposal.optionCount; i++) {
      const option = await contract.getOptionDetails(proposal.id, i);
      loadedOptions.push({
        id: i,
        description: option.description,
        scoreSum: option.scoreSum.toNumber(),
        weightedVoteCount: option.weightedVoteCount.toNumber()
      });
    }
    setOptions(loadedOptions);
  };

  const loadUserVote = async () => {
    try {
      const res = await contract.getVoteDetails(proposal.id, account);
      setUserVote({
        hasVoted: res[0],
        votedOption: res[1].toNumber ? res[1].toNumber() : Number(res[1]),
        voterWeight: res[2].toNumber ? res[2].toNumber() : Number(res[2])
      });
    } catch (err) {
      setUserVote(null);
    }
  };

  const checkAdminRole = async () => {
    try {
      const adminRole = await contract.ADMIN_ROLE();
      const hasAdminRole = await contract.hasRole(adminRole, account);
      setIsAdmin(hasAdminRole);
    } catch (err) {
      setIsAdmin(false);
    }
  };

  const handleVote = async () => {
    if (selectedOption === null || !account) return;
    setError('');
    try {
      setLoading(true);
      const tx = await contract.castVote(proposal.id, selectedOption, score);
      await tx.wait();
      await loadOptions();
      await loadUserVote();
    } catch (error) {
      console.error('Error casting vote:', error);
      // Try to extract a readable error message
      let message = 'An error occurred.';
      if (error?.error?.data?.message) {
        message = error.error.data.message;
      } else if (error?.data?.message) {
        message = error.data.message;
      } else if (error?.reason) {
        message = error.reason;
      } else if (error?.message) {
        message = error.message;
      }
      // Clean up common error message patterns
      if (message.includes('Already voted')) message = 'You have already voted on this proposal.';
      if (message.includes('Voter not registered')) message = 'You are not registered as a voter.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = () => {
    const now = new Date();
    if (proposal.finalized) return 'Finalized';
    if (now < proposal.startTime) return 'Upcoming';
    if (now > proposal.endTime) return 'Ended';
    return 'Active';
  };

  const status = getStatus();
  const isActive = status === 'Active';

  // Debug information
  console.log('ProposalCard Debug:', {
    proposalId: proposal.id,
    status,
    isActive,
    selectedOption,
    account,
    hasAccount: !!account,
    isAdmin,
    canVote: isActive && account && !isAdmin && !(userVote && userVote.hasVoted),
    buttonDisabled: loading || selectedOption === null || (userVote && userVote.hasVoted),
    userVote,
    error
  });

  return (
    <div className={styles.card}>
      {!account ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          margin: '20px 0'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
            opacity: 0.6
          }}>
            🔐
          </div>
          <h3 style={{ 
            fontSize: '24px', 
            marginBottom: '15px',
            fontWeight: '600'
          }}>
            Connect Your Wallet
          </h3>
          <p style={{ 
            fontSize: '16px', 
            opacity: 0.7,
            lineHeight: '1.5',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            Please connect your MetaMask wallet to view proposal details and participate in voting.
          </p>
          <div style={{
            marginTop: '25px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              💡 Tip: Make sure you're connected to the correct network
            </div>
          </div>
        </div>
      ) : (
        <>
        <h2 className={styles.title}>{proposal.description}</h2>
        <div className={styles.status}>
          <span className={`${styles.badge} ${styles[status.toLowerCase()]}`}>{status}</span>
          {isAdmin && <span style={{ marginLeft: 10, color: 'blue', fontWeight: 'bold' }}></span>}
        </div>
        <div className={styles.timing}>
          <p>Start: {proposal.startTime.toLocaleString()}</p>
          <p>End: {proposal.endTime.toLocaleString()}</p>
          <p>Current Time: {new Date().toLocaleString()}</p>
        </div>
        <div className={styles.options}>
          {options.map((option) => {
            // If user has voted, highlight their voted option
            const isVotedOption = userVote && userVote.hasVoted && userVote.votedOption === option.id;
            return (
              <div
                key={option.id}
                className={
                  `${styles.option} ` +
                  (selectedOption === option.id ? styles.selected : '') +
                  (isVotedOption ? ' ' + styles.voted : '') +
                  ((userVote && userVote.hasVoted) ? ' ' + styles.disabled : '')
                }
                onClick={() => {
                  if (isActive && !isAdmin && !(userVote && userVote.hasVoted)) {
                    setSelectedOption(option.id);
                  }
                }}
                style={userVote && userVote.hasVoted ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                title={userVote && userVote.hasVoted ? 'You have already voted' : ''}
              >
                <h3>{option.description}</h3>
                <div className={styles.stats}>
                  <span>Total Score: {option.scoreSum}</span>
                  <span>Votes: {option.weightedVoteCount}</span>
                  {option.weightedVoteCount > 0 && (
                    <span>Avg Score: {Math.round(option.scoreSum / option.weightedVoteCount)}</span>
                  )}
                </div>
                {isVotedOption && (
                  <div style={{ color: 'green', fontWeight: 'bold', fontSize: 12 }}>Your Vote</div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Admin View - Show voting results and status */}
        {isAdmin && (
          <div className={styles.adminView}>
            <h3 style={{ color: 'blue', marginBottom: 10 }}>Admin View - Voting Results</h3>
            <div style={{ marginBottom: 10 }}>
              <strong>Total Votes Cast:</strong> {proposal.totalVotes}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>Status:</strong> {status}
            </div>
            {!isActive && proposal.totalVotes > 0 && (
              <div style={{ marginBottom: 10 }}>
                <strong>Leading Option:</strong> {
                  options.reduce((leading, option, index) => {
                    const avgScore = option.weightedVoteCount > 0 ? option.scoreSum / option.weightedVoteCount : 0;
                    const leadingAvgScore = leading.avgScore;
                    return avgScore > leadingAvgScore ? { index, avgScore } : leading;
                  }, { index: 0, avgScore: 0 }).index
                } - {options[options.reduce((leading, option, index) => {
                  const avgScore = option.weightedVoteCount > 0 ? option.scoreSum / option.weightedVoteCount : 0;
                  const leadingAvgScore = leading.avgScore;
                  return avgScore > leadingAvgScore ? { index, avgScore } : leading;
                }, { index: 0, avgScore: 0 }).index]?.description}
              </div>
            )}
          </div>
        )}
        
        {/* Voting UI or Already Voted UI - Only for non-admin voters */}
        {isActive && account && !isAdmin && userVote && userVote.hasVoted ? (
          <div className={styles.voting}>
            <div style={{ color: 'green', fontWeight: 'bold', marginBottom: 8 }}>You already voted!</div>
            <div>Your vote: <b>{options[userVote.votedOption]?.description || `Option #${userVote.votedOption}`}</b> (Weight: {userVote.voterWeight})</div>
          </div>
        ) : isActive && account && !isAdmin ? (
          <div className={styles.voting}>
            <div className={styles.scoreSelector}>
              <label>Score (1-100):</label>
              <input
                type="range"
                min="1"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                disabled={userVote && userVote.hasVoted}
              />
              <span>{score}</span>
            </div>
            <button
              className={styles.voteButton}
              disabled={loading || selectedOption === null || (userVote && userVote.hasVoted)}
              title={userVote && userVote.hasVoted ? 'You have already voted on this proposal.' : ''}
              onClick={handleVote}
            >
              {loading ? 'Voting...' : 'Cast Vote'}
            </button>
            {error && (
              <div style={{ color: 'red', marginTop: 8 }}>{error}</div>
            )}
            {/* Debug info */}
            <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              <p>Debug: Selected Option = {selectedOption !== null ? selectedOption : 'None'}</p>
              <p>Debug: Button Disabled = {loading || selectedOption === null || (userVote && userVote.hasVoted) ? 'Yes' : 'No'}</p>
              <p>Debug: Loading = {loading ? 'Yes' : 'No'}</p>
            </div>
          </div>
        ) : null}
        
        <div className={styles.footer}>
          <span>Total Votes: {proposal.totalVotes}</span>
        </div>
        </>
      )}
    </div>
  );
} 