import { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/ProposalCard.module.css';

export default function ProposalCard({ proposal }) {
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(50);
  const [loading, setLoading] = useState(false);
  const { contract, account } = useWeb3();

  useEffect(() => {
    loadOptions();
  }, [proposal.id]);

  const loadOptions = async () => {
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

  const handleVote = async () => {
    if (!selectedOption || !account) return;
    
    try {
      setLoading(true);
      const tx = await contract.castVote(proposal.id, selectedOption, score);
      await tx.wait();
      await loadOptions();
    } catch (error) {
      console.error('Error casting vote:', error);
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

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{proposal.description}</h2>
      
      <div className={styles.status}>
        <span className={`${styles.badge} ${styles[status.toLowerCase()]}`}>
          {status}
        </span>
      </div>

      <div className={styles.timing}>
        <p>Start: {proposal.startTime.toLocaleString()}</p>
        <p>End: {proposal.endTime.toLocaleString()}</p>
      </div>

      <div className={styles.options}>
        {options.map((option) => (
          <div
            key={option.id}
            className={`${styles.option} ${selectedOption === option.id ? styles.selected : ''}`}
            onClick={() => isActive && setSelectedOption(option.id)}
          >
            <h3>{option.description}</h3>
            <div className={styles.stats}>
              <span>Total Score: {option.scoreSum}</span>
              <span>Votes: {option.weightedVoteCount}</span>
            </div>
          </div>
        ))}
      </div>

      {isActive && account && (
        <div className={styles.voting}>
          <div className={styles.scoreSelector}>
            <label>Score (1-100):</label>
            <input
              type="range"
              min="1"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
            <span>{score}</span>
          </div>

          <button
            className={styles.voteButton}
            disabled={loading || !selectedOption}
            onClick={handleVote}
          >
            {loading ? 'Voting...' : 'Cast Vote'}
          </button>
        </div>
      )}

      <div className={styles.footer}>
        <span>Total Votes: {proposal.totalVotes}</span>
      </div>
    </div>
  );
} 