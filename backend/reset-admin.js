const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAdminPassword() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Sandeepreddy@123',
    database: process.env.DB_NAME || 'banking_simulator'
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Delete existing admin user
    await connection.execute('DELETE FROM admin_users WHERE username = ?', ['admin']);
    
    // Create new admin user with password 'admin'
    const adminPassword = 'admin';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    
    await connection.execute(`
      INSERT INTO admin_users (username, password_hash, full_name, role) 
      VALUES (?, ?, ?, ?)
    `, ['admin', adminPasswordHash, 'System Administrator', 'SUPER_ADMIN']);

    console.log('=== ADMIN PASSWORD RESET ===');
    console.log('Username: admin');
    console.log('Password: admin');
    console.log('Password has been reset successfully!');
    console.log('===========================');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error);
    process.exit(1);
  }
}

resetAdminPassword();