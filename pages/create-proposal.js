import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/CreateProposal.module.css';

export default function CreateProposal() {
  const router = useRouter();
  const { contract, isAdmin } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  
  // Set default start time to 10 minutes from now
  const getDefaultStartTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10); // 10 minutes from now
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const [formData, setFormData] = useState({
    description: '',
    options: ['', ''],
    startTime: getDefaultStartTime(),
    duration: '3600', // Default 1 hour
    selectedDepartments: []
  });

  // Load departments on component mount
  useEffect(() => {
    if (contract) {
      loadDepartments();
    }
  }, [contract]);

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
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
      setError('Failed to load departments. Please refresh the page.');
    } finally {
      setLoadingDepartments(false);
    }
  };

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

  const handleDepartmentToggle = (departmentId) => {
    const selectedDepts = [...formData.selectedDepartments];
    const index = selectedDepts.indexOf(departmentId);
    
    if (index > -1) {
      selectedDepts.splice(index, 1);
    } else {
      selectedDepts.push(departmentId);
    }
    
    setFormData({ ...formData, selectedDepartments: selectedDepts });
  };

  const validateForm = () => {
    setError('');
    
    // Check if start time is in the future
    const startTime = new Date(formData.startTime);
    const now = new Date();
    
    if (startTime <= now) {
      setError('Start time must be in the future. Please select a time at least 1 minute from now.');
      return false;
    }

    // Check if description is provided
    if (!formData.description.trim()) {
      setError('Please provide a proposal description.');
      return false;
    }

    // Check if at least 2 options are provided
    const validOptions = formData.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('Please provide at least 2 options.');
      return false;
    }

    // Check if at least one department is selected
    if (formData.selectedDepartments.length === 0) {
      setError('Please select at least one department to participate in this proposal.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !isAdmin) return;

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const startTimestamp = Math.floor(new Date(formData.startTime).getTime() / 1000);
      
      // Get current blockchain time
      const currentBlock = await contract.provider.getBlock('latest');
      const currentBlockTime = currentBlock.timestamp;
      
      // If the set start time is in the past, use current blockchain time instead
      const finalStartTime = startTimestamp <= currentBlockTime ? currentBlockTime : startTimestamp;
      
      console.log('Creating proposal:');
      console.log('Requested start time:', startTimestamp);
      console.log('Current blockchain time:', currentBlockTime);
      console.log('Final start time:', finalStartTime);
      
      // Debug the parameters being sent
      const description = formData.description;
      const options = formData.options.filter(opt => opt.trim() !== '');
      const duration = Number(formData.duration);
      const selectedDepts = formData.selectedDepartments;
      
      const tx = await contract.createProposal(
        description,
        options,
        finalStartTime,
        duration,
        selectedDepts
      );
      
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');
      router.push('/');
    } catch (error) {
      console.error('Error creating proposal:', error);
      
      // Try to extract more detailed error information
      let errorMessage = 'Failed to create proposal. Please check your inputs and try again.';
      
      if (error.error && error.error.data && error.error.data.message) {
        errorMessage = `Contract Error: ${error.error.data.message}`;
      } else if (error.reason) {
        errorMessage = `Error: ${error.reason}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
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

  if (loadingDepartments) {
    return (
      <div className={styles.container}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading departments...</div>
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

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

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
            <label>Participating Departments</label>
            <div className={styles.departmentsList}>
              {departments.map((department) => (
                <div key={department.id} className={styles.departmentItem}>
                  <label className={styles.departmentCheckbox}>
                    <input
                      type="checkbox"
                      checked={formData.selectedDepartments.includes(department.id)}
                      onChange={() => handleDepartmentToggle(department.id)}
                    />
                    <span className={styles.departmentInfo}>
                      <strong>{department.name}</strong>
                      <span className={styles.departmentDetails}>
                        Weight: {department.weight} | Members: {department.memberCount}
                      </span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
            <small>Select which departments can vote on this proposal. All members of selected departments will be automatically registered as voters.</small>
          </div>

          <div className={styles.field}>
            <label>Start Time (must be in the future)</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
              min={new Date().toISOString().slice(0, 16)}
            />
            <small>Default is set to 10 minutes from now</small>
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
            <small>Minimum 300 seconds (5 minutes)</small>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || departments.length === 0}
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
        </form>

        {departments.length === 0 && (
          <div className={styles.noDepartments}>
            <h3>No Active Departments</h3>
            <p>You need to create departments before you can create proposals.</p>
            <button 
              onClick={() => router.push('/departments')}
              className={styles.createDepartmentButton}
            >
              Create Departments
            </button>
          </div>
        )}
      </main>
    </div>
  );
} 