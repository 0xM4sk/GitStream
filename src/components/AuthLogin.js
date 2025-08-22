/**
 * Authentication Login Component
 * Provides login interface with OAuth provider selection and email/password option
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { oauthProviders } from '../utils/cognitoConfig';
import EmailPasswordLogin from './EmailPasswordLogin';
import EmailPasswordRegister from './EmailPasswordRegister';
import '../styles/AuthLogin.css';
import '../styles/auth.css';

const AuthLogin = ({ onSuccess, onError }) => {
  const { signInWithEmailPassword, signInWithOAuth, error, clearError, isLoading } = useAuth();
  
  // Form state
  const [loginMode, setLoginMode] = useState('oauth'); // 'oauth', 'email', or 'register'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  // Clear errors when component mounts or mode changes
  useEffect(() => {
    clearError();
    setLocalError('');
  }, [loginMode, clearError]);

  /**
   * Handle switching between login and register
   */
  const handleSwitchToRegister = () => {
    setLoginMode('register');
    setLocalError('');
  };

  const handleSwitchToLogin = () => {
    setLoginMode('email');
    setLocalError('');
  };

  /**
   * Handle OAuth provider login
   */
  const handleOAuthLogin = async (provider) => {
    try {
      setIsSubmitting(true);
      setLocalError('');
      
      const result = await signInWithOAuth(provider);
      
      if (result.success || result.redirecting) {
        onSuccess && onSuccess(result);
      } else {
        setLocalError(result.message);
        onError && onError(result);
      }
    } catch (error) {
      const errorMessage = `Failed to sign in with ${provider}`;
      setLocalError(errorMessage);
      onError && onError({ success: false, message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle successful authentication from EmailPasswordLogin
   */
  const handleEmailAuthSuccess = (result) => {
    onSuccess && onSuccess(result);
  };

  /**
   * Get provider icon/logo
   */
  const getProviderIcon = (provider) => {
    const icons = {
      google: '🔍',
      microsoft: '🪟',
      linkedin: '💼',
      cognito: '📧'
    };
    return icons[provider] || '🔐';
  };

  /**
   * Get provider display name
   */
  const getProviderDisplayName = (provider) => {
    const names = {
      google: 'Google',
      microsoft: 'Microsoft',
      linkedin: 'LinkedIn',
      cognito: 'Email & Password'
    };
    return names[provider] || provider;
  };

  const displayError = localError || error;

  return (
    <div className="auth-login">
      <div className="auth-login__container">
        <div className="auth-login__header">
          <h1>Welcome to GitStream</h1>
          <p>Sign in to access your knowledge portal</p>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="auth-login__error">
            <span className="auth-login__error-icon">⚠️</span>
            <span className="auth-login__error-text">{displayError}</span>
          </div>
        )}

        {/* Login Mode Selector */}
        <div className="auth-login__mode-selector">
          <button
            type="button"
            className={`auth-login__mode-btn ${loginMode === 'oauth' ? 'active' : ''}`}
            onClick={() => setLoginMode('oauth')}
            disabled={isSubmitting}
          >
            OAuth Providers
          </button>
          <button
            type="button"
            className={`auth-login__mode-btn ${loginMode === 'email' ? 'active' : ''}`}
            onClick={() => setLoginMode('email')}
            disabled={isSubmitting}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-login__mode-btn ${loginMode === 'register' ? 'active' : ''}`}
            onClick={() => setLoginMode('register')}
            disabled={isSubmitting}
          >
            Sign Up
          </button>
        </div>

        {/* OAuth Provider Login */}
        {loginMode === 'oauth' && (
          <div className="auth-login__oauth-section">
            <p className="auth-login__oauth-description">
              Choose your preferred sign-in method:
            </p>
            
            <div className="auth-login__provider-buttons">
              {Object.entries(oauthProviders).map(([key, provider]) => (
                <button
                  key={key}
                  type="button"
                  className="auth-login__provider-btn"
                  onClick={() => handleOAuthLogin(key)}
                  disabled={isSubmitting || isLoading}
                >
                  <span className="auth-login__provider-icon">
                    {getProviderIcon(key)}
                  </span>
                  <span className="auth-login__provider-text">
                    Continue with {getProviderDisplayName(key)}
                  </span>
                  {isSubmitting && (
                    <span className="auth-login__spinner">⏳</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email/Password Login */}
        {loginMode === 'email' && (
          <div className="auth-login__email-section">
            <EmailPasswordLogin
              onSuccess={handleEmailAuthSuccess}
              onSwitchToRegister={handleSwitchToRegister}
            />
          </div>
        )}

        {/* Email/Password Registration */}
        {loginMode === 'register' && (
          <div className="auth-login__register-section">
            <EmailPasswordRegister
              onSuccess={handleEmailAuthSuccess}
              onSwitchToLogin={handleSwitchToLogin}
            />
          </div>
        )}

        {/* Footer */}
        <div className="auth-login__footer">
          <p className="auth-login__footer-text">
            New to GitStream? Contact your administrator for access.
          </p>
          <p className="auth-login__footer-help">
            Need help? <a href="mailto:support@gitstream.com">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLogin;