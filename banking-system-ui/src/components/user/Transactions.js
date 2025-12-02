import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  formatCurrency, 
  formatDate, 
  formatTransactionType,
  getTransactionColor,
  formatTransactionAmount 
} from '../../utils/formatters';
import { getUserTransactions } from '../../services/auth';

const Transactions = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'ALL',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setApiError('');

      try {
        const result = await getUserTransactions(user.accountNumber);
        
        if (result.success) {
          setTransactions(result.transactions);
          setFilteredTransactions(result.transactions);
        } else {
          setApiError(result.error || 'Failed to load transactions');
        }
      } catch (error) {
        setApiError('An error occurred while loading transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user.accountNumber]);

  useEffect(() => {
    // Apply filters whenever filters or transactions change
    let filtered = [...transactions];

    // Filter by transaction type
    if (filters.type !== 'ALL') {
      filtered = filtered.filter(tx => tx.transaction_type === filters.type);
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(tx => new Date(tx.created_at) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of the day
      filtered = filtered.filter(tx => new Date(tx.created_at) <= endDate);
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(searchTerm) ||
        (tx.from_account && tx.from_account.includes(searchTerm)) ||
        (tx.to_account && tx.to_account.includes(searchTerm)) ||
        tx.transaction_id.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredTransactions(filtered);
  }, [filters, transactions]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'ALL',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  const getTransactionDirection = (transaction) => {
    if (transaction.transaction_type === 'DEPOSIT') return 'credit';
    if (transaction.transaction_type === 'WITHDRAW') return 'debit';
    
    // For transfers, check if it's incoming or outgoing
    if (transaction.transaction_type === 'TRANSFER') {
      return transaction.to_account === user.accountNumber ? 'credit' : 'debit';
    }
    
    return 'neutral';
  };

  const getTransactionParty = (transaction) => {
    if (transaction.transaction_type === 'DEPOSIT') {
      return 'Cash Deposit';
    }
    if (transaction.transaction_type === 'WITHDRAW') {
      return 'Cash Withdrawal';
    }
    if (transaction.transaction_type === 'TRANSFER') {
      if (transaction.to_account === user.accountNumber) {
        // Money received - show sender's name or fallback to account number
        return `From: ${transaction.from_holder || transaction.from_account || 'Unknown'}`;
      } else {
        // Money sent - show recipient's name or fallback to account number
        return `To: ${transaction.to_holder || transaction.to_account || 'Unknown'}`;
      }
    }
    return transaction.description || 'Transaction';
  };

  if (loading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" message="Loading your transactions..." />
      </div>
    );
  }

  return (
    <div className="transactions-page">
      <div className="dashboard-header">
        <h1>Transaction History</h1>
        <p>View and filter your account transactions</p>
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

      {/* Filters */}
      <div className="card mb-4">
        <h3 style={{ marginBottom: '1.5rem' }}>Filter Transactions</h3>
        <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <select
              className="form-input"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="ALL">All Transactions</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAW">Withdrawals</option>
              <option value="TRANSFER">Transfers</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by description or account..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <small className="text-muted">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </small>
          <button onClick={clearFilters} className="btn btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {filteredTransactions.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem' }}>
            <h3>No transactions found</h3>
            <p className="text-muted">
              {transactions.length === 0 
                ? "You haven't made any transactions yet." 
                : "No transactions match your current filters."}
            </p>
            {transactions.length > 0 && (
              <button onClick={clearFilters} className="btn btn-primary mt-2">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="transactions-list">
            {filteredTransactions.map((transaction) => {
              const direction = getTransactionDirection(transaction);
              const amountClass = direction === 'credit' ? 'text-success' : 'text-danger';
              
              return (
                <div
                  key={transaction.transaction_id}
                  className="transaction-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem',
                    borderBottom: '1px solid #e2e8f0',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                    <div 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: direction === 'credit' ? '#dcfce7' : '#fee2e2',
                        color: direction === 'credit' ? '#166534' : '#991b1b',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      {direction === 'credit' ? 'IN' : 'OUT'}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                            {getTransactionParty(transaction)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatTransactionType(transaction.transaction_type)} • {transaction.description}
                          </div>
                        </div>
                        
                        <div className={amountClass} style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                          {direction === 'credit' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                        {formatDate(transaction.created_at, true)} • 
                        Transaction ID: {transaction.transaction_id}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Summary */}
      {filteredTransactions.length > 0 && (
        <div className="card mt-4">
          <h3 style={{ marginBottom: '1rem' }}>Transaction Summary</h3>
          <div className="grid grid-3">
            <div className="text-center">
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Transactions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{filteredTransactions.length}</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Credits</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                {filteredTransactions.filter(tx => getTransactionDirection(tx) === 'credit').length}
              </div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Debits</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                {filteredTransactions.filter(tx => getTransactionDirection(tx) === 'debit').length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Option */}
      {filteredTransactions.length > 0 && (
        <div className="card mt-4">
          <div style={{ textAlign: 'center' }}>
            <h4>Export Transactions</h4>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Download your transaction history for record keeping
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => {
                // Simple CSV export
                const headers = ['Date', 'Type', 'Description', 'Amount', 'Transaction ID'];
                const csvData = filteredTransactions.map(tx => [
                  formatDate(tx.created_at, true),
                  formatTransactionType(tx.transaction_type),
                  tx.description,
                  formatCurrency(tx.amount),
                  tx.transaction_id
                ]);
                
                const csvContent = [headers, ...csvData]
                  .map(row => row.map(field => `"${field}"`).join(','))
                  .join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions-${user.accountNumber}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
            >
              Export as CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;