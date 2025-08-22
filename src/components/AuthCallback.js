/**
 * Authentication Callback Component
 * Handles OAuth callback and redirects to appropriate page
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/AuthCallback.css';

const AuthCallback = ({ onSuccess, onError }) => {
  const { handleOAuthCallback, isLoading } = useAuth();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    processCallback();
  }, []);

  /**
   * Process the OAuth callback
   */
  const processCallback = async () => {
    try {
      setStatus('processing');
      setMessage('Processing authentication...');
      setError(null);

      // Check for error parameters in URL
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (errorParam) {
        throw new Error(errorDescription || `OAuth error: ${errorParam}`);
      }

      // Handle the OAuth callback
      const result = await handleOAuthCallback();

      if (result.success) {
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        // Redirect after a short delay
        setTimeout(() => {
          onSuccess && onSuccess(result);
        }, 2000);
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setError(error.message);
      setMessage('Authentication failed');
      
      onError && onError({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Retry the authentication process
   */
  const handleRetry = () => {
    processCallback();
  };

  /**
   * Redirect back to login
   */
  const handleBackToLogin = () => {
    // Clear the URL parameters and redirect to login
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.href = '/';
  };

  return (
    <div className="auth-callback">
      <div className="auth-callback__container">
        <div className="auth-callback__content">
          {/* Processing State */}
          {status === 'processing' && (
            <div className="auth-callback__processing">
              <div className="auth-callback__spinner">
                <div className="auth-callback__spinner-ring"></div>
              </div>
              <h2 className="auth-callback__title">Authenticating...</h2>
              <p className="auth-callback__message">{message}</p>
              <div className="auth-callback__progress">
                <div className="auth-callback__progress-bar"></div>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="auth-callback__success">
              <div className="auth-callback__success-icon">✅</div>
              <h2 className="auth-callback__title">Authentication Successful!</h2>
              <p className="auth-callback__message">{message}</p>
              <div className="auth-callback__success-animation">
                <div className="auth-callback__checkmark">
                  <svg viewBox="0 0 52 52" className="auth-callback__checkmark-svg">
                    <circle 
                      className="auth-callback__checkmark-circle" 
                      cx="26" 
                      cy="26" 
                      r="25" 
                      fill="none"
                    />
                    <path 
                      className="auth-callback__checkmark-check" 
                      fill="none" 
                      d="m14.1 27.2l7.1 7.2 16.7-16.8"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="auth-callback__error">
              <div className="auth-callback__error-icon">❌</div>
              <h2 className="auth-callback__title">Authentication Failed</h2>
              <p className="auth-callback__message">{message}</p>
              
              {error && (
                <div className="auth-callback__error-details">
                  <p className="auth-callback__error-text">{error}</p>
                </div>
              )}

              <div className="auth-callback__error-actions">
                <button
                  className="auth-callback__btn auth-callback__btn--primary"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  {isLoading ? 'Retrying...' : 'Try Again'}
                </button>
                
                <button
                  className="auth-callback__btn auth-callback__btn--secondary"
                  onClick={handleBackToLogin}
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="auth-callback__footer">
          <p className="auth-callback__footer-text">
            Having trouble? <a href="mailto:support@gitstream.com">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;