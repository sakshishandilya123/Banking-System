import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { createAccount, sendRegistrationOTP, verifyRegistrationOTP } from '../../services/auth';
import { validateAccountCreation, isValidOTP } from '../../utils/validators';

const CreateAccount = () => {
  const [formData, setFormData] = useState({
    holderName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    accountType: 'SAVINGS',
    initialDeposit: '',
    password: '',
    confirmPassword: ''
  });
  const [otpStep, setOtpStep] = useState('initial'); // 'initial', 'otp-sent', 'verified'
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');
  const [generatedDetails, setGeneratedDetails] = useState(null);
  const [otpTimer, setOtpTimer] = useState(0);

  const navigate = useNavigate();

  // OTP timer countdown
  React.useEffect(() => {
    if (otpTimer > 0) {
      const interval = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [otpTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for account type to ensure uppercase
    const processedValue = name === 'accountType' ? value.toUpperCase() : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (apiError) setApiError('');
    if (success) setSuccess('');
    if (generatedDetails) setGeneratedDetails(null);
  };

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Validate email first
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const result = await sendRegistrationOTP(formData.email);
      
      if (result.success) {
        setOtpStep('otp-sent');
        setOtp('');
        setErrors({});
        setOtpTimer(600); // 10 minutes
        setSuccess('OTP sent to your email! Please check your inbox.');
      } else {
        setApiError(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      setApiError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const result = await verifyRegistrationOTP(formData.email, otp);
      
      if (result.success) {
        setOtpStep('verified');
        setOtp('');
        setErrors({});
        setSuccess('Email verified successfully! Now you can create your account.');
        setOtpTimer(0);
      } else {
        setApiError(result.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      setApiError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setApiError('');

    try {
      const result = await sendRegistrationOTP(formData.email);
      
      if (result.success) {
        setOtp('');
        setErrors({});
        setSuccess('New OTP sent to your email!');
        setOtpTimer(600); // 10 minutes
      } else {
        setApiError(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      setApiError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only allow submission if email is verified
    if (otpStep !== 'verified') {
      setApiError('Please verify your email with OTP before creating account');
      return;
    }
    
    // Check if email has been verified
    if (otpStep !== 'verified') {
      setApiError('Please verify your email with OTP before creating account');
      return;
    }
    
    // Validate form data
    const validation = validateAccountCreation(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      // Prepare data for API
      const accountData = {
        holderName: formData.holderName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || null,
        address: formData.address || null,
        accountType: formData.accountType,
        initialDeposit: parseFloat(formData.initialDeposit),
        password: formData.password
      };

      const result = await createAccount(accountData);
      
      if (result.success) {
        setSuccess('Account created successfully!');
        setGeneratedDetails({
          accountNumber: result.accountNumber,
          ifsc: result.ifsc || 'Auto-generated',
          holderName: result.holderName || formData.holderName,
          email: result.email || formData.email,
          phone: result.phone || formData.phone
        });
        setErrors({});
        setFormData({
          holderName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          address: '',
          accountType: 'SAVINGS',
          initialDeposit: '',
          password: '',
          confirmPassword: ''
        });
        setOtpStep('initial');
      } else {
        setApiError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      setApiError('An error occurred while creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card">
          <div className="login-header">
            <h1>Create New Account</h1>
            <p>Open a new banking account with us</p>
          </div>

          {success && generatedDetails && (
            <div className="success-message mb-4" style={{ 
              padding: '1.5rem', 
              backgroundColor: '#f0fdf4', 
              borderRadius: '8px',
              border: '1px solid #bbf7d0'
            }}>
              <h3 style={{ color: '#059669', marginBottom: '1rem' }}>🎉 Account Created Successfully!</h3>
              <div style={{ lineHeight: '1.8', marginBottom: '1rem' }}>
                <div><strong>Account Number:</strong> {generatedDetails.accountNumber}</div>
                <div><strong>IFSC Code:</strong> {generatedDetails.ifsc}</div>
                <div><strong>Holder Name:</strong> {generatedDetails.holderName}</div>
                <div><strong>Email:</strong> {generatedDetails.email}</div>
                <div><strong>Phone:</strong> {generatedDetails.phone}</div>
                <div><strong>Account Type:</strong> {formData.accountType}</div>
                <div><strong>Initial Deposit:</strong> ₹{parseFloat(formData.initialDeposit).toFixed(2)}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px', marginTop: '1rem' }}>
                <strong>Important:</strong> Please save your account number. You will need it to login.
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button 
                  onClick={() => navigate('/login')} 
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Login Here
                </button>
              </div>
            </div>
          )}

          {!generatedDetails && (
            <div style={{ width: '100%' }}>
              {/* Account Details Form - ALWAYS VISIBLE */}
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>

              <div className="form-group">
                <label htmlFor="holderName" className="form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="holderName"
                  name="holderName"
                  className={`form-input ${errors.holderName ? 'error' : ''}`}
                  placeholder="Enter your full name as per ID proof"
                  value={formData.holderName}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.holderName && (
                  <div className="error-message">{errors.holderName}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="10-digit phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.phone && (
                  <div className="error-message">{errors.phone}</div>
                )}
                <small style={{ display: 'block', marginTop: '5px', color: '#6b7280' }}>
                  Must be unique - not used for any other account
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth" className="form-label">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  className={`form-input ${errors.dateOfBirth ? 'error' : ''}`}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.dateOfBirth && (
                  <div className="error-message">{errors.dateOfBirth}</div>
                )}
              </div>

              {/* Email field moved below Date of Birth */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address * {otpStep === 'verified' && <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ Verified</span>}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ flex: 1 }}
                  />
                  {otpStep === 'initial' && (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={loading || !formData.email}
                      className="btn btn-secondary"
                      style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  )}
                </div>
                {errors.email && (
                  <div className="error-message">{errors.email}</div>
                )}
                <small style={{ display: 'block', marginTop: '5px', color: '#6b7280' }}>
                  Must be unique - not used for any other account
                </small>

                {/* OTP Input */}
                {otpStep === 'otp-sent' && (
                  <div style={{ marginTop: '1rem' }}>
                    <label htmlFor="otp" className="form-label">
                      Enter OTP (6 digits)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        id="otp"
                        className={`form-input ${errors.otp ? 'error' : ''}`}
                        placeholder="000000"
                        value={otp}
                        onChange={handleOTPChange}
                        disabled={loading}
                        maxLength="6"
                        style={{ flex: 1, letterSpacing: '0.2em', fontSize: '1.2em' }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOTP}
                        disabled={loading || otp.length !== 6}
                        className="btn btn-primary"
                        style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                      >
                        {loading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                    {errors.otp && (
                      <div className="error-message">{errors.otp}</div>
                    )}
                    <small style={{ display: 'block', marginTop: '8px', color: '#6b7280' }}>
                      {otpTimer > 0 ? (
                        <>
                          OTP expires in: {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}
                          {' | '}
                          <button
                            type="button"
                            onClick={handleResendOTP}
                            disabled={loading}
                            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                          >
                            Resend OTP
                          </button>
                        </>
                      ) : otpStep === 'otp-sent' ? (
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={loading}
                          style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                          Resend OTP
                        </button>
                      ) : null}
                    </small>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="address" className="form-label">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  className={`form-input ${errors.address ? 'error' : ''}`}
                  placeholder="Enter your residential address"
                  rows="3"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading}
                  style={{ resize: 'vertical' }}
                />
                {errors.address && (
                  <div className="error-message">{errors.address}</div>
                )}
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label htmlFor="accountType" className="form-label">
                    Account Type *
                  </label>
                  <select
                    id="accountType"
                    name="accountType"
                    className={`form-input ${errors.accountType ? 'error' : ''}`}
                    value={formData.accountType}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CURRENT">Current Account</option>
                  </select>
                  {errors.accountType && (
                    <div className="error-message">{errors.accountType}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="initialDeposit" className="form-label">
                    Initial Deposit *
                  </label>
                  <input
                    type="number"
                    id="initialDeposit"
                    name="initialDeposit"
                    className={`form-input ${errors.initialDeposit ? 'error' : ''}`}
                    placeholder="0.00"
                    min="100"
                    step="0.01"
                    value={formData.initialDeposit}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.initialDeposit && (
                    <div className="error-message">{errors.initialDeposit}</div>
                  )}
                  <small style={{ display: 'block', marginTop: '5px', color: '#6b7280' }}>
                    Minimum deposit: ₹100.00
                  </small>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Create strong password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.password && (
                    <div className="error-message">{errors.password}</div>
                  )}
                  <small style={{ display: 'block', marginTop: '5px', color: '#6b7280' }}>
                    Must include uppercase, lowercase, number, and symbol
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.confirmPassword && (
                    <div className="error-message">{errors.confirmPassword}</div>
                  )}
                </div>
              </div>

              {/* Auto-generated fields info */}
              <div className="card" style={{ backgroundColor: '#f8fafc', marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>Auto-generated Information</h4>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                  Your account number and IFSC code will be automatically generated and displayed after successful account creation.
                </p>
              </div>

              {apiError && (
                <div className="error-message mb-4">{apiError}</div>
              )}

              {success && otpStep === 'otp-sent' && (
                <div className="success-message mb-4" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', padding: '1rem', borderRadius: '4px' }}>
                  {success}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || otpStep !== 'verified'}
                style={{ width: '100%' }}
                title={otpStep !== 'verified' ? 'Please verify your email first' : ''}
              >
                {loading ? <LoadingSpinner size="small" message="" /> : 'Create Account'}
              </button>
              </form>

              {/* Show message if email not verified yet */}
              {otpStep !== 'verified' && (
                <div style={{ padding: '1rem', backgroundColor: '#e7f5ff', borderRadius: '6px', marginTop: '1rem', textAlign: 'center', color: '#0056b3' }}>
                  <p style={{ margin: 0 }}>Please verify your email with OTP to continue</p>
                </div>
              )}

              {apiError && otpStep !== 'verified' && (
                <div className="error-message mb-4" style={{ marginTop: '1rem' }}>{apiError}</div>
              )}
            </div>
          )}

          {!success && (
            <div className="text-center mt-4">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="btn btn-secondary" style={{ display: 'inline-block', marginLeft: '10px' }}>
                  Login Here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;