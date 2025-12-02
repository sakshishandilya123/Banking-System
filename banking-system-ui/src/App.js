import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Login from './components/auth/Login';
import AdminLogin from './components/auth/AdminLogin';
import CreateAccount from './components/auth/CreateAccount';
import Dashboard from './components/user/Dashboard';
import Transactions from './components/user/Transactions';
import Transfer from './components/user/Transfer';
import AccountDetails from './components/user/AccountDetails';
import AdminDashboard from './components/admin/AdminDashboard';
import AccountManagement from './components/admin/AccountManagement';
import SystemStats from './components/admin/SystemStats';
import AllTransactions from './components/admin/AllTransactions';
// Admin support component removed

// Services
import { getCurrentUser, isAdminLoggedIn, logout } from './services/auth';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const user = getCurrentUser();
    const admin = isAdminLoggedIn();
    
    setCurrentUser(user);
    setIsAdmin(admin);
    setLoading(false);
  }, []);

  const handleLogin = (userData, admin = false) => {
    setCurrentUser(userData);
    setIsAdmin(admin);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setIsAdmin(false);
  };

  // Function to update user balance after transactions
  const updateUserBalance = (newBalance) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, balance: newBalance };
      setCurrentUser(updatedUser);
      // Also update in localStorage
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <Header 
        currentUser={currentUser} 
        isAdmin={isAdmin} 
        onLogout={handleLogout} 
      />
      
      <main className="main-content">
        <div className="container">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                !currentUser ? (
                  <Login onLogin={handleLogin} />
                ) : (
                  <Navigate to={isAdmin ? "/admin" : "/dashboard"} />
                )
              } 
            />
            <Route 
              path="/admin-login" 
              element={
                !isAdmin ? (
                  <AdminLogin onLogin={handleLogin} />
                ) : (
                  <Navigate to="/admin" />
                )
              } 
            />
            <Route 
              path="/create-account" 
              element={
                !currentUser ? (
                  <CreateAccount />
                ) : (
                  <Navigate to="/dashboard" />
                )
              } 
            />

            {/* User Routes */}
            <Route 
              path="/dashboard" 
              element={
                currentUser && !isAdmin ? (
                  <Dashboard user={currentUser} />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />
            <Route 
              path="/transactions" 
              element={
                currentUser && !isAdmin ? (
                  <Transactions user={currentUser} />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />
            <Route 
              path="/transfer" 
              element={
                currentUser && !isAdmin ? (
                  <Transfer user={currentUser} onBalanceUpdate={updateUserBalance} />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />
            <Route 
              path="/account" 
              element={
                currentUser && !isAdmin ? (
                  <AccountDetails user={currentUser} />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />

            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                isAdmin ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to="/admin-login" />
                )
              } 
            />
            <Route 
              path="/admin/accounts" 
              element={
                isAdmin ? (
                  <AccountManagement />
                ) : (
                  <Navigate to="/admin-login" />
                )
              } 
            />
            <Route 
              path="/admin/stats" 
              element={
                isAdmin ? (
                  <SystemStats />
                ) : (
                  <Navigate to="/admin-login" />
                )
              } 
            />
            <Route 
              path="/admin/transactions" 
              element={
                isAdmin ? (
                  <AllTransactions />
                ) : (
                  <Navigate to="/admin-login" />
                )
              } 
            />
            {/* Admin support route removed */}

            {/* Default Route */}
            <Route 
              path="/" 
              element={
                currentUser ? (
                  <Navigate to={isAdmin ? "/admin" : "/dashboard"} />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;