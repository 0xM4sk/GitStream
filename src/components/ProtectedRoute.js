/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AUTH_STATES } from '../hooks/useAuth';

const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { authState, isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  // Show loading state while auth is initializing
  if (!isInitialized || authState === AUTH_STATES.LOADING) {
    return (
      <div className="protected-route__loading">
        <div className="protected-route__spinner">⏳</div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Render the protected component
  return children;
};

export default ProtectedRoute;