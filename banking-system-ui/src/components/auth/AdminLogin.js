import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { adminLogin } from '../../services/auth';

const AdminLogin = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const result = await adminLogin(formData.username, formData.password);
      
      if (result.success) {
        onLogin(result.admin, true);
        navigate('/admin');
      } else {
        setApiError(result.error || 'Admin login failed. Please try again.');
      }
    } catch (error) {
      setApiError('An error occurred during admin login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <div className="login-header">
          <h1>Admin Login</h1>
          <p>Access the banking system administration panel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="Enter admin username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.username && (
              <div className="error-message">{errors.username}</div>
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
              placeholder="Enter admin password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.password && (
              <div className="error-message">{errors.password}</div>
            )}
          </div>

          {apiError && (
            <div className="error-message mb-4">{apiError}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? <LoadingSpinner size="small" message="" /> : 'Admin Login'}
          </button>
        </form>

        <div className="login-options">
          <Link to="/login" className="btn btn-secondary">
            User Login
          </Link>
          <Link to="/create-account" className="btn btn-secondary">
            Create Account
          </Link>
        </div>

        <div className="text-center mt-4">
          <small className="text-muted">
            Default Admin Credentials: username: "admin", password: "admin"
          </small>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;