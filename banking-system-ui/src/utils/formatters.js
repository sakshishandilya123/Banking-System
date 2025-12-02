// Formatting utilities for displaying data

export const formatCurrency = (amount, currency = 'INR') => {
    if (amount === null || amount === undefined) return '₹0.00';
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  export const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    if (includeTime) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  export const formatAccountNumber = (accountNumber) => {
    if (!accountNumber) return 'N/A';
    
    // Display last 4 digits for security, show full for admin
    return `****${accountNumber.slice(-4)}`;
  };
  
  export const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    
    const cleaned = phone.replace(/\D/g, '');
    // Indian phone format: +91-XXXXX-XXXXX
    if (cleaned.length === 10) {
      return `+91-${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    }
    
    return phone;
  };
  
  export const formatTransactionType = (type) => {
    const typeMap = {
      'DEPOSIT': 'Deposit',
      'WITHDRAW': 'Withdrawal',
      'TRANSFER': 'Transfer',
    };
    
    return typeMap[type] || type;
  };
  
  export const getTransactionColor = (type, accountNumber, fromAccount) => {
    if (type === 'DEPOSIT') return 'text-success';
    if (type === 'WITHDRAW') return 'text-danger';
    
    if (type === 'TRANSFER') {
      return fromAccount === accountNumber ? 'text-danger' : 'text-success';
    }
    
    return 'text-muted';
  };
  
  export const formatTransactionAmount = (type, amount, accountNumber, fromAccount) => {
    const formattedAmount = formatCurrency(amount);
    
    if (type === 'DEPOSIT') return `+${formattedAmount}`;
    if (type === 'WITHDRAW') return `-${formattedAmount}`;
    
    if (type === 'TRANSFER') {
      return fromAccount === accountNumber ? `-${formattedAmount}` : `+${formattedAmount}`;
    }
    
    return formattedAmount;
  };
  
  export const truncateString = (str, maxLength = 20) => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    
    return str.substring(0, maxLength) + '...';
  };
  
  export const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };
  
  export const formatAccountStatus = (status) => {
    const statusMap = {
      'ACTIVE': { text: 'Active', class: 'status-active' },
      'FROZEN': { text: 'Frozen', class: 'status-frozen' },
      'INACTIVE': { text: 'Inactive', class: 'status-inactive' },
    };
    
    return statusMap[status] || { text: status, class: 'status-unknown' };
  };
  
  export const formatAccountType = (type) => {
    const typeMap = {
      'SAVINGS': 'Savings',
      'CURRENT': 'Current',
    };
    
    return typeMap[type] || type;
  };
  
  // Add CSS classes for status formatting
  export const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'ACTIVE': 'badge-success',
      'FROZEN': 'badge-danger',
      'INACTIVE': 'badge-secondary',
    };
    
    return statusClasses[status] || 'badge-secondary';
  };