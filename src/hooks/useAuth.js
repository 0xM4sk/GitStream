/**
 * Authentication Hook
 * Provides authentication state and methods to React components
 */

import { useState, useEffect, useContext, createContext } from 'react';
import authService from '../services/authService';

// Create authentication context
const AuthContext = createContext();

// Authentication states
export const AUTH_STATES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error'
};

/**
 * Authentication Provider Component
 */
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication service and check current user
   */
  const initializeAuth = async () => {
    try {
      setAuthState(AUTH_STATES.LOADING);
      setError(null);

      // Initialize auth service
      const initialized = await authService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize authentication service');
      }

      // Check for existing authentication
      const currentUser = await authService.checkCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        setAuthState(AUTH_STATES.AUTHENTICATED);
      } else {
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError(error.message);
      setAuthState(AUTH_STATES.ERROR);
      setIsInitialized(true);
    }
  };

  /**
   * Sign in with email and password
   */
  const signInWithEmailPassword = async (email, password) => {
    try {
      setError(null);
      const result = await authService.signInWithEmailPassword(email, password);
      
      if (result.success) {
        setUser(result.user);
        setAuthState(AUTH_STATES.AUTHENTICATED);
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      const errorMessage = 'Failed to sign in';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = async (provider) => {
    try {
      setError(null);
      const result = await authService.signInWithOAuth(provider);
      
      if (result.redirecting) {
        // Don't update state as we're redirecting
        return result;
      }
      
      if (result.success) {
        setUser(result.user);
        setAuthState(AUTH_STATES.AUTHENTICATED);
      } else {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = `Failed to sign in with ${provider}`;
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Handle OAuth callback
   */
  const handleOAuthCallback = async () => {
    try {
      setError(null);
      const result = await authService.handleOAuthCallback();
      
      if (result.success) {
        setUser(result.user);
        setAuthState(AUTH_STATES.AUTHENTICATED);
      } else {
        setError(result.message);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to complete OAuth authentication';
      setError(errorMessage);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Sign up new user
   */
  const signUp = async (email, password, givenName, familyName) => {
    try {
      setError(null);
      const result = await authService.signUp(email, password, givenName, familyName);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to sign up';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Confirm sign up with verification code
   */
  const confirmSignUp = async (email, code) => {
    try {
      setError(null);
      const result = await authService.confirmSignUp(email, code);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to verify email';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Sign out user
   */
  const signOut = async (global = false) => {
    try {
      setError(null);
      const result = global 
        ? await authService.globalSignOut() 
        : await authService.signOut();
      
      setUser(null);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to sign out';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      setError(null);
      const currentUser = await authService.getUserProfile();
      
      if (currentUser) {
        setUser(currentUser);
        setAuthState(AUTH_STATES.AUTHENTICATED);
      } else {
        setUser(null);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
      }
      
      return currentUser;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setError('Failed to refresh user data');
      return null;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (attributes) => {
    try {
      setError(null);
      const result = await authService.updateUserProfile(attributes);
      
      if (result.success) {
        // Refresh user data
        await refreshUser();
      } else {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to update profile';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Change password
   */
  const changePassword = async (oldPassword, newPassword) => {
    try {
      setError(null);
      const result = await authService.changePassword(oldPassword, newPassword);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to change password';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Request password reset
   */
  const forgotPassword = async (email) => {
    try {
      setError(null);
      const result = await authService.forgotPassword(email);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to request password reset';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Confirm password reset
   */
  const forgotPasswordSubmit = async (email, code, newPassword) => {
    try {
      setError(null);
      const result = await authService.forgotPasswordSubmit(email, code, newPassword);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Failed to reset password';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  const value = {
    // State
    authState,
    user,
    error,
    isInitialized,
    isAuthenticated: authState === AUTH_STATES.AUTHENTICATED,
    isLoading: authState === AUTH_STATES.LOADING,
    
    // Actions
    signInWithEmailPassword,
    signInWithOAuth,
    handleOAuthCallback,
    signUp,
    confirmSignUp,
    signOut,
    refreshUser,
    updateProfile,
    changePassword,
    forgotPassword,
    forgotPasswordSubmit,
    clearError,
    
    // Utilities
    initializeAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;