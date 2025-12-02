import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <p>&copy; 2024 SecureBank. All rights reserved.</p>
          <p className="mt-2">Secure Online Banking System</p>
          <div className="mt-2">
            <small>
              This is a demonstration application. Not a real banking system.
            </small>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;