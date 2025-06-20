import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/CreateProposal.module.css';

export default function CreateProposal() {
  const router = useRouter();
  const { contract, isAdmin } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    options: ['', ''],
    startTime: '',
    duration: '3600' // Default 1 hour
  });

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, '']
    });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) return;
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !isAdmin) return;

    try {
      setLoading(true);
      const startTimestamp = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const tx = await contract.createProposal(
        formData.description,
        formData.options.filter(opt => opt.trim() !== ''),
        startTimestamp,
        Number(formData.duration)
      );
      await tx.wait();
      router.push('/');
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <Header />
        <main className={styles.main}>
          <div className={styles.unauthorized}>
            <h1>Unauthorized Access</h1>
            <p>Only administrators can create new proposals.</p>
            <button onClick={() => router.push('/')}>Return to Home</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Create New Proposal - Boardroom Voting</title>
        <meta name="description" content="Create a new voting proposal" />
      </Head>

      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>Create New Proposal</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Proposal Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Enter proposal description"
            />
          </div>

          <div className={styles.field}>
            <label>Options</label>
            {formData.options.map((option, index) => (
              <div key={index} className={styles.optionField}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  required
                  placeholder={`Option ${index + 1}`}
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className={styles.removeOption}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className={styles.addOption}
            >
              Add Option
            </button>
          </div>

          <div className={styles.field}>
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Duration (seconds)</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              required
              min="300"
              step="1"
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
        </form>
      </main>
    </div>
  );
} 