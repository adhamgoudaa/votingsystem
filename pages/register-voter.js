import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/RegisterVoter.module.css';

export default function RegisterVoter() {
  const router = useRouter();
  const { contract, account, isAdmin } = useWeb3();
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    address: '',
    departmentId: ''
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

  useEffect(() => {
    if (contract) {
      loadDepartments();
    }
  }, [contract]);

  const loadDepartments = async () => {
    try {
      const departmentCount = await contract.getDepartmentCount();
      const deptArray = [];

      for (let i = 0; i < departmentCount.toNumber(); i++) {
        const [name, weight, isActive, memberCount] = await contract.getDepartmentDetails(i);
        if (isActive) {
          deptArray.push({
            id: i,
            name,
            weight: weight.toNumber(),
            memberCount: memberCount.toNumber()
          });
        }
      }

      setDepartments(deptArray);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

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

      if (!formData.departmentId) {
        throw new Error('Please select a department');
      }

      const departmentId = parseInt(formData.departmentId);
      const selectedDepartment = departments.find(dept => dept.id === departmentId);
      
      if (!selectedDepartment) {
        throw new Error('Selected department not found');
      }

      // Check if the address is already a member of the department
      const isMember = await contract.isMemberOfDepartment(departmentId, formData.address);
      if (!isMember) {
        throw new Error('Address is not a member of the selected department. Please add them to the department first.');
      }

      // Register voter
      const tx = await contract.registerVoter(formData.address, departmentId);
      await tx.wait();

      setStatus({
        loading: false,
        error: null,
        success: true
      });

      // Reset form
      setFormData({
        address: '',
        departmentId: ''
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
        <div className={styles.header}>
          <h1 className={styles.title}>Register New Voter</h1>
          <button 
            onClick={() => router.push('/departments')}
            className={styles.departmentsButton}
          >
            Manage Departments
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.formSection}>
            <h2>Register Voter by Department</h2>
            <p className={styles.description}>
              Select a department to register a voter. The voter's weight will be automatically set based on the department's weight.
            </p>

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
                <label htmlFor="departmentId">Department:</label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  required
                  className={styles.select}
                >
                  <option value="">Select a department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} (Weight: {department.weight}, Members: {department.memberCount})
                    </option>
                  ))}
                </select>
              </div>

              {formData.departmentId && (
                <div className={styles.departmentInfo}>
                  <h3>Selected Department Details:</h3>
                  {(() => {
                    const selectedDept = departments.find(dept => dept.id === parseInt(formData.departmentId));
                    return selectedDept ? (
                      <div className={styles.departmentCard}>
                        <p><strong>Name:</strong> {selectedDept.name}</p>
                        <p><strong>Voting Weight:</strong> {selectedDept.weight}</p>
                        <p><strong>Current Members:</strong> {selectedDept.memberCount}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

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
                disabled={status.loading || departments.length === 0}
                className={styles.button}
              >
                {status.loading ? 'Registering...' : 'Register Voter'}
              </button>
            </form>
          </div>

          <div className={styles.infoSection}>
            <h2>How It Works</h2>
            <div className={styles.infoCard}>
              <h3>1. Create Departments</h3>
              <p>First, create departments and assign voting weights to each department based on their importance in your organization.</p>
            </div>
            
            <div className={styles.infoCard}>
              <h3>2. Add Members to Departments</h3>
              <p>Add Ethereum addresses to each department. Members can only be registered as voters if they belong to a department.</p>
            </div>
            
            <div className={styles.infoCard}>
              <h3>3. Register Voters</h3>
              <p>Select a department to register a voter. The voter automatically gets the department's voting weight.</p>
            </div>

            <div className={styles.infoCard}>
              <h3>4. Department Management</h3>
              <p>Use the "Manage Departments" button to create, edit, and manage departments and their members.</p>
            </div>
          </div>
        </div>

        {departments.length === 0 && (
          <div className={styles.emptyState}>
            <h2>No Active Departments</h2>
            <p>You need to create departments before you can register voters.</p>
            <button 
              onClick={() => router.push('/departments')}
              className={styles.createDepartmentButton}
            >
              Create Your First Department
            </button>
          </div>
        )}
      </main>
    </div>
  );
} 