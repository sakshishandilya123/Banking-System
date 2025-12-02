import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  formatCurrency, 
  formatDate, 
  formatTransactionType
} from '../../utils/formatters';
import { getAllTransactions, getAllAccounts, rollbackTransaction } from '../../services/auth';

const AllTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    accountNumber: 'ALL',
    type: 'ALL',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [apiError, setApiError] = useState('');
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackMessage, setRollbackMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setApiError('');

      try {
        // Load all transactions
        const transactionsResult = await getAllTransactions();
        if (!transactionsResult.success) {
          throw new Error(transactionsResult.error);
        }

        // Load accounts for filter dropdown
        const accountsResult = await getAllAccounts();
        if (!accountsResult.success) {
          throw new Error(accountsResult.error);
        }

        setTransactions(transactionsResult.transactions);
        setFilteredTransactions(transactionsResult.transactions);
        setAccounts(accountsResult.accounts);
      } catch (error) {
        setApiError(error.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Apply filters whenever filters or transactions change
    let filtered = [...transactions];

    // Filter by account number
    if (filters.accountNumber !== 'ALL') {
      filtered = filtered.filter(tx => 
        tx.from_account === filters.accountNumber || 
        tx.to_account === filters.accountNumber
      );
    }

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
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => new Date(tx.created_at) <= endDate);
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.transaction_id.toLowerCase().includes(searchTerm) ||
        tx.description.toLowerCase().includes(searchTerm) ||
        (tx.from_holder && tx.from_holder.toLowerCase().includes(searchTerm)) ||
        (tx.to_holder && tx.to_holder.toLowerCase().includes(searchTerm)) ||
        (tx.from_account && tx.from_account.includes(searchTerm)) ||
        (tx.to_account && tx.to_account.includes(searchTerm))
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, transactions]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const openRollbackModal = (transaction) => {
    if (transaction.transaction_type !== 'TRANSFER') {
      setRollbackMessage('Only TRANSFER transactions can be rolled back.');
      setTimeout(() => setRollbackMessage(''), 5000);
      return;
    }

    setSelectedTransaction(transaction);
    setRollbackReason('');
    setRollbackLoading(false);
    setShowRollbackModal(true);
  };

  const closeRollbackModal = () => {
    setShowRollbackModal(false);
    setSelectedTransaction(null);
    setRollbackReason('');
    setRollbackMessage('');
  };

  const handleRollbackConfirm = async () => {
    if (!rollbackReason.trim()) {
      setRollbackMessage('Reason is required for rollback.');
      return;
    }

    setRollbackLoading(true);
    setRollbackMessage('');

    try {
      const result = await rollbackTransaction(selectedTransaction.transaction_id, rollbackReason);
      
      if (result.success) {
        setRollbackMessage(`✓ Transaction rolled back successfully!\nSender balance: ${formatCurrency(result.fromBalance)}\nRecipient balance: ${formatCurrency(result.toBalance)}`);
        
        // Refresh transactions
        const transactionsResult = await getAllTransactions();
        if (transactionsResult.success) {
          setTransactions(transactionsResult.transactions);
          setFilteredTransactions(transactionsResult.transactions);
        }

        // Close modal after 2 seconds
        setTimeout(() => {
          closeRollbackModal();
        }, 2000);
      } else {
        setRollbackMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setRollbackMessage(`Error: ${error.message || 'Failed to rollback transaction'}`);
    } finally {
      setRollbackLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      accountNumber: 'ALL',
      type: 'ALL',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  const getTransactionDirection = (transaction) => {
    if (transaction.transaction_type === 'DEPOSIT') return 'credit';
    if (transaction.transaction_type === 'WITHDRAW') return 'debit';
    return 'transfer';
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate a well formatted PDF of the current filtered transactions
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const title = 'All_Transactions_' + new Date().toISOString().slice(0,19).replace(/[:T]/g, '_') + '.pdf';

      // Columns for the PDF table
      const columns = [
        { header: 'Transaction ID', dataKey: 'transaction_id' },
        { header: 'Type', dataKey: 'type' },
        { header: 'From', dataKey: 'from' },
        { header: 'To', dataKey: 'to' },
        { header: 'Amount', dataKey: 'amount' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Date & Time', dataKey: 'date' }
      ];

      // Map transactions into rows
      const rows = filteredTransactions.map(tx => ({
        transaction_id: tx.transaction_id,
        type: formatTransactionType(tx.transaction_type),
        from: tx.from_account || 'N/A',
        to: tx.to_account || 'N/A',
        amount: formatCurrency(tx.amount),
        description: tx.description || '',
        date: formatDate(tx.created_at, true)
      }));

      // Add title
      doc.setFontSize(14);
      doc.text('All Transactions Report', 40, 50);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);

      // Use autoTable for table formatting
      doc.autoTable({
        startY: 90,
        head: [columns.map(c => c.header)],
        body: rows.map(r => columns.map(c => r[c.dataKey])),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [24, 85, 173], textColor: 255, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 90 }, // transaction id
          1: { cellWidth: 50 },
          2: { cellWidth: 80 },
          3: { cellWidth: 80 },
          4: { cellWidth: 60, halign: 'right' },
          5: { cellWidth: 160 },
          6: { cellWidth: 100 }
        },
        didDrawPage: (data) => {
          // footer with page number
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(9);
          const page = doc.internal.getCurrentPageInfo().pageNumber;
          doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 20);
        }
      });

      doc.save(title);
    } catch (err) {
      console.error('Error generating PDF', err);
      setApiError('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" message="Loading all transactions..." />
      </div>
    );
  }

  return (
    <div className="all-transactions">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>All Transactions</h1>
          <p style={{ margin: 0 }}>Monitor and manage all system transactions</p>
        </div>
        <div>
          <button onClick={handleDownloadPDF} className="btn btn-primary">
            Download PDF
          </button>
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

      {/* Summary Cards */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '2rem' }}>
        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Transactions</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
            {filteredTransactions.length.toLocaleString()}
          </div>
        </div>

        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Deposits</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
            {filteredTransactions.filter(tx => tx.transaction_type === 'DEPOSIT').length.toLocaleString()}
          </div>
        </div>

        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Withdrawals</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
            {filteredTransactions.filter(tx => tx.transaction_type === 'WITHDRAW').length.toLocaleString()}
          </div>
        </div>

        <div className="card text-center">
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Transfers</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>
            {filteredTransactions.filter(tx => tx.transaction_type === 'TRANSFER').length.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <h3 style={{ marginBottom: '1.5rem' }}>Filter Transactions</h3>
        <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Account Number</label>
            <select
              className="form-input"
              value={filters.accountNumber}
              onChange={(e) => handleFilterChange('accountNumber', e.target.value)}
            >
              <option value="ALL">All Accounts</option>
              {accounts.map(account => (
                <option key={account.account_number} value={account.account_number}>
                  {account.account_number} - {account.holder_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <select
              className="form-input"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAW">Withdrawals</option>
              <option value="TRANSFER">Transfers</option>
            </select>
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

        <div className="form-group">
          <label className="form-label">Search</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by ID, description, account number, or holder name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
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

      {/* Transactions Table */}
      <div className="card">
        {filteredTransactions.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem' }}>
            <h3>No transactions found</h3>
            <p className="text-muted">
              {transactions.length === 0 
                ? "No transactions available in the system." 
                : "No transactions match your current filters."}
            </p>
            {transactions.length > 0 && (
              <button onClick={clearFilters} className="btn btn-primary mt-2">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Transaction ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>From Account</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>To Account</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Date & Time</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map((transaction) => {
                    const direction = getTransactionDirection(transaction);
                    const amountColor = direction === 'credit' ? '#059669' : '#dc2626';
                    
                    return (
                      <tr 
                        key={transaction.transaction_id}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                        className="table-row"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {transaction.transaction_id.substring(0, 8)}...
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {formatTransactionType(transaction.transaction_type)}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {transaction.from_account ? (
                            <div>
                              <div style={{ fontFamily: 'monospace' }}>{transaction.from_account}</div>
                              {transaction.from_holder && (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {transaction.from_holder}
                                </div>
                              )}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {transaction.to_account ? (
                            <div>
                              <div style={{ fontFamily: 'monospace' }}>{transaction.to_account}</div>
                              {transaction.to_holder && (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {transaction.to_holder}
                                </div>
                              )}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '600', color: amountColor }}>
                          {direction === 'credit' && transaction.transaction_type === 'TRANSFER' && transaction.to_account ? '+' : ''}
                          {direction === 'debit' && '-'}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td style={{ padding: '1rem', maxWidth: '200px' }}>
                          <div style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            maxWidth: '200px'
                          }}>
                            {transaction.description}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {formatDate(transaction.created_at, true)}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {transaction.transaction_type === 'TRANSFER' && (
                            <button
                              onClick={() => openRollbackModal(transaction)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                            >
                              Rollback
                            </button>
                          )}
                          {transaction.transaction_type !== 'TRANSFER' && (
                            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem',
                borderTop: '1px solid #e2e8f0'
              }}>
                <div>
                  <small className="text-muted">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTransactions.length)} of {filteredTransactions.length} entries
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px' }}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`btn ${currentPage === pageNumber ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '8px 12px', minWidth: '40px' }}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rollback Modal */}
      {showRollbackModal && (
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
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#1e293b' }}>Rollback Transaction</h2>
            
            {selectedTransaction && (
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Transaction ID:</strong> {selectedTransaction.transaction_id.substring(0, 12)}...
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>From:</strong> {selectedTransaction.from_account} ({selectedTransaction.from_holder})
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>To:</strong> {selectedTransaction.to_account} ({selectedTransaction.to_holder})
                </div>
                <div>
                  <strong>Amount:</strong> {formatCurrency(selectedTransaction.amount)}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Reason for Rollback</label>
              <textarea
                className="form-input"
                placeholder="Enter reason (e.g., Wrong account recipient, User request, etc.)"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                disabled={rollbackLoading}
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
            </div>

            {rollbackMessage && (
              <div style={{
                backgroundColor: rollbackMessage.startsWith('✓') ? '#d1fae5' : '#fee2e2',
                color: rollbackMessage.startsWith('✓') ? '#065f46' : '#991b1b',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem'
              }}>
                {rollbackMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeRollbackModal}
                className="btn btn-secondary"
                disabled={rollbackLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRollbackConfirm}
                className="btn btn-primary"
                disabled={rollbackLoading || !rollbackReason.trim()}
                style={{
                  opacity: rollbackLoading || !rollbackReason.trim() ? 0.6 : 1,
                  cursor: rollbackLoading || !rollbackReason.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {rollbackLoading ? 'Processing...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllTransactions;