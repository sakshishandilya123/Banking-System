import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getUserTransactions, getAccountBalance } from '../../services/auth';

const Dashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [accountStats, setAccountStats] = useState({
    totalBalance: 0,
    lastLogin: '',
    accountAge: ''
  });
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setApiError('');

      try {
        // Load account balance
        const balanceResult = await getAccountBalance(user.accountNumber);
        if (!balanceResult.success) {
          throw new Error(balanceResult.error);
        }

        // Load recent transactions
        const transactionsResult = await getUserTransactions(user.accountNumber);
        if (!transactionsResult.success) {
          throw new Error(transactionsResult.error);
        }

        setRecentTransactions(transactionsResult.transactions.slice(0, 5));
        setAccountStats({
          totalBalance: balanceResult.balance,
          lastLogin: new Date().toISOString(),
          accountAge: calculateAccountAge(user.createdAt)
        });
      } catch (error) {
        setApiError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const calculateAccountAge = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  const getTransactionColor = (type, fromAccount) => {
    switch (type) {
      case 'DEPOSIT': return 'text-success';
      case 'WITHDRAW': return 'text-danger';
      case 'TRANSFER': 
        return fromAccount === user.accountNumber ? 'text-danger' : 'text-success';
      default: return 'text-muted';
    }
  };

  const getTransactionIcon = (type, fromAccount) => {
    switch (type) {
      case 'DEPOSIT': return '⬇️';
      case 'WITHDRAW': return '⬆️';
      case 'TRANSFER': 
        return fromAccount === user.accountNumber ? '↗️' : '↙️';
      default: return '🔹';
    }
  };

  const getTransactionDescription = (transaction) => {
    if (transaction.transaction_type === 'DEPOSIT') {
      return 'Cash Deposit';
    } else if (transaction.transaction_type === 'WITHDRAW') {
      return 'Cash Withdrawal';
    } else if (transaction.transaction_type === 'TRANSFER') {
      if (transaction.from_account === user.accountNumber) {
        return `Transfer to ${transaction.to_account}`;
      } else {
        return `Transfer from ${transaction.from_account}`;
      }
    }
    return transaction.description;
  };

  if (loading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user.holderName}!</h1>
        <p>Here's your account overview</p>
      </div>

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

      {/* Account Summary Cards */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Account Type</h3>
          <div className="amount" style={{ fontSize: '1.5rem' }}>
            {user.accountType || 'SAVINGS'}
          </div>
          <p className="text-muted">{user.status || 'ACTIVE'}</p>
        </div>

        <div className="dashboard-card">
          <h3>Account Age</h3>
          <div className="amount" style={{ fontSize: '1.5rem' }}>
            {accountStats.accountAge}
          </div>
          <p className="text-muted">Since {formatDate(user.createdAt)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mb-4">
        <h2 style={{ marginBottom: '1.5rem' }}>Quick Actions</h2>
        <div className="dashboard-actions">
          <Link to="/transfer" className="btn btn-primary">
            Transfer Money
          </Link>
          <button className="btn btn-secondary" disabled>
            Pay Bills
          </button>
          <Link to="/transactions" className="btn btn-secondary">
            View Transactions
          </Link>
          <Link to="/account" className="btn btn-secondary">
            Account Details
          </Link>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Recent Transactions</h2>
          <Link to="/transactions" className="btn btn-secondary">
            View All
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center" style={{ padding: '2rem' }}>
            <p>No recent transactions found.</p>
            <p className="text-muted">Your transactions will appear here.</p>
          </div>
        ) : (
          <div className="transactions-list">
            {recentTransactions.map(transaction => {
              const isCredit = transaction.transaction_type === 'DEPOSIT' || 
                              (transaction.transaction_type === 'TRANSFER' && transaction.to_account === user.accountNumber);
              const amountClass = getTransactionColor(transaction.transaction_type, transaction.from_account);
              
              return (
                <div
                  key={transaction.transaction_id}
                  className="transaction-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {getTransactionIcon(transaction.transaction_type, transaction.from_account)}
                    </span>
                    <div>
                      <div style={{ fontWeight: '500' }}>
                        {getTransactionDescription(transaction)}
                      </div>
                      <small className="text-muted">
                        {formatDate(transaction.created_at, true)}
                      </small>
                    </div>
                  </div>
                  <div className={amountClass} style={{ fontWeight: '600' }}>
                    {isCredit ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Status */}
      {user.status === 'FROZEN' && (
        <div className="card" style={{ borderLeft: '4px solid #dc2626', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <h3 style={{ color: '#dc2626', margin: 0 }}>Account Frozen</h3>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>
                Your account is currently frozen. Please contact customer support for assistance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Tip */}
      <div className="card mt-4" style={{ borderLeft: '4px solid #3b82f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔒</span>
          <div>
            <h3 style={{ color: '#3b82f6', margin: 0 }}>Security Tip</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>
              Always log out after completing your banking activities, especially on shared devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;