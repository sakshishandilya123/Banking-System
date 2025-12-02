import React, { useState } from 'react';
//import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import { validateTransfer } from '../../utils/validators';
import { validateAccount, transferMoney } from '../../services/auth';

const Transfer = ({ user }) => {
  const [formData, setFormData] = useState({
    toAccount: '',
    amount: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transferDetails, setTransferDetails] = useState(null);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [showCheckBalanceModal, setShowCheckBalanceModal] = useState(false);
  const [insufficientAmount, setInsufficientAmount] = useState(0);
  const [verificationMethod, setVerificationMethod] = useState('password');
  const [balancePassword, setBalancePassword] = useState('');
  const [balanceOTP, setBalanceOTP] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [balanceOTPTimer, setBalanceOTPTimer] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [transferPassword, setTransferPassword] = useState('');
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  //const navigate = useNavigate();

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
    if (apiError) setApiError('');
    if (success) setSuccess('');
    
    // Clear recipient info when account number changes
    if (name === 'toAccount' && recipientInfo) {
      setRecipientInfo(null);
    }
  };

  const validateRecipientAccount = async () => {
    if (!formData.toAccount.trim()) {
      setErrors(prev => ({ ...prev, toAccount: 'Account number is required' }));
      return;
    }

    setValidating(true);
    setApiError('');

    try {
      const result = await validateAccount(formData.toAccount);
      
      if (result.success) {
        setRecipientInfo(result.account);
        setErrors(prev => ({ ...prev, toAccount: '' }));
      } else {
        setRecipientInfo(null);
        setErrors(prev => ({ ...prev, toAccount: result.error }));
      }
    } catch (error) {
      setRecipientInfo(null);
      setErrors(prev => ({ ...prev, toAccount: 'Failed to validate account' }));
    } finally {
      setValidating(false);
    }
  };

  const validateForm = () => {
    const validation = validateTransfer(user.accountNumber, formData.toAccount, formData.amount);
    
    const newErrors = { ...validation.errors };

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Check if amount exceeds balance
    if (parseFloat(formData.amount) > user.balance) {
      const insufficientBy = parseFloat(formData.amount) - user.balance;
      setInsufficientAmount(insufficientBy);
      setShowCheckBalanceModal(true);
      return false;
    }

    // Check if recipient account is validated
    if (!recipientInfo) {
      newErrors.toAccount = 'Please validate recipient account first';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendBalanceOTP = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
        setBalanceOTPTimer(600);
        setVerificationError('');
      } else {
        setVerificationError('Failed to send OTP');
      }
    } catch (error) {
      setVerificationError('Error sending OTP');
    }
  };

  const handleVerifyBalancePassword = () => {
    if (!balancePassword) {
      setVerificationError('Please enter your password');
      return;
    }

    fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountNumber: user.accountNumber,
        password: balancePassword
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setShowBalance(true);
          setVerificationError('');
          setBalancePassword('');
        } else {
          setVerificationError('Incorrect password');
        }
      })
      .catch(error => {
        setVerificationError('Error verifying password');
      });
  };

  const handleVerifyBalanceOTP = async () => {
    if (!balanceOTP) {
      setVerificationError('Please enter OTP');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          otp: balanceOTP,
          purpose: 'BALANCE_VERIFICATION'
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowBalance(true);
        setVerificationError('');
        setBalanceOTP('');
      } else {
        setVerificationError('Invalid OTP');
      }
    } catch (error) {
      setVerificationError('Error verifying OTP');
    }
  };

  React.useEffect(() => {
    if (balanceOTPTimer > 0) {
      const interval = setTimeout(() => setBalanceOTPTimer(balanceOTPTimer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [balanceOTPTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setTransferDetails({
      fromAccount: user.accountNumber,
      toAccount: formData.toAccount,
      recipientName: recipientInfo.holderName,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: new Date().toISOString()
    });

    setShowConfirmation(true);
  };

  const handleConfirmTransfer = async () => {
    // First show password verification modal
    setShowPasswordVerification(true);
    setTransferPassword('');
    setPasswordError('');
  };

  const handlePasswordVerification = async () => {
    if (!transferPassword) {
      setPasswordError('Password is required');
      return;
    }

    setLoading(true);
    setPasswordError('');

    try {
      const result = await transferMoney(
        user.accountNumber,
        formData.toAccount,
        formData.amount,
        formData.description,
        transferPassword
      );

      if (result.success) {
        setSuccess(`Successfully transferred ${formatCurrency(transferDetails.amount)} to ${result.recipientName}`);
        setShowConfirmation(false);
        setShowPasswordVerification(false);
        setFormData({
          toAccount: '',
          amount: '',
          description: ''
        });
        setTransferDetails(null);
        setRecipientInfo(null);
        setTransferPassword('');

        // Update user balance in parent component
        // This would typically be handled by refreshing user data
        setTimeout(() => {
          window.location.reload(); // Simple refresh to update balance
        }, 2000);

      } else {
        setPasswordError(result.error || 'Transfer failed. Please try again.');
      }
    } catch (error) {
      setPasswordError('An error occurred during transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransfer = () => {
    setShowConfirmation(false);
    setTransferDetails(null);
  };

  const handleCancelPasswordVerification = () => {
    setShowPasswordVerification(false);
    setTransferPassword('');
    setPasswordError('');
  };

  return (
    <div className="transfer-page">
      <div className="dashboard-header">
        <h1>Transfer Money</h1>
        <p>Send money to another account securely</p>
      </div>

      <div className="grid grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Transfer Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>New Transfer</h3>

          {success && (
            <div className="success-message mb-4" style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              {success}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setSuccess('');
                    setFormData({ toAccount: '', amount: '', description: '' });
                    setRecipientInfo(null);
                  }} 
                  className="btn btn-primary"
                >
                  New Transfer
                </button>
              </div>
            </div>
          )}

          {apiError && (
            <div className="error-message mb-4" style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="toAccount" className="form-label">
                Recipient Account Number *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  id="toAccount"
                  name="toAccount"
                  className={`form-input ${errors.toAccount ? 'error' : ''}`}
                  placeholder="Enter recipient's account number"
                  value={formData.toAccount}
                  onChange={handleChange}
                  disabled={loading || showConfirmation}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={validateRecipientAccount}
                  className="btn btn-secondary"
                  disabled={validating || !formData.toAccount.trim() || loading || showConfirmation}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {validating ? 'Validating...' : 'Validate'}
                </button>
              </div>
              {errors.toAccount && (
                <div className="error-message">{errors.toAccount}</div>
              )}
              
              {recipientInfo && (
                <div className="success-message" style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '4px' }}>
                  ✅ Account validated: {recipientInfo.holderName}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="amount" className="form-label">
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                className={`form-input ${errors.amount ? 'error' : ''}`}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                disabled={loading || showConfirmation}
              />
              {errors.amount && (
                <div className="error-message">{errors.amount}</div>
              )}
              <small style={{ display: 'block', marginTop: '5px', color: '#6b7280' }}>
                Available balance: {formatCurrency(user.balance)}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description *
              </label>
              <input
                type="text"
                id="description"
                name="description"
                className={`form-input ${errors.description ? 'error' : ''}`}
                placeholder="e.g., Rent payment, Gift, etc."
                value={formData.description}
                onChange={handleChange}
                disabled={loading || showConfirmation}
              />
              {errors.description && (
                <div className="error-message">{errors.description}</div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || showConfirmation || !recipientInfo}
              style={{ width: '100%' }}
            >
              Continue to Review
            </button>
          </form>
        </div>

        {/* Account Summary & Transfer Confirmation */}
        <div>
          {/* Account Summary */}
          <div className="card mb-4">
            <h3 style={{ marginBottom: '1rem' }}>Account Summary</h3>
            <div style={{ lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Account Number:</span>
                <strong>{user.accountNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Account Holder:</span>
                <strong>{user.holderName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Current Balance:</span>
                <strong>*****</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Account Type:</span>
                <strong>{user.accountType}</strong>
              </div>
            </div>
          </div>

          {/* Transfer Confirmation */}
          {showConfirmation && transferDetails && (
            <div className="card" style={{ border: '2px solid #2563eb' }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#2563eb' }}>Confirm Transfer</h3>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💸</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                    {formatCurrency(transferDetails.amount)}
                  </div>
                </div>

                <div style={{ lineHeight: '1.8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>From:</span>
                    <strong>{user.accountNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>To:</span>
                    <strong>{transferDetails.toAccount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Recipient:</span>
                    <strong>{transferDetails.recipientName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Description:</span>
                    <strong>{transferDetails.description}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span>New Balance:</span>
                    <strong>{formatCurrency(user.balance - transferDetails.amount)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleConfirmTransfer}
                  className="btn btn-success"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? <LoadingSpinner size="small" message="" /> : 'Confirm Transfer'}
                </button>
                <button
                  onClick={handleCancelTransfer}
                  className="btn btn-secondary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '8px' }}>
                <small style={{ color: '#92400e' }}>
                  ⚠️ Once confirmed, this transfer cannot be reversed. Please verify all details before confirming.
                </small>
              </div>
            </div>
          )}

          {/* Transfer Guidelines */}
          <div className="card">
            <h4 style={{ marginBottom: '1rem' }}>Transfer Guidelines</h4>
            <ul style={{ paddingLeft: '1.5rem', color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.6' }}>
              <li>Transfers are processed instantly during banking hours</li>
              <li>Always validate recipient account before transferring</li>
              <li>Maximum transfer limit: $10,000 per transaction</li>
              <li>Transfers cannot be canceled once confirmed</li>
              <li>Keep your transaction reference for records</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Insufficient Balance Modal */}
      {showCheckBalanceModal && (
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
            {!showBalance ? (
              <>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#dc2626' }}>Insufficient Balance</h2>
                <p style={{ marginBottom: '1rem', color: '#6b7280', lineHeight: '1.6' }}>
                  You need <strong>{formatCurrency(insufficientAmount)} more</strong> to complete this transfer.
                </p>
                <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
                  Verify your identity to check your current balance.
                </p>

                {verificationError && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                  }}>
                    {verificationError}
                  </div>
                )}

                {/* Verification Method Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => {
                      setVerificationMethod('password');
                      setVerificationError('');
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: verificationMethod === 'password' ? '#007bff' : '#e5e7eb',
                      color: verificationMethod === 'password' ? 'white' : '#374151',
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
                      setVerificationMethod('otp');
                      setVerificationError('');
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: verificationMethod === 'otp' ? '#007bff' : '#e5e7eb',
                      color: verificationMethod === 'otp' ? 'white' : '#374151',
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
                {verificationMethod === 'password' && (
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
                          setVerificationError('');
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
                        onClick={() => setShowCheckBalanceModal(false)}
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
                {verificationMethod === 'otp' && (
                  <div>
                    {!otpSent ? (
                      <div>
                        <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                          We'll send an OTP to {user.email}
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
                              setVerificationError('');
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
                              setShowCheckBalanceModal(false);
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
              </>
            ) : (
              <>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#059669' }}>Your Current Balance</h2>
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>Available Balance</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>
                    {formatCurrency(user.balance)}
                  </p>
                </div>
                <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
                  You need <strong>{formatCurrency(insufficientAmount)} more</strong> to complete your transfer.
                </p>
                <button
                  onClick={() => {
                    setShowCheckBalanceModal(false);
                    setShowBalance(false);
                    setBalancePassword('');
                    setBalanceOTP('');
                    setOtpSent(false);
                    setVerificationError('');
                  }}
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
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transfer Password Verification Modal */}
      {showPasswordVerification && (
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
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>Verify Your Password</h2>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280', lineHeight: '1.6' }}>
              To confirm this transfer of <strong>{formatCurrency(transferDetails?.amount)}</strong> to <strong>{transferDetails?.recipientName}</strong>, please enter your password.
            </p>

            {passwordError && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {passwordError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="transferPassword" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="transferPassword"
                value={transferPassword}
                onChange={(e) => {
                  setTransferPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordVerification()}
                placeholder="Enter your account password"
                disabled={loading}
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

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={handlePasswordVerification}
                disabled={loading || !transferPassword}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: loading || !transferPassword ? '#cbd5e1' : '#007bff',
                  color: loading || !transferPassword ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading || !transferPassword ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {loading ? <LoadingSpinner size="small" message="" /> : 'Verify & Transfer'}
              </button>
              <button
                onClick={handleCancelPasswordVerification}
                disabled={loading}
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
        </div>
      )}
    </div>
  );
};

export default Transfer;