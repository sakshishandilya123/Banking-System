import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ currentUser, isAdmin, onLogout }) => {
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-content">
          <Link to="/" className="logo">
            SecureBank
          </Link>
          
          <div className="nav-links">
            {!currentUser && !isAdmin ? (
              <>
                <Link 
                  to="/login" 
                  className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                >
                  User Login
                </Link>
                <Link 
                  to="/admin-login" 
                  className={`nav-link ${location.pathname === '/admin-login' ? 'active' : ''}`}
                >
                  Admin Login
                </Link>
                <Link 
                  to="/create-account" 
                  className={`nav-link ${location.pathname === '/create-account' ? 'active' : ''}`}
                >
                  Create Account
                </Link>
              </>
            ) : isAdmin ? (
              <>
                <Link 
                  to="/admin" 
                  className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/admin/accounts" 
                  className={`nav-link ${location.pathname === '/admin/accounts' ? 'active' : ''}`}
                >
                  Manage Accounts
                </Link>
                <Link 
                  to="/admin/stats" 
                  className={`nav-link ${location.pathname === '/admin/stats' ? 'active' : ''}`}
                >
                  Statistics
                </Link>
                <Link 
                  to="/admin/transactions" 
                  className={`nav-link ${location.pathname === '/admin/transactions' ? 'active' : ''}`}
                >
                  All Transactions
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/dashboard" 
                  className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/transfer" 
                  className={`nav-link ${location.pathname === '/transfer' ? 'active' : ''}`}
                >
                  Transfer
                </Link>
                <Link 
                  to="/transactions" 
                  className={`nav-link ${location.pathname === '/transactions' ? 'active' : ''}`}
                >
                  Transactions
                </Link>
                <Link 
                  to="/account" 
                  className={`nav-link ${location.pathname === '/account' ? 'active' : ''}`}
                >
                  Account
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;