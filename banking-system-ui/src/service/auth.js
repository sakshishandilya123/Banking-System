import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Set up axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if token is actually expired or missing, not for other business logic errors
    // Check response status and error message
    const errorMessage = error.response?.data?.error || '';
    const isActualAuthError = error.response?.status === 401 && 
                             errorMessage.includes('Access token required');
    
    if (isActualAuthError) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication service for managing user sessions
export const setCurrentUser = (userData, token) => {
  localStorage.setItem('currentUser', JSON.stringify(userData));
  localStorage.setItem('authToken', token);
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
};

export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const setAdminSession = (adminData, token) => {
  localStorage.setItem('adminUser', JSON.stringify(adminData));
  localStorage.setItem('authToken', token);
  localStorage.setItem('isAdmin', 'true');
};

export const isAdminLoggedIn = () => {
  return localStorage.getItem('isAdmin') === 'true';
};

export const getAdminUser = () => {
  const admin = localStorage.getItem('adminUser');
  return admin ? JSON.parse(admin) : null;
};

export const logout = () => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('authToken');
};

export const isAuthenticated = () => {
  return getCurrentUser() !== null || isAdminLoggedIn();
};

// Real API calls
export const userLogin = async (accountNumber, password) => {
  try {
    const response = await api.post('/auth/login', {
      accountNumber,
      password
    });
    
    if (response.data.success) {
      setCurrentUser(response.data.user, response.data.token);
      return { success: true, user: response.data.user };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Login failed. Please try again.' 
    };
  }
};

// OTP-based authentication
export const sendRegistrationOTP = async (email) => {
  try {
    const response = await api.post('/auth/send-otp', { email });
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message,
        expiresIn: response.data.expiresIn
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to send OTP. Please try again.' 
    };
  }
};

export const verifyRegistrationOTP = async (email, otp) => {
  try {
    const response = await api.post('/auth/verify-otp', {
      email,
      otp
    });
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message,
        verified: response.data.verified
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to verify OTP. Please try again.' 
    };
  }
};

export const sendLoginOTP = async (identifier) => {
  try {
    const response = await api.post('/auth/send-login-otp', { identifier });
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message,
        email: response.data.email,
        expiresIn: response.data.expiresIn
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to send OTP. Please try again.' 
    };
  }
};

export const verifyLoginOTP = async (identifier, otp) => {
  try {
    const response = await api.post('/auth/verify-login-otp', {
      identifier,
      otp
    });
    
    if (response.data.success) {
      setCurrentUser(response.data.user, response.data.token);
      return { success: true, user: response.data.user };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to verify OTP. Please try again.' 
    };
  }
};

// Transfer functions
export const validateAccount = async (accountNumber) => {
  try {
    const response = await api.get(`/accounts/validate/${accountNumber}`);
    return { success: true, account: response.data.account };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Account validation failed' 
    };
  }
};
export const adminLogin = async (username, password) => {
  try {
    const response = await api.post('/auth/admin/login', {
      username,
      password
    });
    
    if (response.data.success) {
      setAdminSession(response.data.admin, response.data.token);
      return { success: true, admin: response.data.admin };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Admin login failed. Please try again.' 
    };
  }
};

export const createAccount = async (accountData) => {
  try {
    const response = await api.post('/auth/register', accountData);
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message,
        accountNumber: response.data.accountNumber
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to create account. Please try again.' 
    };
  }
};

// Account operations
export const getAccountBalance = async (accountNumber) => {
  try {
    const response = await api.get(`/accounts/${accountNumber}/balance`);
    return { success: true, balance: response.data.balance };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch balance' 
    };
  }
};

