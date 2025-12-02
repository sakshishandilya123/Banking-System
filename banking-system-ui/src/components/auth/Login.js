import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { userLogin, sendLoginOTP, verifyLoginOTP } from '../../services/auth';
import { validateLogin, validateOTPLogin } from '../../utils/validators';

const Login = ({ onLogin }) => {
  // Unified state for login
  const [formData, setFormData] = useState({ accountNumber: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  
  const navigate = useNavigate();

  // Password Login Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    const validation = validateLogin(formData.accountNumber, formData.password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const result = await userLogin(formData.accountNumber, formData.password);
      
      if (result.success) {
        // Password is correct, now send OTP
        const otpResult = await sendLoginOTP(formData.accountNumber);
        if (otpResult.success) {
          setOtpSent(true);
          setOtp('');
          setOtpEmail(otpResult.email);
          setErrors({});
          setApiError('');
        } else {
          setApiError(otpResult.error || 'Failed to send OTP. Please try again.');
        }
      } else {
        setApiError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      setApiError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
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
      const result = await verifyLoginOTP(formData.accountNumber, otp);
      
      if (result.success) {
        onLogin(result.user, false);
        navigate('/dashboard');
      } else {
        setApiError(result.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      setApiError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="login-header">
          <h1>User Login</h1>
          <p>Access your banking account</p>
        </div>

        <form onSubmit={otpSent ? handleVerifyOTP : handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="accountNumber" className="form-label">
              Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              name="accountNumber"
              className={`form-input ${errors.accountNumber ? 'error' : ''}`}
              placeholder="Enter your account number"
              value={formData.accountNumber}
              onChange={handleChange}
              disabled={loading || otpSent}
            />
            {errors.accountNumber && (
              <div className="error-message">{errors.accountNumber}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading || otpSent}
            />
            {errors.password && (
              <div className="error-message">{errors.password}</div>
            )}
          </div>

          {apiError && (
            <div className="error-message mb-4">{apiError}</div>
          )}

          {!otpSent && (
            <>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? <LoadingSpinner size="small" message="" /> : 'Login with Password & OTP'}
              </button>
            </>
          )}

          {otpSent && (
            <>
              <div style={{ backgroundColor: '#f0f7ff', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <p style={{ margin: 0, color: '#0056b3', fontSize: '0.9rem' }}>
                  OTP has been sent to <strong>{otpEmail}</strong>
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="otp" className="form-label">
                  Enter OTP (6 digits)
                </label>
                <input
                  type="text"
                  id="otp"
                  className={`form-input ${errors.otp ? 'error' : ''}`}
                  placeholder="000000"
                  value={otp}
                  onChange={handleOTPInputChange}
                  disabled={loading}
                  maxLength="6"
                  style={{ letterSpacing: '0.2em', fontSize: '1.2em' }}
                />
                {errors.otp && (
                  <div className="error-message">{errors.otp}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || otp.length !== 6}
                style={{ width: '100%', marginBottom: '0.5rem' }}
              >
                {loading ? <LoadingSpinner size="small" message="" /> : 'Verify OTP & Login'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => { setOtpSent(false); setOtp(''); setErrors({}); setApiError(''); }}
              >
                Cancel OTP
              </button>
            </>
          )}
        </form>

        <div className="login-options" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <Link to="/create-account" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
            Create Account
          </Link>
          <Link to="/admin-login" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
            Admin Login
          </Link>
        </div>

        <div className="text-center mt-4">
          <small className="text-muted">
            OTP will be sent to your registered email address
          </small>
        </div>
      </div>
    </div>
  );
};

export default Login;