import { useState } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/RegisterVoter.module.css';

export default function RegisterVoter() {
  const router = useRouter();
  const { contract, account, isAdmin } = useWeb3();
  const [formData, setFormData] = useState({
    address: '',
    weight: ''
  });
  const [status, setStatus] = useState({
    loading: false,
    error: null,
    success: false
  });

  // Redirect if not admin
  if (typeof window !== 'undefined' && !isAdmin) {
    router.push('/');
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateAddress = (address) => {
    try {
      return ethers.utils.isAddress(address);
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, success: false });

    try {
      // Validate inputs
      if (!validateAddress(formData.address)) {
        throw new Error('Invalid Ethereum address');
      }

      const weight = parseInt(formData.weight);
      if (isNaN(weight) || weight <= 0) {
        throw new Error('Weight must be a positive number');
      }

      // Register voter
      const tx = await contract.registerVoter(formData.address, weight);
      await tx.wait();

      setStatus({
        loading: false,
        error: null,
        success: true
      });

      // Reset form
      setFormData({
        address: '',
        weight: ''
      });

      // Show success message briefly
      setTimeout(() => {
        setStatus(prev => ({ ...prev, success: false }));
      }, 3000);

    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'Failed to register voter',
        success: false
      });
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Register Voter - Boardroom Voting</title>
        <meta name="description" content="Register new voters for boardroom voting" />
      </Head>

      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>Register New Voter</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="address">Ethereum Address:</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="0x..."
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="weight">Voting Weight:</label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="Enter voting weight (e.g. 1)"
              min="1"
              required
              className={styles.input}
            />
          </div>

          {status.error && (
            <div className={styles.error}>
              {status.error}
            </div>
          )}

          {status.success && (
            <div className={styles.success}>
              Voter registered successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className={styles.button}
          >
            {status.loading ? 'Registering...' : 'Register Voter'}
          </button>
        </form>
      </main>
    </div>
  );
} 