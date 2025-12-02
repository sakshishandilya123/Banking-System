import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getSystemStatistics, getAllAccounts } from '../../services/auth';

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [timeRange, setTimeRange] = useState('MONTH');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setApiError('');

      try {
        // Load system statistics
        const statsResult = await getSystemStatistics();
        if (!statsResult.success) {
          throw new Error(statsResult.error);
        }

        // Load accounts for additional stats
        const accountsResult = await getAllAccounts();
        if (!accountsResult.success) {
          throw new Error(accountsResult.error);
        }

        setStats(statsResult.statistics);
        setAccounts(accountsResult.accounts);

        // Calculate additional statistics from accounts
        calculateAdditionalStats(accountsResult.accounts, statsResult.statistics);
      } catch (error) {
        setApiError(error.message || 'Failed to load system statistics');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [timeRange]);

  const calculateAdditionalStats = (accountsData, baseStats) => {
    if (!accountsData.length) return;

    // Calculate balance distribution
    const balanceDistribution = {
      '0-1000': 0,
      '1000-5000': 0,
      '5000-10000': 0,
      '10000+': 0
    };

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalTransfers = 0;

    accountsData.forEach(account => {
      const balance = parseFloat(account.balance);
      
      if (balance <= 1000) balanceDistribution['0-1000']++;
      else if (balance <= 5000) balanceDistribution['1000-5000']++;
      else if (balance <= 10000) balanceDistribution['5000-10000']++;
      else balanceDistribution['10000+']++;
    });

    // Update stats with calculated values
    setStats(prev => ({
      ...prev,
      balanceDistribution,
      averageBalance: baseStats.totalBalance / baseStats.totalAccounts,
      savingsAccounts: accountsData.filter(acc => acc.account_type === 'SAVINGS').length,
      currentAccounts: accountsData.filter(acc => acc.account_type === 'CURRENT').length
    }));
  };

  const getPercentage = (part, total) => {
    return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
  };

  const renderProgressBar = (percentage, color = '#2563eb') => {
    return (
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        overflow: 'hidden',
        marginTop: '4px'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '4px',
          transition: 'width 0.3s ease'
        }} />
      </div>
    );
  };

  const renderChartBar = (value, max, label, color = '#2563eb') => {
    const percentage = (value / max) * 100;
    return (
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.875rem' }}>{label}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{value}</span>
        </div>
        {renderProgressBar(percentage, color)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" message="Loading system statistics..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center" style={{ padding: '3rem' }}>
        <h3>Unable to load statistics</h3>
        <p>Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="system-stats">
      <div className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>System Statistics</h1>
            <p>Real-time banking system performance and analytics</p>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
            <select
              className="form-input"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="WEEK">Last Week</option>
              <option value="MONTH">Last Month</option>
              <option value="QUARTER">Last Quarter</option>
              <option value="YEAR">Last Year</option>
            </select>
          </div>
        </div>
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

      {/* Overview Cards */}
      <div className="grid grid-4" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Accounts</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b' }}>
            {stats.totalAccounts.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Active: {stats.activeAccounts} | Frozen: {stats.frozenAccounts}
          </div>
        </div>

        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Balance</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b' }}>
            {formatCurrency(stats.totalBalance)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Avg: {formatCurrency(stats.averageBalance || 0)}
          </div>
        </div>

        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Account Types</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
            {stats.savingsAccounts || 0} / {stats.currentAccounts || 0}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Savings / Current
          </div>
        </div>

        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Transactions</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b' }}>
            {stats.weekTransactions?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            This {timeRange.toLowerCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
        {/* Account Statistics */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Account Statistics</h3>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Active Accounts</span>
                <span style={{ fontWeight: '600' }}>
                  {stats.activeAccounts} ({getPercentage(stats.activeAccounts, stats.totalAccounts)}%)
                </span>
              </div>
              {renderProgressBar(getPercentage(stats.activeAccounts, stats.totalAccounts), '#10b981')}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Frozen Accounts</span>
                <span style={{ fontWeight: '600' }}>
                  {stats.frozenAccounts} ({getPercentage(stats.frozenAccounts, stats.totalAccounts)}%)
                </span>
              </div>
              {renderProgressBar(getPercentage(stats.frozenAccounts, stats.totalAccounts), '#f59e0b')}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Savings Accounts</span>
                <span style={{ fontWeight: '600' }}>
                  {stats.savingsAccounts || 0} ({getPercentage(stats.savingsAccounts, stats.totalAccounts)}%)
                </span>
              </div>
              {renderProgressBar(getPercentage(stats.savingsAccounts, stats.totalAccounts), '#3b82f6')}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Current Accounts</span>
                <span style={{ fontWeight: '600' }}>
                  {stats.currentAccounts || 0} ({getPercentage(stats.currentAccounts, stats.totalAccounts)}%)
                </span>
              </div>
              {renderProgressBar(getPercentage(stats.currentAccounts, stats.totalAccounts), '#8b5cf6')}
            </div>
          </div>

          {stats.balanceDistribution && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <h4 style={{ marginBottom: '1rem' }}>Balance Distribution</h4>
              {renderChartBar(stats.balanceDistribution['0-1000'], stats.totalAccounts, '₹0 - ₹1,000', '#ef4444')}
              {renderChartBar(stats.balanceDistribution['1000-5000'], stats.totalAccounts, '₹1,000 - ₹5,000', '#f59e0b')}
              {renderChartBar(stats.balanceDistribution['5000-10000'], stats.totalAccounts, '₹5,000 - ₹10,000', '#3b82f6')}
              {renderChartBar(stats.balanceDistribution['10000+'], stats.totalAccounts, '₹10,000+', '#10b981')}
            </div>
          )}
        </div>

        {/* Transaction Statistics */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Transaction Analysis</h3>
          
          <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="text-center" style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                {stats.todayTransactions?.toLocaleString() || '0'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Today</div>
            </div>

            <div className="text-center" style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0369a1' }}>
                {stats.weekTransactions?.toLocaleString() || '0'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>This Week</div>
            </div>

            <div className="text-center" style={{ padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>
                {stats.activeAccounts?.toLocaleString() || '0'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Active Users</div>
            </div>

            <div className="text-center" style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#475569' }}>
                {stats.totalAccounts - stats.activeAccounts}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Inactive/Frozen</div>
            </div>
          </div>

          {/* Recent Activity Summary */}
          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '1rem' }}>System Health</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.5rem',
                  fontSize: '1.25rem'
                }}>
                  ✅
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>System</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Operational
                </div>
              </div>

              <div>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.5rem',
                  fontSize: '1.25rem'
                }}>
                  💾
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>Database</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Connected
                </div>
              </div>

              <div>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.5rem',
                  fontSize: '1.25rem'
                }}>
                  🔄
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>API</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Running
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="card mt-4">
        <h3 style={{ marginBottom: '1rem' }}>Financial Summary</h3>
        <div className="grid grid-3">
          <div className="text-center">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Total Assets</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
              {formatCurrency(stats.totalBalance)}
            </div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Average Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
              {formatCurrency(stats.averageBalance || 0)}
            </div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Active Rate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
              {getPercentage(stats.activeAccounts, stats.totalAccounts)}%
            </div>
          </div>
        </div>
      </div>

      {/* Data Last Updated */}
      <div className="text-center mt-4">
        <small style={{ color: '#6b7280' }}>
          Data last updated: {formatDate(new Date().toISOString(), true)}
        </small>
      </div>
    </div>
  );
};

export default SystemStats;