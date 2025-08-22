/**
 * Main App Component
 * Handles routing and authentication state management
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import AuthLogin from './components/AuthLogin';
import AuthCallback from './components/AuthCallback';
import UserProfile from './components/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import EmailPasswordLogin from './components/EmailPasswordLogin';
import EmailPasswordRegister from './components/EmailPasswordRegister';
import PasswordReset from './components/PasswordReset';
import EmailVerification from './components/EmailVerification';
import './styles/App.css';
import './styles/auth.css';

function App() {
  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = (result) => {
    console.log('Authentication successful:', result);
    // Redirect will be handled by ProtectedRoute
  };

  /**
   * Handle authentication error
   */
  const handleAuthError = (error) => {
    console.error('Authentication error:', error);
    // Error state is handled by individual components
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    console.log('User logged out');
    // Redirect to login page will happen automatically
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="app">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <AuthLogin 
                    onSuccess={handleAuthSuccess}
                    onError={handleAuthError}
                  />
                } 
              />
              
              <Route 
                path="/auth/login" 
                element={
                  <EmailPasswordLogin 
                    onSuccess={handleAuthSuccess}
                  />
                } 
              />
              
              <Route 
                path="/auth/register" 
                element={
                  <EmailPasswordRegister 
                    onSuccess={handleAuthSuccess}
                  />
                } 
              />
              
              <Route 
                path="/auth/forgot-password" 
                element={<PasswordReset />} 
              />
              
              <Route 
                path="/auth/verify-email" 
                element={<EmailVerification />} 
              />
              
              <Route 
                path="/auth/callback" 
                element={
                  <AuthCallback 
                    onSuccess={handleAuthSuccess}
                    onError={handleAuthError}
                  />
                } 
              />
              
              <Route 
                path="/auth/logout" 
                element={<Navigate to="/login" replace />} 
              />

              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <div className="app__page">
                      <div className="app__header">
                        <h1>User Profile</h1>
                      </div>
                      <UserProfile 
                        showLogout={true}
                        onLogout={handleLogout}
                      />
                    </div>
                  </ProtectedRoute>
                } 
              />

              {/* Default Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;