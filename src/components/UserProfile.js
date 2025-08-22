/**
 * User Profile Component
 * Displays user information and authentication provider details
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/UserProfile.css';

const UserProfile = ({ showLogout = true, compact = false, onLogout }) => {
  const { user, signOut, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);

  /**
   * Handle user logout
   */
  const handleLogout = async (global = false) => {
    try {
      setIsSigningOut(true);
      const result = await signOut(global);
      
      if (result.success) {
        onLogout && onLogout(result);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  /**
   * Get provider display information
   */
  const getProviderInfo = (provider) => {
    const providers = {
      'Google': {
        name: 'Google',
        icon: '🔍',
        color: '#4285f4',
        description: 'Signed in with Google account'
      },
      'Microsoft': {
        name: 'Microsoft',
        icon: '🪟',
        color: '#00a1f1',
        description: 'Signed in with Microsoft account'
      },
      'LinkedIn': {
        name: 'LinkedIn',
        icon: '💼',
        color: '#0077b5',
        description: 'Signed in with LinkedIn account'
      },
      'COGNITO': {
        name: 'Email',
        icon: '📧',
        color: '#667eea',
        description: 'Signed in with email and password'
      }
    };

    return providers[provider] || {
      name: provider || 'Unknown',
      icon: '🔐',
      color: '#718096',
      description: 'Signed in with external provider'
    };
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  /**
   * Get user initials for avatar fallback
   */
  const getUserInitials = () => {
    if (!user) return '';
    
    const firstName = user.givenName || '';
    const lastName = user.familyName || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '👤';
  };

  if (!user) {
    return (
      <div className="user-profile user-profile--loading">
        <div className="user-profile__loading">
          <span className="user-profile__spinner">⏳</span>
          <span>Loading user profile...</span>
        </div>
      </div>
    );
  }

  const providerInfo = getProviderInfo(user.provider);

  // Compact view for navigation bars, etc.
  if (compact) {
    return (
      <div className="user-profile user-profile--compact">
        <div className="user-profile__compact-content">
          <div className="user-profile__avatar user-profile__avatar--small">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={`${user.name} profile`}
                className="user-profile__avatar-image"
              />
            ) : (
              <span className="user-profile__avatar-initials">
                {getUserInitials()}
              </span>
            )}
          </div>
          
          <div className="user-profile__compact-info">
            <div className="user-profile__name">{user.name || user.email}</div>
            <div className="user-profile__provider-badge">
              <span className="user-profile__provider-icon">{providerInfo.icon}</span>
              <span className="user-profile__provider-name">{providerInfo.name}</span>
            </div>
          </div>

          {showLogout && (
            <button
              className="user-profile__logout-btn user-profile__logout-btn--compact"
              onClick={() => handleLogout()}
              disabled={isSigningOut || isLoading}
              title="Sign out"
            >
              {isSigningOut ? '⏳' : '🚪'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full profile view
  return (
    <div className="user-profile">
      <div className="user-profile__container">
        <div className="user-profile__header">
          <div className="user-profile__avatar">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={`${user.name} profile`}
                className="user-profile__avatar-image"
              />
            ) : (
              <span className="user-profile__avatar-initials">
                {getUserInitials()}
              </span>
            )}
          </div>
          
          <div className="user-profile__header-info">
            <h2 className="user-profile__name">{user.name || 'Unknown User'}</h2>
            <p className="user-profile__email">{user.email}</p>
            
            <div className="user-profile__provider-info">
              <span 
                className="user-profile__provider-badge"
                style={{ borderColor: providerInfo.color }}
              >
                <span className="user-profile__provider-icon">{providerInfo.icon}</span>
                <span className="user-profile__provider-text">{providerInfo.description}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="user-profile__details">
          <button
            className="user-profile__details-toggle"
            onClick={() => setShowFullProfile(!showFullProfile)}
          >
            <span>Profile Details</span>
            <span className={`user-profile__chevron ${showFullProfile ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>

          {showFullProfile && (
            <div className="user-profile__details-content">
              <div className="user-profile__detail-row">
                <span className="user-profile__detail-label">User ID:</span>
                <span className="user-profile__detail-value">{user.id}</span>
              </div>
              
              <div className="user-profile__detail-row">
                <span className="user-profile__detail-label">First Name:</span>
                <span className="user-profile__detail-value">{user.givenName || 'N/A'}</span>
              </div>
              
              <div className="user-profile__detail-row">
                <span className="user-profile__detail-label">Last Name:</span>
                <span className="user-profile__detail-value">{user.familyName || 'N/A'}</span>
              </div>
              
              <div className="user-profile__detail-row">
                <span className="user-profile__detail-label">Email Verified:</span>
                <span className="user-profile__detail-value">
                  {user.emailVerified ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              
              <div className="user-profile__detail-row">
                <span className="user-profile__detail-label">Auth Provider:</span>
                <span className="user-profile__detail-value">{user.provider}</span>
              </div>
              
              {user.lastLoginProvider && (
                <div className="user-profile__detail-row">
                  <span className="user-profile__detail-label">Last Login:</span>
                  <span className="user-profile__detail-value">{user.lastLoginProvider}</span>
                </div>
              )}
              
              {user.createdAt && (
                <div className="user-profile__detail-row">
                  <span className="user-profile__detail-label">Account Created:</span>
                  <span className="user-profile__detail-value">{formatDate(user.createdAt)}</span>
                </div>
              )}
              
              {user.updatedAt && (
                <div className="user-profile__detail-row">
                  <span className="user-profile__detail-label">Last Updated:</span>
                  <span className="user-profile__detail-value">{formatDate(user.updatedAt)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {showLogout && (
          <div className="user-profile__actions">
            <div className="user-profile__logout-section">
              <h3>Sign Out</h3>
              <p className="user-profile__logout-description">
                Choose how you'd like to sign out:
              </p>
              
              <div className="user-profile__logout-buttons">
                <button
                  className="user-profile__logout-btn user-profile__logout-btn--local"
                  onClick={() => handleLogout(false)}
                  disabled={isSigningOut || isLoading}
                >
                  {isSigningOut ? (
                    <>
                      <span className="user-profile__spinner">⏳</span>
                      Signing out...
                    </>
                  ) : (
                    <>
                      <span>🚪</span>
                      Sign out (this device)
                    </>
                  )}
                </button>
                
                <button
                  className="user-profile__logout-btn user-profile__logout-btn--global"
                  onClick={() => handleLogout(true)}
                  disabled={isSigningOut || isLoading}
                >
                  {isSigningOut ? (
                    <>
                      <span className="user-profile__spinner">⏳</span>
                      Signing out...
                    </>
                  ) : (
                    <>
                      <span>🌐</span>
                      Sign out (all devices)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;