import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getSystemStatistics, getAllTransactions, getAllAccounts } from '../../services/auth';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setApiError('');

      try {
        // Load system statistics
        const statsResult = await getSystemStatistics();
        if (!statsResult.success) {
          throw new Error(statsResult.error);
        }

        // Load recent transactions
        const transactionsResult = await getAllTransactions();
        if (!transactionsResult.success) {
          throw new Error(transactionsResult.error);
        }

        // Load accounts for alerts
        const accountsResult = await getAllAccounts();
        if (!accountsResult.success) {
          throw new Error(accountsResult.error);
        }

        const statistics = statsResult.statistics;
        const transactions = transactionsResult.transactions;
        const accounts = accountsResult.accounts;

        // Process recent activity from transactions
        const activity = transactions.slice(0, 5).map(transaction => ({
          id: transaction.transaction_id,
          type: 'TRANSACTION',
          description: `${formatTransactionType(transaction.transaction_type)}: ${formatCurrency(transaction.amount)}`,
          timestamp: transaction.created_at,
          account: transaction.from_account || transaction.to_account
        }));

        // Generate system alerts based on real data
        const alerts = [];
        
        // Check for frozen accounts
        const frozenAccounts = accounts.filter(acc => acc.status === 'FROZEN');
        if (frozenAccounts.length > 0) {
          alerts.push({
            id: 'alert_frozen',
            type: 'WARNING',
            title: 'Frozen Accounts',
            description: `${frozenAccounts.length} account(s) are currently frozen`,
            timestamp: new Date().toISOString(),
            priority: 'medium'
          });
        }

        // Check for low balance accounts
        const lowBalanceAccounts = accounts.filter(acc => acc.balance < 10);
        if (lowBalanceAccounts.length > 0) {
          alerts.push({
            id: 'alert_low_balance',
            type: 'INFO',
            title: 'Low Balance Accounts',
            description: `${lowBalanceAccounts.length} account(s) have low balance (< $10)`,
            timestamp: new Date().toISOString(),
            priority: 'low'
          });
        }

        // System health alert
        alerts.push({
          id: 'alert_system',
          type: 'SUCCESS',
          title: 'System Running',
          description: 'All systems operational',
          timestamp: new Date().toISOString(),
          priority: 'low'
        });

        setStats(statistics);
        setRecentActivity(activity);
        setSystemAlerts(alerts);
      } catch (error) {
        setApiError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatTransactionType = (type) => {
    const typeMap = {
      'DEPOSIT': 'Deposit',
      'WITHDRAW': 'Withdrawal',
      'TRANSFER': 'Transfer'
    };
    return typeMap[type] || type;
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'WARNING': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      case 'SUCCESS': return '#10b981';
      case 'ERROR': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'WARNING': return '⚠️';
      case 'INFO': return 'ℹ️';
      case 'SUCCESS': return '✅';
      case 'ERROR': return '❌';
      default: return '🔔';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'ACCOUNT_CREATED': return '🆕';
      case 'ACCOUNT_UPDATED': return '✏️';
      case 'TRANSACTION': return '💸';
      case 'SYSTEM': return '⚙️';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" message="Loading admin dashboard..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center" style={{ padding: '3rem' }}>
        <h3>Unable to load dashboard</h3>
        <p>{apiError || 'Please try again later.'}</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>System overview and management</p>
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

      {/* System Statistics Cards */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Total Accounts</h3>
          <div className="amount" style={{ fontSize: '2.5rem' }}>
            {stats.totalAccounts.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ color: '#059669', fontSize: '0.875rem' }}>
              ↑ {stats.activeAccounts} active
            </span>
            <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
              ↓ {stats.frozenAccounts} frozen
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Total Balance</h3>
          <div className="amount">{formatCurrency(stats.totalBalance)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Today: {stats.todayTransactions} tx
            </span>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Week: {stats.weekTransactions} tx
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Transactions</h3>
          <div className="amount" style={{ fontSize: '2rem' }}>
            {stats.weekTransactions}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Today: {stats.todayTransactions}
            </span>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              This week: {stats.weekTransactions}
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>System Status</h3>
          <div className="amount" style={{ fontSize: '1.5rem', color: '#059669' }}>
            Online
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Database connected
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mb-4">
        <h2 style={{ marginBottom: '1.5rem' }}>Quick Actions</h2>
        <div className="dashboard-actions">
          <Link to="/admin/accounts" className="btn btn-primary">
            Manage Accounts
          </Link>
          <Link to="/admin/stats" className="btn btn-secondary">
            View Statistics
          </Link>
          <Link to="/admin/transactions" className="btn btn-secondary">
            All Transactions
          </Link>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '2rem' }}>
        {/* System Alerts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>System Alerts</h3>
            <span className="badge" style={{ 
              backgroundColor: '#ef4444', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '12px',
              fontSize: '0.75rem'
            }}>
              {systemAlerts.length} Active
            </span>
          </div>

          {systemAlerts.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem' }}>
              <p>No active alerts. System is running smoothly.</p>
            </div>
          ) : (
            <div className="alerts-list">
              {systemAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="alert-item"
                  style={{
                    padding: '1rem',
                    borderLeft: `4px solid ${getAlertColor(alert.type)}`,
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {getAlertIcon(alert.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{alert.title}</h4>
                        <small style={{ color: '#6b7280' }}>
                          {formatDate(alert.timestamp, true)}
                        </small>
                      </div>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Recent Activity</h3>
            <Link to="/admin/transactions" className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '8px 16px' }}>
              View All
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem' }}>
              <p>No recent activity to display.</p>
            </div>
          ) : (
            <div className="activity-list">
              {recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="activity-item"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>
                    {getActivityIcon(activity.type)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      {activity.description}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <small style={{ color: '#6b7280' }}>
                        Account: {activity.account}
                      </small>
                      <small style={{ color: '#9ca3af' }}>
                        {formatDate(activity.timestamp, true)}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="card mt-4">
        <h3 style={{ marginBottom: '1.5rem' }}>System Health</h3>
        <div className="grid grid-3">
          <div className="text-center">
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              border: '3px solid #22c55e'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>A+</span>
            </div>
            <div style={{ fontWeight: '600' }}>Database</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{stats.totalAccounts} accounts</div>
          </div>

          <div className="text-center">
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              border: '3px solid #3b82f6'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>A</span>
            </div>
            <div style={{ fontWeight: '600' }}>Transactions</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{stats.weekTransactions} this week</div>
          </div>

          <div className="text-center">
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              border: '3px solid #f59e0b'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>B+</span>
            </div>
            <div style={{ fontWeight: '600' }}>Performance</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Running optimally</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;