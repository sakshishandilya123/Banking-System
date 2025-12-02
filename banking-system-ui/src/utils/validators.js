// Validation utilities for form inputs

export const isValidEmail = (email) => {
  const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

export const isValidAccountNumber = (accountNumber) => {
  return accountNumber && accountNumber.trim().length >= 5;
};

export const isValidHolderName = (name) => {
  if (!name || name.trim().length < 2) return false;
  const nameRegex = /^[a-zA-Z ]{2,}$/;
  return nameRegex.test(name);
};

export const isValidAccountType = (accountType) => {
  return ['SAVINGS', 'CURRENT'].includes(accountType?.toUpperCase());
};

export const isValidAmount = (amount) => {
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return false;
  
  const amountValue = parseFloat(amount);
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  
  return decimalPlaces <= 2 && amountValue >= 100; // Minimum deposit $100
};

export const isStrongPassword = (password) => {
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return strongPasswordRegex.test(password);
};

export const isValidOTP = (otp) => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

export const isValidEmailOrAccountNumber = (identifier) => {
  return isValidEmail(identifier) || isValidAccountNumber(identifier);
};

export const validateAccountCreation = (formData) => {
  const errors = {};

  if (!isValidHolderName(formData.holderName)) {
    errors.holderName = 'Please enter a valid name (letters and spaces only, at least 2 characters)';
  }

  if (!isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!isValidPhone(formData.phone)) {
    errors.phone = 'Please enter a valid 10-digit phone number';
  }

  if (!isValidAccountType(formData.accountType)) {
    errors.accountType = 'Please select either SAVINGS or CURRENT';
  }

  if (!isValidAmount(formData.initialDeposit)) {
    errors.initialDeposit = 'Please enter a valid amount of at least $100.00';
  }

  if (!isStrongPassword(formData.password)) {
    errors.password = 'Password must have at least 8 characters with uppercase, lowercase, number, and symbol';
  }

  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateLogin = (accountNumber, password) => {
  const errors = {};

  if (!isValidAccountNumber(accountNumber)) {
    errors.accountNumber = 'Please enter a valid account number';
  }

  if (!password || password.length < 1) {
    errors.password = 'Please enter your password';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateOTPLogin = (identifier, otp) => {
  const errors = {};

  if (!isValidEmailOrAccountNumber(identifier)) {
    errors.identifier = 'Please enter a valid email or account number';
  }

  if (!isValidOTP(otp)) {
    errors.otp = 'Please enter a valid 6-digit OTP';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateTransfer = (fromAccount, toAccount, amount) => {
  const errors = {};

  if (!isValidAccountNumber(fromAccount)) {
    errors.fromAccount = 'Invalid from account number';
  }

  if (!isValidAccountNumber(toAccount)) {
    errors.toAccount = 'Invalid to account number';
  }

  if (fromAccount === toAccount) {
    errors.toAccount = 'Cannot transfer to the same account';
  }

  if (!isValidAmount(amount)) {
    errors.amount = 'Please enter a valid amount greater than 0';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};