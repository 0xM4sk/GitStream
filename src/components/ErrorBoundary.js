/**
 * Error Boundary Component
 * Catches and displays errors that occur in the React component tree
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and any error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    // For example: logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__content">
              <div className="error-boundary__icon">💥</div>
              <h1 className="error-boundary__title">Oops! Something went wrong</h1>
              <p className="error-boundary__message">
                We're sorry, but an unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="error-boundary__details">
                  <summary>Error Details (Development Mode)</summary>
                  <pre className="error-boundary__error-text">
                    {this.state.error && this.state.error.toString()}
                    <br />
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="error-boundary__actions">
                <button 
                  className="error-boundary__btn error-boundary__btn--primary"
                  onClick={this.handleReload}
                >
                  Reload Page
                </button>
                <button 
                  className="error-boundary__btn error-boundary__btn--secondary"
                  onClick={this.handleGoHome}
                >
                  Go Home
                </button>
              </div>
            </div>
            
            <div className="error-boundary__footer">
              <p>
                Need help? <a href="mailto:support@gitstream.com">Contact Support</a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;