const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Email configuration (using Gmail or your email service)
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// OTP utility functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

async function sendOTPEmail(email, otp, purpose = 'Email Verification') {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: `${purpose} - OTP Code`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Banking System - ${purpose}</h2>
            <p style="color: #666; margin-bottom: 15px;">Your One-Time Password (OTP) for ${purpose} is:</p>
            <div style="background-color: #f0f0f0; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; margin-bottom: 10px;"><strong>Important:</strong> This OTP is valid for 10 minutes only.</p>
            <p style="color: #666; margin-bottom: 20px;">Please do not share this code with anyone.</p>
            <p style="color: #999; font-size: 12px;">If you did not request this OTP, please ignore this email.</p>
          </div>
        </div>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

// Send login notification email
async function sendLoginNotificationEmail(email, userName, accountNumber) {
  try {
    const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Login Alert - Your Account Access',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Banking System - Login Notification</h2>
            <p style="color: #666; margin-bottom: 15px;">Dear <strong>${userName}</strong>,</p>
            <p style="color: #666; margin-bottom: 15px;">Your account has been successfully logged in.</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #333; margin: 5px 0;"><strong>Account Number:</strong> ${accountNumber}</p>
              <p style="color: #333; margin: 5px 0;"><strong>Login Time:</strong> ${loginTime}</p>
            </div>
            <p style="color: #666; margin-bottom: 15px;"><strong>If you did not initiate this login, please contact customer support immediately.</strong></p>
            <p style="color: #999; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Login notification email error:', error);
    return { success: false, error: error.message };
  }
}

// Send transfer notification email (sender)
async function sendTransferNotificationEmail(email, userName, recipientName, amount, recipientAccount, description) {
  try {
    console.log('📧 Preparing transfer email for sender:', email);
    const transactionTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    // Hide full account number - show only last 4 digits
    const maskedAccount = '*'.repeat(Math.max(0, recipientAccount.length - 4)) + recipientAccount.slice(-4);
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Money Transfer Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #27ae60; margin-bottom: 20px;">Banking System - Transfer Successful</h2>
            <p style="color: #666; margin-bottom: 15px;">Dear <strong>${userName}</strong>,</p>
            <p style="color: #666; margin-bottom: 15px;">Your money transfer has been completed successfully.</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #333; margin: 5px 0;"><strong>Recipient Name:</strong> ${recipientName}</p>
              <p style="color: #333; margin: 5px 0;"><strong>Recipient Account:</strong> ${maskedAccount}</p>
              <p style="color: #27ae60; margin: 5px 0;"><strong>Amount Transferred:</strong> ₹${amount}</p>
              <p style="color: #333; margin: 5px 0;"><strong>Description:</strong> ${description}</p>
              <p style="color: #333; margin: 5px 0;"><strong>Date & Time:</strong> ${transactionTime}</p>
            </div>
            <p style="color: #666; margin-bottom: 15px;">The recipient will receive the funds shortly.</p>
            <p style="color: #999; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    console.log('📧 Sending email with transporter:', { from: mailOptions.from, to: mailOptions.to });
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✓ Transfer email sent successfully:', result.response);
    return { success: true };
  } catch (error) {
    console.error('✗ Transfer notification email error:', error.message);
    return { success: false, error: error.message };
  }
}

// Send transfer received notification email (recipient)
async function sendTransferReceivedEmail(email, recipientName, senderName, amount, senderAccount, description) {
  try {
    console.log('📧 Preparing transfer email for recipient:', email);
    const transactionTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    // Hide full account number - show only last 4 digits
    const maskedAccount = '*'.repeat(Math.max(0, senderAccount.length - 4)) + senderAccount.slice(-4);
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Money Received - Transfer Notification',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #27ae60; margin-bottom: 20px;">Banking System - Money Received</h2>
            <p style="color: #666; margin-bottom: 15px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="color: #666; margin-bottom: 15px;">You have received money from another account.</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #333; margin: 5px 0;"><strong>Sender Name:</strong> ${senderName}</p>
              <p style="color: #333; margin: 5px 0;"><strong>Sender Account:</strong> ${maskedAccount}</p>
              <p style="color: #27ae60; margin: 5px 0;"><strong>Amount Received:</strong> ₹${amount}</p>
              <p style="color: #333; margin: 5px 0;"><strong>Description:</strong> ${description}</p>
              <p style="color: #333; margin: 5px 0;"><strong>Date & Time:</strong> ${transactionTime}</p>
            </div>
            <p style="color: #666; margin-bottom: 15px;">The amount has been credited to your account.</p>
            <p style="color: #999; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    console.log('📧 Sending email with transporter:', { from: mailOptions.from, to: mailOptions.to });
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✓ Recipient email sent successfully:', result.response);
    return { success: true };
  } catch (error) {
    console.error('✗ Transfer received email error:', error.message);
    return { success: false, error: error.message };
  }
}

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Sandeepreddy@123',
  database: process.env.DB_NAME || 'banking_simulator'
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Generate unique account number
async function generateAccountNumber() {
  let accountNumber;
  let isUnique = false;
  const connection = await pool.getConnection();

  while (!isUnique) {
    // Generate 12-digit account number
    accountNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    // Check if account number already exists
    const [existing] = await connection.execute(
      'SELECT account_number FROM accounts WHERE account_number = ?',
      [accountNumber]
    );
    
    if (existing.length === 0) {
      isUnique = true;
    }
  }

  connection.release();
  return accountNumber;
}

// Generate IFSC code
function generateIFSC() {
  const bankCode = 'SBIN'; // State Bank of India
  const branchCode = Math.floor(1000 + Math.random() * 9000).toString();
  return `${bankCode}${branchCode}`;
}

// Check if email already exists
async function isEmailExists(email) {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(
    'SELECT email FROM accounts WHERE email = ?',
    [email]
  );
  connection.release();
  return rows.length > 0;
}

// Check if phone already exists
async function isPhoneExists(phone) {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(
    'SELECT phone FROM accounts WHERE phone = ?',
    [phone]
  );
  connection.release();
  return rows.length > 0;
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create accounts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_number VARCHAR(32) PRIMARY KEY,
        holder_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        date_of_birth DATE,
        address VARCHAR(500),
        ifsc VARCHAR(20) NOT NULL,
        balance DECIMAL(19,4) NOT NULL DEFAULT 0.00,
        password_hash VARCHAR(255) NOT NULL,
        account_type VARCHAR(20) DEFAULT 'SAVINGS',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        last_activity DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing databases: add date_of_birth and address columns if missing
    try {
      const [dobCol] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'accounts' AND column_name = 'date_of_birth'`,
        [dbConfig.database]
      );

      const [addrCol] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'accounts' AND column_name = 'address'`,
        [dbConfig.database]
      );

      if (dobCol && dobCol[0] && dobCol[0].cnt === 0) {
        try {
          await connection.execute(`ALTER TABLE accounts ADD COLUMN date_of_birth DATE`);
          console.log('Added column accounts.date_of_birth');
        } catch (err) {
          console.warn('Failed to add accounts.date_of_birth:', err && err.message);
        }
      }

      if (addrCol && addrCol[0] && addrCol[0].cnt === 0) {
        try {
          await connection.execute(`ALTER TABLE accounts ADD COLUMN address VARCHAR(500)`);
          console.log('Added column accounts.address');
        } catch (err) {
          console.warn('Failed to add accounts.address:', err && err.message);
        }
      }
    } catch (e) {
      console.warn('Could not check/alter information_schema for new account columns:', e && e.message);
    }

    // Create transactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(36) NOT NULL,
        transaction_type ENUM('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'ROLLBACK') NOT NULL,
        from_account VARCHAR(32),
        to_account VARCHAR(32),
        from_holder VARCHAR(100),
        to_holder VARCHAR(100),
        amount DECIMAL(19,4) NOT NULL,
        description TEXT,
        parent_transaction_id VARCHAR(36),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_account) REFERENCES accounts(account_number),
        FOREIGN KEY (to_account) REFERENCES accounts(account_number)
      )
    `);

    // Ensure existing databases get the new denormalized holder columns
    // Some MySQL versions do not support `ADD COLUMN IF NOT EXISTS`, so check
    // information_schema first and run a standard ALTER TABLE only when needed.
    try {
      const [fromCol] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'transactions' AND column_name = 'from_holder'`,
        [dbConfig.database]
      );

      const [toCol] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'transactions' AND column_name = 'to_holder'`,
        [dbConfig.database]
      );

      const [parentCol] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'transactions' AND column_name = 'parent_transaction_id'`,
        [dbConfig.database]
      );

      if (fromCol && fromCol[0] && fromCol[0].cnt === 0) {
        try {
          await connection.execute(`ALTER TABLE transactions ADD COLUMN from_holder VARCHAR(100)`);
          console.log('Added column transactions.from_holder');
        } catch (err) {
          console.warn('Failed to add transactions.from_holder:', err && err.message);
        }
      }

      if (toCol && toCol[0] && toCol[0].cnt === 0) {
        try {
          await connection.execute(`ALTER TABLE transactions ADD COLUMN to_holder VARCHAR(100)`);
          console.log('Added column transactions.to_holder');
        } catch (err) {
          console.warn('Failed to add transactions.to_holder:', err && err.message);
        }
      }

      if (parentCol && parentCol[0] && parentCol[0].cnt === 0) {
        try {
          await connection.execute(`ALTER TABLE transactions ADD COLUMN parent_transaction_id VARCHAR(36)`);
          console.log('Added column transactions.parent_transaction_id');
        } catch (err) {
          console.warn('Failed to add transactions.parent_transaction_id:', err && err.message);
        }
      }
    } catch (e) {
      console.warn('Could not check/alter information_schema for transactions columns:', e && e.message);
    }

    // Create admin table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        username VARCHAR(50) PRIMARY KEY,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'ADMIN',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create OTP verification table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        account_number VARCHAR(32),
        is_verified BOOLEAN DEFAULT FALSE,
        attempts INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME DEFAULT NULL,
        temp_account_data JSON,
        UNIQUE KEY unique_email_purpose (email, purpose, created_at)
      )
    `);

    // Support system removed: support_tickets, support_messages, and faqs tables are no longer created here.

    // Insert default admin user
    const adminPasswordHash = await bcrypt.hash('admin', 10);
    await connection.execute(`
      INSERT IGNORE INTO admin_users (username, password_hash, full_name, role) 
      VALUES (?, ?, ?, ?)
    `, ['admin', adminPasswordHash, 'System Administrator', 'SUPER_ADMIN']);

    connection.release();
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Banking API is running' });
});

// Send OTP for account creation
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email already registered
    if (await isEmailExists(email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const connection = await pool.getConnection();

    // Delete expired OTP for this email
    await connection.execute(
      'DELETE FROM otp_verifications WHERE email = ? AND purpose = "REGISTRATION" AND expires_at < NOW()',
      [email]
    );

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await connection.execute(
      'INSERT INTO otp_verifications (email, otp, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'REGISTRATION', expiresAt]
    );

    connection.release();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, 'Account Registration');

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'OTP sent successfully to your email',
        expiresIn: 600 // 10 minutes in seconds
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send OTP email. Please try again.' 
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP for account creation
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const connection = await pool.getConnection();

    // Find valid OTP
    const [rows] = await connection.execute(
      'SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND purpose = "REGISTRATION" AND expires_at > NOW() AND attempts < 3',
      [email, otp]
    );

    if (rows.length === 0) {
      // Check if OTP is expired or too many attempts
      const [existingOTP] = await connection.execute(
        'SELECT * FROM otp_verifications WHERE email = ? AND purpose = "REGISTRATION"',
        [email]
      );

      if (existingOTP.length > 0) {
        if (existingOTP[0].expires_at < new Date()) {
          await connection.execute(
            'DELETE FROM otp_verifications WHERE id = ?',
            [existingOTP[0].id]
          );
          connection.release();
          return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Increment attempts
        await connection.execute(
          'UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?',
          [existingOTP[0].id]
        );
      }

      connection.release();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark OTP as verified
    await connection.execute(
      'UPDATE otp_verifications SET is_verified = TRUE WHERE id = ?',
      [rows[0].id]
    );

    connection.release();

    res.json({ 
      success: true, 
      message: 'Email verified successfully. You can now create your account.',
      verified: true
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send OTP for login
app.post('/api/auth/send-login-otp', async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or account number

    if (!identifier) {
      return res.status(400).json({ error: 'Email or account number is required' });
    }

    const connection = await pool.getConnection();

    // Find account by email or account number
    let account;
    const [rows] = await connection.execute(
      'SELECT email, account_number FROM accounts WHERE email = ? OR account_number = ?',
      [identifier, identifier]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Account not found' });
    }

    account = rows[0];

    // Delete expired OTP
    await connection.execute(
      'DELETE FROM otp_verifications WHERE email = ? AND purpose = "LOGIN" AND expires_at < NOW()',
      [account.email]
    );

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await connection.execute(
      'INSERT INTO otp_verifications (email, otp, purpose, account_number, expires_at) VALUES (?, ?, ?, ?, ?)',
      [account.email, otp, 'LOGIN', account.account_number, expiresAt]
    );

    connection.release();

    // Send OTP email
    const emailResult = await sendOTPEmail(account.email, otp, 'Login Verification');

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'OTP sent to your registered email',
        expiresIn: 600,
        email: account.email // Return email for display
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send OTP email. Please try again.' 
      });
    }

  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP for login
app.post('/api/auth/verify-login-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body; // identifier can be email or account number

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Email/Account number and OTP are required' });
    }

    const connection = await pool.getConnection();

    // Find account
    const [accounts] = await connection.execute(
      'SELECT account_number, email FROM accounts WHERE email = ? OR account_number = ?',
      [identifier, identifier]
    );

    if (accounts.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accounts[0];

    // Find valid OTP
    const [rows] = await connection.execute(
      'SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND purpose = "LOGIN" AND expires_at > NOW() AND attempts < 3',
      [account.email, otp]
    );

    if (rows.length === 0) {
      // Check if OTP is expired
      const [existingOTP] = await connection.execute(
        'SELECT * FROM otp_verifications WHERE email = ? AND purpose = "LOGIN"',
        [account.email]
      );

      if (existingOTP.length > 0) {
        if (existingOTP[0].expires_at < new Date()) {
          await connection.execute(
            'DELETE FROM otp_verifications WHERE id = ?',
            [existingOTP[0].id]
          );
          connection.release();
          return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Increment attempts
        await connection.execute(
          'UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?',
          [existingOTP[0].id]
        );
      }

      connection.release();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Get full account details for token
    const [accountDetails] = await connection.execute(
      'SELECT * FROM accounts WHERE account_number = ?',
      [account.account_number]
    );

    if (accountDetails.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Account not found' });
    }

    const accountData = accountDetails[0];

    // Check if account is frozen
    if (accountData.status === 'FROZEN') {
      connection.release();
      return res.status(401).json({ error: 'Account is frozen. Please contact administrator.' });
    }

    // Update last activity
    await connection.execute(
      'UPDATE accounts SET last_activity = NOW() WHERE account_number = ?',
      [accountData.account_number]
    );

    // Mark OTP as verified
    await connection.execute(
      'UPDATE otp_verifications SET is_verified = TRUE WHERE id = ?',
      [rows[0].id]
    );

    connection.release();

    // Send login notification email
    await sendLoginNotificationEmail(accountData.email, accountData.holder_name, accountData.account_number);

    // Create JWT token
    const token = jwt.sign(
      { 
        accountNumber: accountData.account_number, 
        holderName: accountData.holder_name,
        type: 'user'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data
    const userData = {
      accountNumber: accountData.account_number,
      holderName: accountData.holder_name,
      email: accountData.email,
      phone: accountData.phone,
      balance: parseFloat(accountData.balance),
      accountType: accountData.account_type,
      status: accountData.status,
      ifsc: accountData.ifsc,
      createdAt: accountData.created_at
    };

    res.json({
      success: true,
      user: userData,
      token
    });

  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { accountNumber, password } = req.body;

    if (!accountNumber || !password) {
      return res.status(400).json({ error: 'Account number and password are required' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM accounts WHERE account_number = ?',
      [accountNumber]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(401).json({ error: 'Invalid account number' });
    }

    const account = rows[0];
    
    // Check if account is frozen
    if (account.status === 'FROZEN') {
      connection.release();
      return res.status(401).json({ error: 'Account is frozen. Please contact administrator.' });
    }

    const isValidPassword = await bcrypt.compare(password, account.password_hash);

    if (!isValidPassword) {
      connection.release();
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Update last activity
    await connection.execute(
      'UPDATE accounts SET last_activity = NOW() WHERE account_number = ?',
      [accountNumber]
    );

    connection.release();

    // Create JWT token
    const token = jwt.sign(
      { 
        accountNumber: account.account_number, 
        holderName: account.holder_name,
        type: 'user'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data (excluding password)
    const userData = {
      accountNumber: account.account_number,
      holderName: account.holder_name,
      email: account.email,
      phone: account.phone,
      dateOfBirth: account.date_of_birth,
      address: account.address,
      balance: parseFloat(account.balance),
      accountType: account.account_type,
      status: account.status,
      ifsc: account.ifsc,
      createdAt: account.created_at
    };

    res.json({
      success: true,
      user: userData,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin login
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const admin = rows[0];
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      connection.release();
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    connection.release();

    // Create JWT token
    const token = jwt.sign(
      { 
        username: admin.username,
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const adminData = {
      username: admin.username,
      fullName: admin.full_name,
      role: admin.role
    };

    res.json({
      success: true,
      admin: adminData,
      token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create account
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      holderName,
      email,
      phone,
      dateOfBirth,
      address,
      accountType,
      initialDeposit,
      password
    } = req.body;

    // Validate required fields
    if (!holderName || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate initial deposit
    if (!initialDeposit || initialDeposit < 0) {
      return res.status(400).json({ error: 'Valid initial deposit is required' });
    }

    // Check if email already exists
    if (await isEmailExists(email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check if phone already exists
    if (await isPhoneExists(phone)) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    const connection = await pool.getConnection();

    try {
      // Verify that email has been verified via OTP
      const [verifiedOTP] = await connection.execute(
        'SELECT * FROM otp_verifications WHERE email = ? AND purpose = "REGISTRATION" AND is_verified = TRUE ORDER BY created_at DESC LIMIT 1',
        [email]
      );

      if (verifiedOTP.length === 0) {
        return res.status(400).json({ error: 'Email has not been verified. Please verify your email with OTP first.' });
      }

      await connection.beginTransaction();

      // Generate unique account number and IFSC
      const accountNumber = await generateAccountNumber();
      const ifsc = generateIFSC();

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create account
      await connection.execute(
        `INSERT INTO accounts 
         (account_number, holder_name, email, phone, date_of_birth, address, ifsc, balance, password_hash, account_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [accountNumber, holderName, email, phone, dateOfBirth || null, address || null, ifsc, initialDeposit, passwordHash, accountType]
      );

      // Log initial deposit transaction if any
      if (initialDeposit > 0) {
        const transactionId = randomUUID();
        await connection.execute(
          `INSERT INTO transactions 
           (transaction_id, transaction_type, from_account, to_account, to_holder, amount, description) 
           VALUES (?, 'DEPOSIT', NULL, ?, ?, ?, ?)`,
          [transactionId, accountNumber, holderName, initialDeposit, 'Initial deposit - Account creation']
        );
      }

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Account created successfully',
        accountNumber,
        ifsc,
        holderName,
        email,
        phone,
        dateOfBirth: dateOfBirth || null,
        address: address || null
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get account balance
app.get('/api/accounts/:accountNumber/balance', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT balance FROM accounts WHERE account_number = ?',
      [accountNumber]
    );

    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ balance: parseFloat(rows[0].balance) });

  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user transactions
app.get('/api/transactions/:accountNumber', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
            `SELECT t.transaction_id, t.transaction_type, t.from_account, t.to_account, t.amount, t.description, t.created_at,
              COALESCE(t.from_holder, fa.holder_name) as from_holder,
              COALESCE(t.to_holder, ta.holder_name) as to_holder
       FROM transactions t
       LEFT JOIN accounts fa ON t.from_account = fa.account_number
       LEFT JOIN accounts ta ON t.to_account = ta.account_number
       WHERE t.from_account = ? OR t.to_account = ? 
       ORDER BY t.created_at DESC LIMIT 50`,
      [accountNumber, accountNumber]
    );

    connection.release();

    res.json({ transactions: rows });

  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer money
// Transfer money
app.post('/api/accounts/transfer', authenticateToken, async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, description, password } = req.body;

    if (!fromAccount || !toAccount || !amount || !description || !password) {
      return res.status(400).json({ error: 'All fields including password are required' });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if fromAccount exists and verify password
      const [fromAccounts] = await connection.execute(
        'SELECT balance, status, holder_name, password_hash FROM accounts WHERE account_number = ?',
        [fromAccount]
      );

      if (fromAccounts.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Sender account not found' });
      }

      const fromAccountData = fromAccounts[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, fromAccountData.password_hash);
      if (!isValidPassword) {
        await connection.rollback();
        connection.release();
        return res.status(401).json({ error: 'Invalid password. Transfer cancelled.' });
      }

      if (fromAccountData.status === 'FROZEN') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Sender account is frozen' });
      }

      if (parseFloat(fromAccountData.balance) < parseFloat(amount)) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Check if toAccount exists
      const [toAccounts] = await connection.execute(
        'SELECT status, holder_name FROM accounts WHERE account_number = ?',
        [toAccount]
      );

      if (toAccounts.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Recipient account not found' });
      }

      const toAccountData = toAccounts[0];

      if (toAccountData.status === 'FROZEN') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Recipient account is frozen' });
      }

      // Perform the transfer
      await connection.execute(
        'UPDATE accounts SET balance = balance - ?, last_activity = NOW() WHERE account_number = ?',
        [amount, fromAccount]
      );

      await connection.execute(
        'UPDATE accounts SET balance = balance + ?, last_activity = NOW() WHERE account_number = ?',
        [amount, toAccount]
      );

      // Log the transaction
      const transactionId = randomUUID();
      await connection.execute(
        `INSERT INTO transactions 
         (transaction_id, transaction_type, from_account, to_account, from_holder, to_holder, amount, description) 
         VALUES (?, 'TRANSFER', ?, ?, ?, ?, ?, ?)`,
        [transactionId, fromAccount, toAccount, fromAccountData.holder_name, toAccountData.holder_name, amount, description]
      );

      await connection.commit();
      connection.release();

      // Get full account data for emails
      const senderConnection = await pool.getConnection();
      const [senderData] = await senderConnection.execute(
        'SELECT email FROM accounts WHERE account_number = ?',
        [fromAccount]
      );
      const senderEmail = senderData.length > 0 ? senderData[0].email : null;

      const [recipientData] = await senderConnection.execute(
        'SELECT email FROM accounts WHERE account_number = ?',
        [toAccount]
      );
      const recipientEmail = recipientData.length > 0 ? recipientData[0].email : null;
      senderConnection.release();

      // Send emails asynchronously (don't wait for them to complete)
      if (senderEmail) {
        console.log('📧 Sending transfer email to sender:', senderEmail);
        (async () => {
          try {
            const senderEmailResult = await sendTransferNotificationEmail(
              senderEmail,
              fromAccountData.holder_name,
              toAccountData.holder_name,
              amount,
              toAccount,
              description
            );
            if (senderEmailResult.success) {
              console.log('✓ Sender email sent successfully to:', senderEmail);
            } else {
              console.error('✗ Failed to send sender email to:', senderEmail, 'Error:', senderEmailResult.error);
            }
          } catch (err) {
            console.error('✗ Sender email error:', err.message);
          }
        })();
      } else {
        console.warn('⚠ No sender email found for account:', fromAccount);
      }

      if (recipientEmail) {
        console.log('📧 Sending transfer email to recipient:', recipientEmail);
        (async () => {
          try {
            const recipientEmailResult = await sendTransferReceivedEmail(
              recipientEmail,
              toAccountData.holder_name,
              fromAccountData.holder_name,
              amount,
              fromAccount,
              description
            );
            if (recipientEmailResult.success) {
              console.log('✓ Recipient email sent successfully to:', recipientEmail);
            } else {
              console.error('✗ Failed to send recipient email to:', recipientEmail, 'Error:', recipientEmailResult.error);
            }
          } catch (err) {
            console.error('✗ Recipient email error:', err.message);
          }
        })();
      } else {
        console.warn('⚠ No recipient email found for account:', toAccount);
      }

      res.json({
        success: true,
        message: 'Transfer completed successfully',
        transactionId,
        recipientName: toAccountData.holder_name,
        newBalance: parseFloat(fromAccountData.balance) - parseFloat(amount)
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Transfer transaction error:', error);
      res.status(500).json({ error: 'Transfer failed. Please try again.' });
    }

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed. Please try again.' });
  }
});

// Validate account exists
app.get('/api/accounts/validate/:accountNumber', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;

    if (!accountNumber) {
      return res.status(400).json({ error: 'Account number is required' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT account_number, holder_name, status, date_of_birth, address FROM accounts WHERE account_number = ?',
      [accountNumber]
    );

    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = rows[0];

    if (account.status === 'FROZEN') {
      return res.status(400).json({ error: 'Account is frozen' });
    }

    res.json({
      success: true,
      account: {
        accountNumber: account.account_number,
        holderName: account.holder_name,
        status: account.status,
        dateOfBirth: account.date_of_birth,
        address: account.address
      }
    });

  } catch (error) {
    console.error('Account validation error:', error);
    res.status(500).json({ error: 'Account validation failed' });
  }
});

// Deposit money
app.post('/api/accounts/:accountNumber/deposit', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if account exists
      const [accounts] = await connection.execute(
        'SELECT status FROM accounts WHERE account_number = ? FOR UPDATE',
        [accountNumber]
      );

      if (accounts.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Account not found' });
      }

      if (accounts[0].status === 'FROZEN') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Account is frozen' });
      }

      // Perform deposit
      await connection.execute(
        'UPDATE accounts SET balance = balance + ?, last_activity = NOW() WHERE account_number = ?',
        [amount, accountNumber]
      );

      // Log the transaction
      const transactionId = randomUUID();
      await connection.execute(
        `INSERT INTO transactions 
         (transaction_id, transaction_type, from_account, to_account, to_holder, amount, description) 
         VALUES (?, 'DEPOSIT', NULL, ?, ?, ?, ?)`,
        [transactionId, accountNumber, userData.holder_name, amount, description || 'Cash deposit']
      );

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Deposit completed successfully',
        transactionId
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed. Please try again.' });
  }
});

// Withdraw money
app.post('/api/accounts/:accountNumber/withdraw', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if account exists and has sufficient balance
      const [accounts] = await connection.execute(
        'SELECT balance, status FROM accounts WHERE account_number = ? FOR UPDATE',
        [accountNumber]
      );

      if (accounts.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Account not found' });
      }

      if (accounts[0].status === 'FROZEN') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Account is frozen' });
      }

      if (parseFloat(accounts[0].balance) < amount) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Perform withdrawal
      await connection.execute(
        'UPDATE accounts SET balance = balance - ?, last_activity = NOW() WHERE account_number = ?',
        [amount, accountNumber]
      );

      // Log the transaction
      const transactionId = randomUUID();
      await connection.execute(
        `INSERT INTO transactions 
         (transaction_id, transaction_type, from_account, to_account, from_holder, amount, description) 
         VALUES (?, 'WITHDRAW', ?, NULL, ?, ?, ?)`,
        [transactionId, accountNumber, userData.holder_name, amount, description || 'Cash withdrawal']
      );

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Withdrawal completed successfully',
        transactionId
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Withdrawal failed. Please try again.' });
  }
});

// Admin routes

// Get all accounts
app.get('/api/admin/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT account_number, holder_name, email, phone, date_of_birth, address, ifsc, balance, account_type, status, created_at, last_activity FROM accounts ORDER BY created_at DESC'
    );

    connection.release();

    res.json({ accounts: rows });

  } catch (error) {
    console.error('Get all accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get account details
app.get('/api/admin/accounts/:accountNumber', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT account_number, holder_name, email, phone, date_of_birth, address, ifsc, balance, account_type, status, created_at, last_activity FROM accounts WHERE account_number = ?',
      [accountNumber]
    );

    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ account: rows[0] });

  } catch (error) {
    console.error('Get account details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update account status
app.put('/api/admin/accounts/:accountNumber/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'FROZEN'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'UPDATE accounts SET status = ?, last_activity = NOW() WHERE account_number = ?',
      [status, accountNumber]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      success: true,
      message: `Account ${status.toLowerCase()} successfully`
    });

  } catch (error) {
    console.error('Update account status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all transactions (admin)
app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT t.transaction_id, t.transaction_type, t.from_account, t.to_account, t.amount, t.description, t.created_at,
              COALESCE(t.from_holder, a.holder_name) as from_holder,
              COALESCE(t.to_holder, b.holder_name) as to_holder
       FROM transactions t 
       LEFT JOIN accounts a ON t.from_account = a.account_number 
       LEFT JOIN accounts b ON t.to_account = b.account_number 
       ORDER BY t.created_at DESC LIMIT 100`
    );

    connection.release();

    res.json({ transactions: rows });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Support system removed: support API endpoints have been deleted.

// Get system statistics
app.get('/api/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [totalAccounts] = await connection.execute(
      'SELECT COUNT(*) as count FROM accounts'
    );

    const [totalBalance] = await connection.execute(
      'SELECT SUM(balance) as total FROM accounts'
    );

    const [activeAccounts] = await connection.execute(
      'SELECT COUNT(*) as count FROM accounts WHERE status = "ACTIVE"'
    );

    const [frozenAccounts] = await connection.execute(
      'SELECT COUNT(*) as count FROM accounts WHERE status = "FROZEN"'
    );

    const [todayTransactions] = await connection.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE DATE(created_at) = CURDATE()'
    );

    const [weekTransactions] = await connection.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    connection.release();

    const stats = {
      totalAccounts: totalAccounts[0].count,
      totalBalance: parseFloat(totalBalance[0].total || 0),
      activeAccounts: activeAccounts[0].count,
      frozenAccounts: frozenAccounts[0].count,
      todayTransactions: todayTransactions[0].count,
      weekTransactions: weekTransactions[0].count
    };

    res.json({ statistics: stats });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rollback transaction (Admin only)
app.post('/api/admin/transactions/rollback', authenticateToken, requireAdmin, async (req, res) => {
  let connection;
  try {
    const { transactionId, reason } = req.body;
    console.log('Rollback request:', { transactionId, reason });

    if (!transactionId || !reason) {
      return res.status(400).json({ error: 'Transaction ID and reason are required' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get the original transaction
      const [transactions] = await connection.execute(
        'SELECT * FROM transactions WHERE transaction_id = ? AND transaction_type = "TRANSFER"',
        [transactionId]
      );

      console.log('Found transactions:', transactions.length);

      if (transactions.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Transaction not found or cannot be rolled back' });
      }

      const transaction = transactions[0];
      const fromAccount = transaction.from_account;
      const toAccount = transaction.to_account;
      const amount = transaction.amount;

      console.log('Rollback details:', { fromAccount, toAccount, amount });

      // Check if transaction is already rolled back
      const [rollbackCheck] = await connection.execute(
        'SELECT * FROM transactions WHERE parent_transaction_id = ?',
        [transactionId]
      );

      if (rollbackCheck && rollbackCheck.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Transaction already rolled back' });
      }

      // Get current account balances
      const [fromAccounts] = await connection.execute(
        'SELECT balance, email, holder_name FROM accounts WHERE account_number = ?',
        [fromAccount]
      );

      const [toAccounts] = await connection.execute(
        'SELECT balance, email, holder_name FROM accounts WHERE account_number = ?',
        [toAccount]
      );

      if (!fromAccounts || fromAccounts.length === 0 || !toAccounts || toAccounts.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Account not found' });
      }

      const fromBalance = parseFloat(fromAccounts[0].balance);
      const toBalance = parseFloat(toAccounts[0].balance);
      const fromEmail = fromAccounts[0].email;
      const toEmail = toAccounts[0].email;
      const fromName = fromAccounts[0].holder_name;
      const toName = toAccounts[0].holder_name;

      console.log('Current balances:', { fromBalance, toBalance });

      // Update sender balance (add money back)
      const updateFromResult = await connection.execute(
        'UPDATE accounts SET balance = balance + ?, last_activity = NOW() WHERE account_number = ?',
        [amount, fromAccount]
      );
      console.log('Updated sender account:', updateFromResult);

      // Update recipient balance (deduct money, can go negative)
      const updateToResult = await connection.execute(
        'UPDATE accounts SET balance = balance - ?, last_activity = NOW() WHERE account_number = ?',
        [amount, toAccount]
      );
      console.log('Updated recipient account:', updateToResult);

      // Create rollback transaction record
      const rollbackId = randomUUID();
      console.log('Creating rollback transaction:', { rollbackId });

      const insertResult = await connection.execute(
        `INSERT INTO transactions 
         (transaction_id, transaction_type, from_account, to_account, from_holder, to_holder, amount, description, parent_transaction_id) 
         VALUES (?, 'ROLLBACK', ?, ?, ?, ?, ?, ?, ?)`,
        [rollbackId, toAccount, fromAccount, toName, fromName, amount, `Rollback of transaction ${transactionId}. Reason: ${reason}`, transactionId]
      );
      console.log('Rollback transaction created:', insertResult);

      await connection.commit();
      console.log('Transaction committed successfully');

      // Calculate new balances
      const newFromBalance = fromBalance + amount;
      const newToBalance = toBalance - amount;

      console.log(`✓ Transaction ${transactionId} rolled back successfully. From: ${fromAccount} (${fromBalance} → ${newFromBalance}), To: ${toAccount} (${toBalance} → ${newToBalance})`);

      // Send emails asynchronously
      (async () => {
        try {
          // Email to sender (refund notification)
          if (fromEmail) {
            await emailTransporter.sendMail({
              from: process.env.EMAIL_USER || 'your-email@gmail.com',
              to: fromEmail,
              subject: '💰 Transaction Rollback - Refund Processed',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #059669; margin-bottom: 20px;">✓ Refund Processed</h2>
                    <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear ${fromName},</p>
                    <p style="color: #555; margin-bottom: 20px;">A transaction has been rolled back by the admin. The amount has been refunded to your account.</p>
                    <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                      <p style="margin: 5px 0; color: #333;"><strong>Transaction ID:</strong> ${transactionId.substring(0, 12)}...</p>
                      <p style="margin: 5px 0; color: #333;"><strong>Refund Amount:</strong> ₹${amount.toLocaleString('en-IN', {maximumFractionDigits: 2})}</p>
                      <p style="margin: 5px 0; color: #333;"><strong>New Balance:</strong> ₹${newFromBalance.toLocaleString('en-IN', {maximumFractionDigits: 2})}</p>
                      <p style="margin: 5px 0; color: #333;"><strong>Reason:</strong> ${reason}</p>
                    </div>
                  </div>
                </div>
              `
            });
            console.log(`✓ Refund notification sent to sender: ${fromEmail}`);
          }

          // Email to recipient (debit notification)
          if (toEmail) {
            await emailTransporter.sendMail({
              from: process.env.EMAIL_USER || 'your-email@gmail.com',
              to: toEmail,
              subject: '⚠️ Transaction Rollback - Amount Deducted',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Transaction Rollback</h2>
                    <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear ${toName},</p>
                    <p style="color: #555; margin-bottom: 20px;">A previous transaction to your account has been rolled back by the admin. The amount has been deducted from your account.</p>
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                      <p style="margin: 5px 0; color: #333;"><strong>Transaction ID:</strong> ${transactionId.substring(0, 12)}...</p>
                      <p style="margin: 5px 0; color: #333;"><strong>Deducted Amount:</strong> ₹${amount.toLocaleString('en-IN', {maximumFractionDigits: 2})}</p>
                      <p style="margin: 5px 0; color: #333;"><strong>New Balance:</strong> ₹${newToBalance.toLocaleString('en-IN', {maximumFractionDigits: 2})}</p>
                      <p style="margin: 5px 0; color: #333;"><strong>Reason:</strong> ${reason}</p>
                    </div>
                    ${newToBalance < 0 ? `<div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin-bottom: 20px; border-radius: 4px;"><p style="margin: 5px 0; color: #c2410c;"><strong>⚠️ Important:</strong> Your account balance is now negative. Please deposit funds to bring your account balance to zero or positive.</p></div>` : ''}
                  </div>
                </div>
              `
            });
            console.log(`✓ Rollback notification sent to recipient: ${toEmail}`);
          }
        } catch (emailError) {
          console.error('Error sending rollback notification emails:', emailError.message);
        }
      })();

      res.json({
        success: true,
        message: 'Transaction rolled back successfully',
        originalTransaction: {
          id: transactionId,
          from: fromAccount,
          to: toAccount,
          amount: amount
        },
        newBalances: {
          from: newFromBalance,
          to: newToBalance
        },
        fromBalance: newFromBalance,
        toBalance: newToBalance
      });

    } catch (innerError) {
      await connection.rollback();
      console.error('Rollback transaction error:', innerError);
      res.status(500).json({ error: 'Rollback failed: ' + (innerError.message || 'Unknown error') });
    }

  } catch (error) {
    console.error('Rollback endpoint error:', error);
    res.status(500).json({ error: 'Rollback failed: ' + (error.message || 'Unknown error') });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const testEmail = req.query.email || 'test@example.com';
    console.log('Testing email to:', testEmail);
    
    const testResult = await emailTransporter.sendMail({
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: testEmail,
      subject: 'Test Email from Banking System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Email Test Successful!</h2>
          <p>If you received this email, the email system is working correctly.</p>
          <p>Email User: ${process.env.EMAIL_USER}</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    
    console.log('Test email sent successfully:', testResult.response);
    res.json({ success: true, message: 'Test email sent successfully', response: testResult.response });
  } catch (error) {
    console.error('Test email error:', error.message);
    res.status(500).json({ success: false, error: error.message, emailConfig: {
      user: process.env.EMAIL_USER,
      service: process.env.EMAIL_SERVICE || 'gmail'
    }});
  }
});

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Banking API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Admin support endpoints removed as part of support system deletion.