import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import { useWeb3 } from '../hooks/useWeb3';
import styles from '../styles/Departments.module.css';

export default function Departments() {
  const router = useRouter();
  const { contract, account, isAdmin } = useWeb3();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [departmentMembers, setDepartmentMembers] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    weight: ''
  });
  
  const [memberFormData, setMemberFormData] = useState({
    address: ''
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
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentMembers = async (departmentId) => {
    try {
      const [name, weight, isActive, memberCount] = await contract.getDepartmentDetails(departmentId);
      const members = [];

      for (let i = 0; i < memberCount.toNumber(); i++) {
        const memberAddress = await contract.getDepartmentMember(departmentId, i);
        members.push(memberAddress);
      }

      setDepartmentMembers(members);
    } catch (error) {
      console.error('Error loading department members:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberInputChange = (e) => {
    const { name, value } = e.target;
    setMemberFormData(prev => ({
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

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    
    try {
      const weight = parseInt(formData.weight);
      if (isNaN(weight) || weight <= 0) {
        throw new Error('Weight must be a positive number');
      }

      const tx = await contract.createDepartment(formData.name, weight);
      await tx.wait();

      setFormData({ name: '', weight: '' });
      setShowCreateForm(false);
      await loadDepartments();
    } catch (error) {
      console.error('Error creating department:', error);
      alert(error.message || 'Failed to create department');
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    
    try {
      const weight = parseInt(formData.weight);
      if (isNaN(weight) || weight <= 0) {
        throw new Error('Weight must be a positive number');
      }

      const tx = await contract.updateDepartment(selectedDepartment.id, formData.name, weight);
      await tx.wait();

      setFormData({ name: '', weight: '' });
      setShowEditForm(false);
      setSelectedDepartment(null);
      await loadDepartments();
    } catch (error) {
      console.error('Error updating department:', error);
      alert(error.message || 'Failed to update department');
    }
  };

  const handleDeactivateDepartment = async (departmentId) => {
    if (!confirm('Are you sure you want to deactivate this department?')) {
      return;
    }

    try {
      const tx = await contract.deactivateDepartment(departmentId);
      await tx.wait();
      await loadDepartments();
    } catch (error) {
      console.error('Error deactivating department:', error);
      alert(error.message || 'Failed to deactivate department');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    try {
      if (!validateAddress(memberFormData.address)) {
        throw new Error('Invalid Ethereum address');
      }

      const tx = await contract.addMemberToDepartment(selectedDepartment.id, memberFormData.address);
      await tx.wait();

      setMemberFormData({ address: '' });
      setShowAddMemberForm(false);
      await loadDepartmentMembers(selectedDepartment.id);
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberAddress) => {
    if (!confirm('Are you sure you want to remove this member from the department?')) {
      return;
    }

    try {
      const tx = await contract.removeMemberFromDepartment(selectedDepartment.id, memberAddress);
      await tx.wait();
      await loadDepartmentMembers(selectedDepartment.id);
    } catch (error) {
      console.error('Error removing member:', error);
      alert(error.message || 'Failed to remove member');
    }
  };

  const openEditForm = (department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      weight: department.weight.toString()
    });
    setShowEditForm(true);
  };

  const openAddMemberForm = (department) => {
    setSelectedDepartment(department);
    setShowAddMemberForm(true);
    loadDepartmentMembers(department.id);
  };

  if (loading) {
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
        <title>Department Management - Boardroom Voting</title>
        <meta name="description" content="Manage departments and their voting weights" />
      </Head>

      <Header />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Department Management</h1>
          <button 
            onClick={() => setShowCreateForm(true)}
            className={styles.createButton}
          >
            Create New Department
          </button>
        </div>

        {/* Create Department Form */}
        {showCreateForm && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>Create New Department</h2>
              <form onSubmit={handleCreateDepartment} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Department Name:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter department name"
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
                    placeholder="Enter voting weight"
                    min="1"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.button}>
                    Create Department
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateForm(false)}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Department Form */}
        {showEditForm && selectedDepartment && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>Edit Department: {selectedDepartment.name}</h2>
              <form onSubmit={handleUpdateDepartment} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Department Name:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter department name"
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
                    placeholder="Enter voting weight"
                    min="1"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.button}>
                    Update Department
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowEditForm(false)}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Form */}
        {showAddMemberForm && selectedDepartment && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>Add Member to {selectedDepartment.name}</h2>
              <form onSubmit={handleAddMember} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="address">Member Address:</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={memberFormData.address}
                    onChange={handleMemberInputChange}
                    placeholder="0x..."
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.button}>
                    Add Member
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddMemberForm(false)}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {/* Show current members */}
              <div className={styles.membersList}>
                <h3>Current Members ({departmentMembers.length})</h3>
                {departmentMembers.map((member, index) => (
                  <div key={index} className={styles.memberItem}>
                    <span className={styles.memberAddress}>{member}</span>
                    <button 
                      onClick={() => handleRemoveMember(member)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {departmentMembers.length === 0 && (
                  <p className={styles.noMembers}>No members in this department</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Departments List */}
        <div className={styles.departmentsGrid}>
          {departments.map((department) => (
            <div key={department.id} className={styles.departmentCard}>
              <div className={styles.departmentHeader}>
                <h3 className={styles.departmentName}>{department.name}</h3>
                <span className={`${styles.status} ${department.isActive ? styles.active : styles.inactive}`}>
                  {department.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className={styles.departmentInfo}>
                <p><strong>Weight:</strong> {department.weight}</p>
                <p><strong>Members:</strong> {department.memberCount}</p>
              </div>

              <div className={styles.departmentActions}>
                <button 
                  onClick={() => openEditForm(department)}
                  className={styles.editButton}
                  disabled={!department.isActive}
                >
                  Edit
                </button>
                <button 
                  onClick={() => openAddMemberForm(department)}
                  className={styles.membersButton}
                  disabled={!department.isActive}
                >
                  Manage Members
                </button>
                {department.isActive && (
                  <button 
                    onClick={() => handleDeactivateDepartment(department.id)}
                    className={styles.deactivateButton}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {departments.length === 0 && (
          <div className={styles.emptyState}>
            <p>No departments created yet.</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              className={styles.createButton}
            >
              Create Your First Department
            </button>
          </div>
        )}
      </main>
    </div>
  );
} 