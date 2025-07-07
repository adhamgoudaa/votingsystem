import { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/ProposalCard.module.css';

export default function ProposalCard({ proposal, departments = [] }) {
  const [options, setOptions] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [optionScores, setOptionScores] = useState({});
  const [totalOptions, setTotalOptions] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  const { contract, account } = useWeb3();

  const loadOptions = async () => {
    if (!contract) return;
    try {
      const optionsData = [];
      for (let i = 0; i < proposal.optionCount; i++) {
        const option = await contract.getOptionDetails(proposal.id, i);
        optionsData.push({
          id: i,
          description: option.description,
          totalScore: option.totalScore.toString(),
          totalRatings: option.totalRatings.toString(),
          weightedVoteCount: option.weightedVoteCount.toString()
        });
      }
      setOptions(optionsData);
      setTotalOptions(optionsData.length);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadUserVote = async () => {
    if (!contract || !account) return;
    try {
      const voteDetails = await contract.getVoteDetails(proposal.id, account);
      setUserVote({
        hasVoted: voteDetails.userHasVoted,
        optionScores: voteDetails.optionScores.map(score => score.toString()),
        voterWeight: voteDetails.voterWeight.toString(),
        departmentId: voteDetails.departmentId.toString(),
        ratedOptionsCount: voteDetails.ratedOptionsCount.toString()
      });
      
      // Set existing scores in the UI
      const scores = {};
      voteDetails.optionScores.forEach((score, index) => {
        if (score > 0) {
          scores[index] = parseInt(score.toString());
        }
      });
      setOptionScores(scores);
    } catch (error) {
      console.error('Error loading user vote:', error);
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

  const handleScoreChange = (optionId, score) => {
    setOptionScores(prev => ({ ...prev, [optionId]: score }));
  };

  const handleCompleteVoting = async () => {
    if (!account) return;
    setError('');
    try {
      setLoading(true);
      
      // Check if user can still vote
      const [canStillVote, reason] = await contract.canStillVote(proposal.id, account);
      if (!canStillVote) {
        setError(reason);
        setLoading(false);
        return;
      }
      
      // Create array of scores for all options (default to 1 if not rated)
      const scores = [];
      for (let i = 0; i < totalOptions; i++) {
        scores.push(optionScores[i] || 1);
      }
      
      const tx = await contract.completeVoting(proposal.id, scores);
      await tx.wait();
      
      await loadOptions();
      await loadUserVote();
    } catch (error) {
      console.error('Error completing voting:', error);
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
  const canVote = isActive && account && !isAdmin && !(userVote && userVote.hasVoted);
  const ratedOptionsCount = Object.keys(optionScores).filter(key => optionScores[key] > 0).length;
  const isVotingComplete = ratedOptionsCount === totalOptions;

  // Get participating department names
  const participatingDepartmentNames = proposal.participatingDepartments
    ? proposal.participatingDepartments
        .map(deptId => departments.find(dept => dept.id === deptId)?.name)
        .filter(name => name)
    : [];

  useEffect(() => {
    if (contract && proposal) {
      loadOptions();
      loadUserVote();
      checkAdminRole();
    }
  }, [contract, proposal, account]);

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
        </div>
      ) : (
        <>
          <h2 className={styles.title}>{proposal.description}</h2>
          <div className={styles.status}>
            <span className={`${styles.badge} ${styles[status.toLowerCase()]}`}>{status}</span>
            {isAdmin && <span style={{ marginLeft: 10, color: 'blue', fontWeight: 'bold' }}>👑 Admin</span>}
          </div>
          
          {/* Participating Departments */}
          {participatingDepartmentNames.length > 0 && (
            <div className={styles.departments}>
              <h4>Participating Departments:</h4>
              <div className={styles.departmentList}>
                {participatingDepartmentNames.map((deptName, index) => (
                  <span key={index} className={styles.departmentTag}>
                    {deptName}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className={styles.timing}>
            <p>Start: {proposal.startTime.toLocaleString()}</p>
            <p>End: {proposal.endTime.toLocaleString()}</p>
          </div>

          {/* Voting Instructions */}
          {canVote && !userVote?.hasVoted && (
            <div className={styles.instructions}>
              <div className={styles.instructionsHeader}>
                <h4>📋 Voting Instructions</h4>
                <button 
                  onClick={() => setShowInstructions(!showInstructions)}
                  className={styles.toggleButton}
                >
                  {showInstructions ? 'Hide' : 'Show'} Instructions
                </button>
              </div>
              
              {showInstructions && (
                <div className={styles.instructionsContent}>
                  <p><strong>How to vote (Gas Efficient):</strong></p>
                  <ul>
                    <li>Rate <strong>ALL options</strong> with a score from 1 to 5</li>
                    <li>1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent</li>
                    <li>Your voting weight will be multiplied by your score</li>
                    <li>Submit all ratings at once to save gas fees</li>
                    <li>You can change your ratings before submitting</li>
                  </ul>
                  
                  <div className={styles.progressBar}>
                    <div className={styles.progressText}>
                      Progress: {ratedOptionsCount} of {totalOptions} options rated
                    </div>
                    <div className={styles.progressTrack}>
                      <div 
                        className={styles.progressFill}
                        style={{ width: `${(ratedOptionsCount / totalOptions) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.options}>
            {options.map((option) => {
              const userScore = optionScores[option.id] || 0;
              const isRated = userScore > 0;
              
              return (
                <div
                  key={option.id}
                  className={`${styles.option} ${isRated ? styles.rated : ''} ${(userVote && userVote.hasVoted) ? styles.disabled : ''}`}
                >
                  <h3>{option.description}</h3>
                  
                  <div className={styles.stats}>
                    <span>Total Score: {option.totalScore}</span>
                    <span>Ratings: {option.totalRatings}</span>
                    <span>Votes: {option.weightedVoteCount}</span>
                    {option.totalRatings > 0 && (
                      <span>Avg Score: {Math.round(option.totalScore / option.totalRatings)}</span>
                    )}
                  </div>

                  {/* Rating Interface */}
                  {canVote && !userVote?.hasVoted && (
                    <div className={styles.ratingSection}>
                      <div className={styles.ratingButtons}>
                        <span>Rate this option:</span>
                        <div className={styles.scoreButtons}>
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => handleScoreChange(option.id, score)}
                              className={`${styles.scoreButton} ${userScore === score ? styles.selected : ''}`}
                              disabled={loading}
                              title={`${score}/5`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                      {isRated && (
                        <div className={styles.ratedDisplay}>
                          <span>Your Rating: {userScore}/5</span>
                          <button 
                            onClick={() => handleScoreChange(option.id, 0)}
                            className={styles.changeRatingButton}
                            disabled={loading}
                          >
                            Clear Rating
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show user's rating if they've voted */}
                  {userVote?.hasVoted && userScore > 0 && (
                    <div className={styles.userRating}>
                      Your Rating: {userScore}/5
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Complete Voting Button */}
          {canVote && !userVote?.hasVoted && (
            <div className={styles.completeVoting}>
              <button
                onClick={handleCompleteVoting}
                className={styles.completeButton}
                disabled={loading || ratedOptionsCount < totalOptions}
              >
                {loading ? 'Submitting Vote...' : `Submit Vote (${ratedOptionsCount}/${totalOptions})`}
              </button>
              {ratedOptionsCount < totalOptions && (
                <p className={styles.completeNote}>
                  Rate all {totalOptions} options to submit your vote
                </p>
              )}
              {ratedOptionsCount === totalOptions && (
                <p className={styles.completeNote}>
                  ✅ All options rated! Click "Submit Vote" to complete your voting.
                </p>
              )}
            </div>
          )}
          
          {/* Admin View - Show voting results and status */}
          {isAdmin && (
            <div className={styles.adminView}>
              <h4>Admin View</h4>
              <p>Total Votes: {proposal.totalVotes}</p>
              {proposal.finalized && (
                <div className={styles.winner}>
                  <h5>Winner:</h5>
                  {options.length > 0 && (
                    <div className={styles.winningOption}>
                      {options[0].description} (Score: {options[0].totalScore})
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
} 