export const getUserTransactions = async (accountNumber) => {
  try {
    const response = await api.get(`/transactions/${accountNumber}`);
    let transactions = response.data.transactions || [];

    // Find account numbers that need lookup (missing holder names)
    const accountsToLookup = new Set();
    transactions.forEach(tx => {
      if (tx.transaction_type === 'TRANSFER') {
        if (!tx.from_holder && tx.from_account) accountsToLookup.add(tx.from_account);
        if (!tx.to_holder && tx.to_account) accountsToLookup.add(tx.to_account);
      }
    });

    if (accountsToLookup.size > 0) {
      // Perform lookups in parallel, but deduplicated
      const lookupPromises = [...accountsToLookup].map(acc =>
        validateAccount(acc).then(r => ({ acc, res: r }))
      );

      const lookupResults = await Promise.all(lookupPromises);
      const nameMap = {};
      lookupResults.forEach(item => {
        if (item.res.success && item.res.account) {
          nameMap[item.acc] = item.res.account.holder_name;
        }
      });

      // Inject found names into transactions
      transactions = transactions.map(tx => ({
        ...tx,
        from_holder: tx.from_holder || (tx.from_account ? nameMap[tx.from_account] : tx.from_holder),
        to_holder: tx.to_holder || (tx.to_account ? nameMap[tx.to_account] : tx.to_holder)
      }));
    }

    return { success: true, transactions };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch transactions' 
    };
  }
};

export const transferMoney = async (fromAccount, toAccount, amount, description, password) => {
  try {
    const response = await api.post('/accounts/transfer', {
      fromAccount,
      toAccount,
      amount: parseFloat(amount),
      description,
      password
    });
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message,
        transactionId: response.data.transactionId,
        recipientName: response.data.recipientName,
        newBalance: response.data.newBalance
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Transfer failed. Please try again.' 
    };
  }
};

// Deposit money
export const depositMoney = async (accountNumber, amount, description) => {
  try {
    const response = await api.post(`/accounts/${accountNumber}/deposit`, {
      amount: parseFloat(amount),
      description
    });
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message,
        transactionId: response.data.transactionId
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Deposit failed. Please try again.' 
    };
  }
};

// Withdraw money
export const withdrawMoney = async (accountNumber, amount, description) => {
  try {
    const response = await api.post(`/accounts/${accountNumber}/withdraw`, {
      amount: parseFloat(amount),
      description
    });
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message,
        transactionId: response.data.transactionId
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Withdrawal failed. Please try again.' 
    };
  }
};

// Admin operations
export const getAllAccounts = async () => {
  try {
    const response = await api.get('/admin/accounts');
    return { success: true, accounts: response.data.accounts };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch accounts' 
    };
  }
};

export const getAccountDetails = async (accountNumber) => {
  try {
    const response = await api.get(`/admin/accounts/${accountNumber}`);
    return { success: true, account: response.data.account };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch account details' 
    };
  }
};

export const updateAccountStatus = async (accountNumber, status) => {
  try {
    const response = await api.put(`/admin/accounts/${accountNumber}/status`, {
      status
    });
    
    if (response.data.success) {
      return { 
        success: true, 
        message: response.data.message
      };
    }
    
    return { success: false, error: response.data.error };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to update account status' 
    };
  }
};

export const getAllTransactions = async () => {
  try {
    const response = await api.get('/admin/transactions');
    return { success: true, transactions: response.data.transactions };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch transactions' 
    };
  }
};
// Support services removed
// Verify account exists (public endpoint)
// Verify account exists (public endpoint)
export const verifyAccount = async (accountNumber) => {
  try {
    const response = await api.get(`/accounts/${accountNumber}/verify`);
    
    if (response.data.exists) {
      return { 
        success: true, 
        exists: true,
        holderName: response.data.holderName,
        status: response.data.status
      };
    } else {
      return { 
        success: false, 
        exists: false,
        error: response.data.error || 'Account not found'
      };
    }
  } catch (error) {
    return { 
      success: false, 
      exists: false,
      error: error.response?.data?.error || 'Account not found' 
    };
  }
};
export const getSystemStatistics = async () => {
  try {
    const response = await api.get('/admin/statistics');
    return { success: true, statistics: response.data.statistics };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch system statistics' 
    };
  }
};

// Rollback transaction
export const rollbackTransaction = async (transactionId, reason) => {
  try {
    const response = await api.post('/api/admin/transactions/rollback', {
      transactionId,
      reason
    });
    
    return { 
      success: true, 
      message: response.data.message,
      fromBalance: response.data.fromBalance,
      toBalance: response.data.toBalance
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to rollback transaction' 
    };
  }
};

export default api;