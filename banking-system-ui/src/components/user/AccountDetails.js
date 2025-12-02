import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  formatCurrency, 
  formatDate, 
  formatPhoneNumber,
  formatAccountType,
  getStatusBadgeClass 
} from '../../utils/formatters';

const AccountDetails = ({ user }) => {
  const [accountDetails, setAccountDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceVerificationMethod, setBalanceVerificationMethod] = useState('password'); // 'password' or 'otp'
  const [balancePassword, setBalancePassword] = useState('');
  const [balanceOTP, setBalanceOTP] = useState('');
  const [balanceVerificationError, setBalanceVerificationError] = useState('');
  const [showBalance, setShowBalance] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [balanceOTPTimer, setBalanceOTPTimer] = useState(0);

  useEffect(() => {
    // Fetch account details from user data (already loaded from login)
    const fetchAccountDetails = async () => {
      setLoading(true);
      
      // Mock API delay (in real app, would fetch from backend)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use user data that was already loaded during login
      const details = {
        ...user,
        ifsc: user.ifsc || 'SBIN0000123',
        branch: 'Main Branch',
        openedDate: user.createdAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: user.lastActivity || new Date().toISOString(),
        monthlyTransactions: 15,
        averageBalance: user.balance || 0,
        interestRate: user.accountType === 'SAVINGS' ? '3.5%' : '1.2%',
        overdraftLimit: user.accountType === 'CURRENT' ? 5000.00 : 0
      };
      
      setAccountDetails(details);
      setFormData({
        email: details.email,
        phone: details.phone,
        address: details.address || '',
        dateOfBirth: details.dateOfBirth || ''
      });
      setLoading(false);
    };

    fetchAccountDetails();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSendBalanceOTP = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountDetails.email })
      });
      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
        setBalanceOTPTimer(600); // 10 minutes
        setBalanceVerificationError('');
      } else {
        setBalanceVerificationError('Failed to send OTP');
      }
    } catch (error) {
      setBalanceVerificationError('Error sending OTP');
    }
  };

  const handleVerifyBalancePassword = () => {
    if (!balancePassword) {
      setBalanceVerificationError('Please enter your password');
      return;
    }

    // Verify password by checking with login endpoint
    fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountNumber: accountDetails.accountNumber,
        password: balancePassword
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setShowBalance(true);
          setBalanceVerificationError('');
          setBalancePassword('');
          setShowBalanceModal(false);
        } else {
          setBalanceVerificationError('Incorrect password');
        }
      })
      .catch(error => {
        setBalanceVerificationError('Error verifying password');
      });
  };

  const handleVerifyBalanceOTP = async () => {
    if (!balanceOTP) {
      setBalanceVerificationError('Please enter OTP');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountDetails.email,
          otp: balanceOTP,
          purpose: 'BALANCE_VERIFICATION'
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowBalance(true);
        setBalanceVerificationError('');
        setBalanceOTP('');
        setOtpSent(false);
        setBalanceOTPTimer(0);
        setShowBalanceModal(false);
      } else {
        setBalanceVerificationError('Invalid OTP');
      }
    } catch (error) {
      setBalanceVerificationError('Error verifying OTP');
    }
  };

  // OTP timer countdown
  React.useEffect(() => {
    if (balanceOTPTimer > 0) {
      const interval = setTimeout(() => setBalanceOTPTimer(balanceOTPTimer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [balanceOTPTimer]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Address validation
    if (!formData.address || formData.address.trim().length < 10) {
      newErrors.address = 'Please enter a complete address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      // Simulate API call to update account details
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update local state with new data
      setAccountDetails(prev => ({
        ...prev,
        ...formData
      }));

      setSuccess('Account details updated successfully!');
      setEditMode(false);

      // In a real app, we would update the user context or global state here
    } catch (error) {
      setApiError('Failed to update account details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      email: accountDetails.email,
      phone: accountDetails.phone,
      address: accountDetails.address
    });
    setErrors({});
    setEditMode(false);
    setApiError('');
  };

  const getStatusBadge = (status) => {
    const badgeClass = getStatusBadgeClass(status);
    return (
      <span 
        className={`badge ${badgeClass}`}
        style={{
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}
      >
        {status}
      </span>
    );
  };

  if (loading && !accountDetails) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" message="Loading account details..." />
      </div>
    );
  }

  if (!accountDetails) {
    return (
      <div className="text-center" style={{ padding: '3rem' }}>
        <h3>Account not found</h3>
        <p>Unable to load account details. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="account-details-page">
      <div className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Account Details</h1>
            <p>Manage your account information and preferences</p>
          </div>
          {/* {!editMode && (
            <button 
              onClick={() => setEditMode(true)}
              className="btn btn-primary"
            >
              Edit Details
            </button>
          )} */}
        </div>
      </div>

      {success && (
        <div className="success-message mb-4" style={{ 
          padding: '1rem', 
          backgroundColor: '#f0fdf4', 
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          {success}
        </div>
      )}

      {apiError && (
        <div className="error-message mb-4" style={{ 
          padding: '1rem', 
          backgroundColor: '#fef2f2', 
          borderRadius: '8px',
          border: '1px solid #fecaca'
        }}>
          {apiError}
        </div>
      )}

      <div className="grid grid-2" style={{ gap: '2rem' }}>
        {/* Account Information */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Account Information</h3>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Account Number</span>
              <span style={{ fontWeight: '600' }}>{accountDetails.accountNumber}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Account Holder</span>
              <span style={{ fontWeight: '600' }}>{accountDetails.holderName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Account Type</span>
              <span style={{ fontWeight: '600' }}>{formatAccountType(accountDetails.accountType)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Current Balance</span>
              {showBalance ? (
                <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{formatCurrency(accountDetails.balance)}</span>
              ) : (
                <button
                  onClick={() => setShowBalanceModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                >
                  Check Balance
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Account Status</span>
              {getStatusBadge(accountDetails.status)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>IFSC Code</span>
              <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{accountDetails.ifsc}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Branch</span>
              <span style={{ fontWeight: '600' }}>{accountDetails.branch}</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Contact Information</h3>
          
          {editMode ? (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.phone && <div className="error-message">{errors.phone}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  className={`form-input ${errors.dateOfBirth ? 'error' : ''}`}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.dateOfBirth && <div className="error-message">{errors.dateOfBirth}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  name="address"
                  className={`form-input ${errors.address ? 'error' : ''}`}
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading}
                  rows="3"
                  style={{ resize: 'vertical' }}
                />
                {errors.address && <div className="error-message">{errors.address}</div>}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSave}
                  className="btn btn-success"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? <LoadingSpinner size="small" message="" /> : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: '500', color: '#64748b' }}>Date of Birth</span>
                <span style={{ fontWeight: '600' }}>{accountDetails.dateOfBirth ? formatDate(accountDetails.dateOfBirth) : 'Not provided'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: '500', color: '#64748b' }}>Email</span>
                <span style={{ fontWeight: '600' }}>{accountDetails.email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: '500', color: '#64748b' }}>Phone</span>
                <span style={{ fontWeight: '600' }}>{formatPhoneNumber(accountDetails.phone)}</span>
              </div>

              <div>
                <span style={{ fontWeight: '500', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Address</span>
                <span style={{ fontWeight: '600', lineHeight: '1.5' }}>{accountDetails.address || 'Not provided'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Account Statistics */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Account Statistics</h3>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Account Opened</span>
              <span style={{ fontWeight: '600' }}>{formatDate(accountDetails.openedDate)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Last Activity</span>
              <span style={{ fontWeight: '600' }}>{formatDate(accountDetails.lastActivity, true)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Monthly Transactions</span>
              <span style={{ fontWeight: '600' }}>{accountDetails.monthlyTransactions}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Average Balance</span>
              <span style={{ fontWeight: '600' }}>**********</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '500', color: '#64748b' }}>Interest Rate</span>
              <span style={{ fontWeight: '600' }}>{accountDetails.interestRate}</span>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Additional Information</h3>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {accountDetails.overdraftLimit > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: '500', color: '#64748b' }}>Overdraft Limit</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(accountDetails.overdraftLimit)}</span>
              </div>
            )}

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>Account Features</h4>
              <ul style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.6', margin: 0, paddingLeft: '1.25rem' }}>
                <li>Online banking access</li>
                <li>Mobile banking app</li>
                <li>Debit card facilities</li>
                <li>24/7 customer support</li>
                <li>Free email statements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="card mt-4" style={{ borderLeft: '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔒</span>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>Security Notice</h4>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
              For your security, some account details can only be changed by visiting your branch or contacting customer support. 
              Always keep your login credentials confidential and never share them with anyone.
            </p>
          </div>
        </div>
      </div>

      {/* Balance Verification Modal */}
      {showBalanceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Verify Identity</h2>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>Choose a verification method to view your balance</p>

            {balanceVerificationError && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {balanceVerificationError}
              </div>
            )}

            {/* Verification Method Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => {
                  setBalanceVerificationMethod('password');
                  setBalanceVerificationError('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: balanceVerificationMethod === 'password' ? '#007bff' : '#e5e7eb',
                  color: balanceVerificationMethod === 'password' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Password
              </button>
              <button
                onClick={() => {
                  setBalanceVerificationMethod('otp');
                  setBalanceVerificationError('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: balanceVerificationMethod === 'otp' ? '#007bff' : '#e5e7eb',
                  color: balanceVerificationMethod === 'otp' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Email OTP
              </button>
            </div>

            {/* Password Verification */}
            {balanceVerificationMethod === 'password' && (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Enter Your Password
                  </label>
                  <input
                    type="password"
                    value={balancePassword}
                    onChange={(e) => {
                      setBalancePassword(e.target.value);
                      setBalanceVerificationError('');
                    }}
                    placeholder="Enter password"
                    onKeyPress={(e) => e.key === 'Enter' && handleVerifyBalancePassword()}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={handleVerifyBalancePassword}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setShowBalanceModal(false)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: '#e5e7eb',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* OTP Verification */}
            {balanceVerificationMethod === 'otp' && (
              <div>
                {!otpSent ? (
                  <div>
                    <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                      We'll send an OTP to {accountDetails.email}
                    </p>
                    <button
                      onClick={handleSendBalanceOTP}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                    >
                      Send OTP
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                        Enter OTP (6 digits)
                      </label>
                      <input
                        type="text"
                        value={balanceOTP}
                        onChange={(e) => {
                          setBalanceOTP(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setBalanceVerificationError('');
                        }}
                        placeholder="000000"
                        maxLength="6"
                        onKeyPress={(e) => e.key === 'Enter' && handleVerifyBalanceOTP()}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                          letterSpacing: '0.1em'
                        }}
                      />
                      <small style={{ display: 'block', marginTop: '0.5rem', color: '#6b7280' }}>
                        OTP expires in: {Math.floor(balanceOTPTimer / 60)}:{String(balanceOTPTimer % 60).padStart(2, '0')}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button
                        onClick={handleVerifyBalanceOTP}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => {
                          setShowBalanceModal(false);
                          setOtpSent(false);
                          setBalanceOTP('');
                          setBalanceOTPTimer(0);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetails;