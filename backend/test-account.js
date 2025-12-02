const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Sandeepreddy@123',
  database: 'banking_simulator'
});

async function createTestAccount() {
  try {
    const conn = await pool.getConnection();
    const hash = await bcrypt.hash('password123', 10);
    const accountNum = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    await conn.execute(
      'INSERT INTO accounts (account_number, holder_name, email, phone, date_of_birth, address, ifsc, balance, password_hash, account_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [accountNum, 'Test User', 'test@example.com', '9876543210', '1995-05-15', '123 Main Street, City, State', 'SBIN1234', 5000, hash, 'SAVINGS']
    );
    
    console.log('Test account created:');
    console.log('Account Number:', accountNum);
    console.log('Email: test@example.com');
    console.log('DOB: 1995-05-15');
    console.log('Address: 123 Main Street, City, State');
    console.log('Password: password123');
    
    conn.release();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

createTestAccount();
