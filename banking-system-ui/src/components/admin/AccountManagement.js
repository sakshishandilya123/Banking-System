import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  formatCurrency, 
  formatDate, 
  formatAccountType,
  getStatusBadgeClass,
  formatPhoneNumber 
} from '../../utils/formatters';
import { getAllAccounts, updateAccountStatus, getAccountDetails } from '../../services/auth';

const AccountManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      setApiError('');

      try {
        const result = await getAllAccounts();
        
        if (result.success) {
          setAccounts(result.accounts);
          setFilteredAccounts(result.accounts);
        } else {
          setApiError(result.error || 'Failed to load accounts');
        }
      } catch (error) {
        setApiError('An error occurred while loading accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  useEffect(() => {
    // Apply filters whenever search term or filters change
    let filtered = [...accounts];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(account =>
        account.account_number.toLowerCase().includes(term) ||
        account.holder_name.toLowerCase().includes(term) ||
        account.email.toLowerCase().includes(term) ||
        account.phone.includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(account => account.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(account => account.account_type === typeFilter);
    }

    setFilteredAccounts(filtered);
  }, [searchTerm, statusFilter, typeFilter, accounts]);

  const handleViewAccount = async (account) => {
    setActionLoading(true);
    try {
      const result = await getAccountDetails(account.account_number);
      if (result.success) {
        setSelectedAccount(result.account);
        setShowAccountModal(true);
      } else {
        setApiError(result.error || 'Failed to load account details');
      }
    } catch (error) {
      setApiError('Failed to load account details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (account) => {
    setActionLoading(true);
    setApiError('');
    
    try {
      const newStatus = account.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
      const result = await updateAccountStatus(account.account_number, newStatus);
      
      if (result.success) {
        // Update local state
        const updatedAccounts = accounts.map(acc =>
          acc.account_number === account.account_number
            ? { ...acc, status: newStatus }
            : acc
        );
        
        setAccounts(updatedAccounts);
        
        // Update selected account if it's the same
        if (selectedAccount && selectedAccount.account_number === account.account_number) {
          setSelectedAccount({ ...selectedAccount, status: newStatus });
        }
      } else {
        setApiError(result.error || 'Failed to update account status');
      }
    } catch (error) {
      setApiError('Failed to update account status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badgeClass = getStatusBadgeClass(status);
    return (
      <span 
        className={`badge ${badgeClass}`}
        style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}
      >
        {status}
      </span>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  };

  if (loading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" message="Loading accounts..." />
      </div>
    );
  }

  return (
    <div className="account-management">
      <div className="dashboard-header">
        <h1>Account Management</h1>
        <p>Manage and monitor all banking accounts</p>
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

      {/* Filters and Search */}
      <div className="card mb-4">
        <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Search Accounts</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, account number, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status Filter</label>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="FROZEN">Frozen</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select
              className="form-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="SAVINGS">Savings</option>
              <option value="CURRENT">Current</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <small className="text-muted">
            Showing {filteredAccounts.length} of {accounts.length} accounts
          </small>
          <button onClick={clearFilters} className="btn btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card">
        {filteredAccounts.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem' }}>
            <h3>No accounts found</h3>
            <p className="text-muted">
              {accounts.length === 0 
                ? "No accounts available in the system." 
                : "No accounts match your current filters."}
            </p>
            {accounts.length > 0 && (
              <button onClick={clearFilters} className="btn btn-primary mt-2">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Account No</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Holder Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Phone</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Balance</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Last Activity</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr 
                    key={account.account_number}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    className="table-row"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '1rem', fontWeight: '600', fontFamily: 'monospace' }}>
                      {account.account_number}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>
                      {account.holder_name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {account.email}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {formatPhoneNumber(account.phone)}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>
                      {formatCurrency(account.balance)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {formatAccountType(account.account_type)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getStatusBadge(account.status)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {account.last_activity ? formatDate(account.last_activity, true) : 'Never'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleViewAccount(account)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          disabled={actionLoading}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleToggleStatus(account)}
                          className={`btn ${account.status === 'ACTIVE' ? 'btn-warning' : 'btn-success'}`}
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          disabled={actionLoading}
                        >
                          {account.status === 'ACTIVE' ? 'Freeze' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Details Modal */}
      {showAccountModal && selectedAccount && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Account Details</h2>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <strong>Account Number:</strong>
                <p style={{ fontFamily: 'monospace' }}>{selectedAccount.account_number}</p>
              </div>
              <div>
                <strong>Holder Name:</strong>
                <p>{selectedAccount.holder_name}</p>
              </div>
              <div>
                <strong>Email:</strong>
                <p>{selectedAccount.email}</p>
              </div>
              <div>
                <strong>Phone:</strong>
                <p>{formatPhoneNumber(selectedAccount.phone)}</p>
              </div>
              <div>
                <strong>Account Type:</strong>
                <p>{formatAccountType(selectedAccount.account_type)}</p>
              </div>
              <div>
                <strong>Status:</strong>
                <p>{getStatusBadge(selectedAccount.status)}</p>
              </div>
              <div>
                <strong>Current Balance:</strong>
                <p>{formatCurrency(selectedAccount.balance)}</p>
              </div>
              <div>
                <strong>IFSC Code:</strong>
                <p>{selectedAccount.ifsc}</p>
              </div>
              <div>
                <strong>Account Created:</strong>
                <p>{formatDate(selectedAccount.created_at)}</p>
              </div>
              <div>
                <strong>Last Activity:</strong>
                <p>{selectedAccount.last_activity ? formatDate(selectedAccount.last_activity, true) : 'Never'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleToggleStatus(selectedAccount)}
                className={`btn ${selectedAccount.status === 'ACTIVE' ? 'btn-warning' : 'btn-success'}`}
                disabled={actionLoading}
              >
                {selectedAccount.status === 'ACTIVE' ? 'Freeze Account' : 'Activate Account'}
              </button>
              <button
                onClick={() => setShowAccountModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Loading Overlay */}
      {actionLoading && (
        <div className="loading-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
            <LoadingSpinner size="medium" message="Processing action..." />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;