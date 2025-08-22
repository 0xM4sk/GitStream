/**
 * Dashboard Page Component
 * Main landing page after authentication
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserProfile from '../components/UserProfile';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div className="dashboard__header-content">
          <div className="dashboard__logo">
            <h1>GitStream Portal</h1>
            <p>Knowledge Base & RAG System</p>
          </div>
          
          <div className="dashboard__user-menu">
            <UserProfile 
              compact={true} 
              showLogout={true}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard__main">
        <div className="dashboard__container">
          {/* Welcome Section */}
          <section className="dashboard__welcome">
            <h2>Welcome back, {user?.givenName || user?.name || 'User'}!</h2>
            <p>
              You're successfully authenticated and ready to access the GitStream knowledge portal.
              Your authentication was completed using <strong>{user?.provider === 'COGNITO' ? 'Email/Password' : user?.provider}</strong>.
            </p>
          </section>

          {/* Quick Actions */}
          <section className="dashboard__quick-actions">
            <h3>Quick Actions</h3>
            <div className="dashboard__action-grid">
              <div className="dashboard__action-card">
                <div className="dashboard__action-icon">📊</div>
                <h4>View Analytics</h4>
                <p>Access your usage analytics and insights</p>
                <button className="dashboard__action-btn" disabled>
                  Coming Soon
                </button>
              </div>
              
              <div className="dashboard__action-card">
                <div className="dashboard__action-icon">🔍</div>
                <h4>Search Knowledge Base</h4>
                <p>Find information across all your documents</p>
                <button className="dashboard__action-btn" disabled>
                  Coming Soon
                </button>
              </div>
              
              <div className="dashboard__action-card">
                <div className="dashboard__action-icon">👤</div>
                <h4>Manage Profile</h4>
                <p>Update your profile and account settings</p>
                <Link to="/profile" className="dashboard__action-btn">
                  View Profile
                </Link>
              </div>
              
              <div className="dashboard__action-card">
                <div className="dashboard__action-icon">📚</div>
                <h4>Browse Documents</h4>
                <p>Explore your document collection</p>
                <button className="dashboard__action-btn" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </section>

          {/* Authentication Info */}
          <section className="dashboard__auth-info">
            <h3>Authentication Status</h3>
            <div className="dashboard__auth-card">
              <div className="dashboard__auth-status">
                <span className="dashboard__status-indicator dashboard__status-indicator--success">✅</span>
                <span className="dashboard__status-text">Successfully Authenticated</span>
              </div>
              
              <div className="dashboard__auth-details">
                <div className="dashboard__auth-detail">
                  <label>Provider:</label>
                  <span>{user?.provider === 'COGNITO' ? 'Email/Password' : user?.provider}</span>
                </div>
                <div className="dashboard__auth-detail">
                  <label>Email:</label>
                  <span>{user?.email}</span>
                </div>
                <div className="dashboard__auth-detail">
                  <label>Email Verified:</label>
                  <span>{user?.emailVerified ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div className="dashboard__auth-detail">
                  <label>User ID:</label>
                  <span className="dashboard__user-id">{user?.id}</span>
                </div>
              </div>
            </div>
          </section>

          {/* System Status */}
          <section className="dashboard__system-status">
            <h3>System Status</h3>
            <div className="dashboard__status-grid">
              <div className="dashboard__status-item">
                <span className="dashboard__status-indicator dashboard__status-indicator--success">●</span>
                <span>Authentication Service</span>
                <span className="dashboard__status-label">Operational</span>
              </div>
              <div className="dashboard__status-item">
                <span className="dashboard__status-indicator dashboard__status-indicator--warning">●</span>
                <span>Knowledge Portal</span>
                <span className="dashboard__status-label">Under Development</span>
              </div>
              <div className="dashboard__status-item">
                <span className="dashboard__status-indicator dashboard__status-indicator--warning">●</span>
                <span>RAG System</span>
                <span className="dashboard__status-label">Under Development</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard__footer">
        <div className="dashboard__footer-content">
          <p>&copy; 2025 GitStream. All rights reserved.</p>
          <div className="dashboard__footer-links">
            <a href="mailto:support@gitstream.com">Support</a>
            <a href="#" onClick={(e) => { e.preventDefault(); }}>Documentation</a>
            <a href="#" onClick={(e) => { e.preventDefault(); }}>Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;