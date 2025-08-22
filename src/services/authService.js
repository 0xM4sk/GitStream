import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import { Auth } from '@aws-amplify/auth';
import passwordValidator from '../utils/passwordValidation.js';
import cognitoService from './cognitoService.js';

// Configuration from environment variables
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

// Configure Amplify Auth
Auth.configure({
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolWebClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
  authenticationFlowType: 'USER_SRP_AUTH',
  oauth: {
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    scope: ['email', 'profile', 'openid'],
    redirectSignIn: import.meta.env.VITE_REDIRECT_SIGN_IN || window.location.origin + '/auth/callback',
    redirectSignOut: import.meta.env.VITE_REDIRECT_SIGN_OUT || window.location.origin + '/auth/logout',
    responseType: 'code',
  },
});

/**
 * Authentication service for email/password and OAuth flows
 */
class AuthService {
  /**
   * Register a new user with email and password
   */
  async registerWithEmail(email, password, firstName, lastName, options = {}) {
    const { validatePassword: shouldValidate = true, additionalAttributes = {} } = options;
    
    // Validate password before attempting registration
    if (shouldValidate) {
      const userInfo = {
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
      };
      
      const passwordValidation = passwordValidator.validate(password, userInfo);
      if (!passwordValidation.isValid) {
        throw {
          code: 'InvalidPasswordException',
          name: 'InvalidPasswordException',
          message: 'Password does not meet requirements',
          validationErrors: passwordValidation.feedback,
          requirements: passwordValidation.requirements,
        };
      }
    }

    // Check for existing users with the same email across providers
    try {
      await this.checkForDuplicateEmail(email);
    } catch (error) {
      if (error.code === 'UsernameExistsException') {
        throw error;
      }
      // Continue if it's just a check error
    }

    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({
          Name: 'email',
          Value: email,
        }),
        new CognitoUserAttribute({
          Name: 'email_verified',
          Value: 'false', // Will be verified through confirmation process
        }),
        new CognitoUserAttribute({
          Name: 'given_name',
          Value: firstName,
        }),
        new CognitoUserAttribute({
          Name: 'family_name',
          Value: lastName,
        }),
        new CognitoUserAttribute({
          Name: 'custom:oauth_provider',
          Value: 'email',
        }),
        new CognitoUserAttribute({
          Name: 'custom:last_login_provider',
          Value: 'email',
        }),
        new CognitoUserAttribute({
          Name: 'custom:registration_date',
          Value: new Date().toISOString(),
        }),
        // Add any additional custom attributes
        ...Object.entries(additionalAttributes).map(([name, value]) => 
          new CognitoUserAttribute({
            Name: name.startsWith('custom:') ? name : `custom:${name}`,
            Value: value,
          })
        ),
      ];

      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
          console.error('Registration error:', err);
          reject(this.handleCognitoError(err));
          return;
        }

        // Log registration event
        this.logSecurityEvent('user_registration', {
          email,
          userSub: result.userSub,
          provider: 'email',
          timestamp: new Date().toISOString(),
        });

        resolve({
          user: result.user,
          userConfirmed: result.userConfirmed,
          userSub: result.userSub,
          needsConfirmation: !result.userConfirmed,
          email,
          registrationDate: new Date().toISOString(),
        });
      });
    });
  }

  /**
   * Confirm user email verification
   */
  async confirmEmailVerification(email, confirmationCode) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
        if (err) {
          console.error('Email confirmation error:', err);
          reject(this.handleCognitoError(err));
          return;
        }

        resolve({
          success: true,
          message: 'Email confirmed successfully',
          result,
        });
      });
    });
  }

  /**
   * Resend email verification code
   */
  async resendEmailVerification(email) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          console.error('Resend verification error:', err);
          reject(this.handleCognitoError(err));
          return;
        }

        resolve({
          success: true,
          message: 'Verification code sent',
          destination: result.CodeDeliveryDetails.Destination,
        });
      });
    });
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email, password, options = {}) {
    const { rememberDevice = false, clientMetadata = {} } = options;
    
    return new Promise((resolve, reject) => {
      const authenticationData = {
        Username: email,
        Password: password,
        ClientMetadata: {
          ...clientMetadata,
          loginAttemptTime: new Date().toISOString(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
      };

      const authenticationDetails = new AuthenticationDetails(authenticationData);

      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          // Update last login provider and timestamp
          this.updateUserAttribute(cognitoUser, 'custom:last_login_provider', 'email');
          this.updateUserAttribute(cognitoUser, 'custom:last_login_date', new Date().toISOString());

          // Log successful login
          this.logSecurityEvent('user_login_success', {
            email,
            provider: 'email',
            timestamp: new Date().toISOString(),
            deviceRemembered: rememberDevice,
          });

          const userAttributes = this.extractUserAttributes(result.getIdToken().payload);

          resolve({
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
            user: cognitoUser,
            userAttributes,
            loginTimestamp: new Date().toISOString(),
            tokenExpiration: new Date(result.getAccessToken().getExpiration() * 1000).toISOString(),
          });
        },
        onFailure: (err) => {
          console.error('Sign in error:', err);
          
          // Log failed login attempt
          this.logSecurityEvent('user_login_failure', {
            email,
            provider: 'email',
            error: err.code || err.name,
            timestamp: new Date().toISOString(),
          });

          reject(this.handleCognitoError(err));
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // This case handles users created by admin who need to set a new password
          this.logSecurityEvent('user_password_change_required', {
            email,
            timestamp: new Date().toISOString(),
          });

          resolve({
            requiresNewPassword: true,
            userAttributes,
            requiredAttributes,
            user: cognitoUser,
          });
        },
        mfaRequired: (challengeName, challengeParameters) => {
          this.logSecurityEvent('user_mfa_challenge', {
            email,
            challengeName,
            timestamp: new Date().toISOString(),
          });

          resolve({
            requiresMFA: true,
            challengeName,
            challengeParameters,
            user: cognitoUser,
          });
        },
        totpRequired: (challengeName, challengeParameters) => {
          this.logSecurityEvent('user_totp_challenge', {
            email,
            challengeName,
            timestamp: new Date().toISOString(),
          });

          resolve({
            requiresTOTP: true,
            challengeName,
            challengeParameters,
            user: cognitoUser,
          });
        },
        selectMFAType: (challengeName, challengeParameters) => {
          this.logSecurityEvent('user_mfa_selection_required', {
            email,
            challengeName,
            timestamp: new Date().toISOString(),
          });

          resolve({
            requiresMFASelection: true,
            challengeName,
            challengeParameters,
            user: cognitoUser,
          });
        },
      });
    });
  }

  /**
   * Complete new password requirement (for admin-created users)
   */
  async completeNewPasswordChallenge(cognitoUser, newPassword, requiredAttributes = {}) {
    return new Promise((resolve, reject) => {
      cognitoUser.completeNewPasswordChallenge(newPassword, requiredAttributes, {
        onSuccess: (result) => {
          resolve({
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
            userAttributes: this.extractUserAttributes(result.getIdToken().payload),
          });
        },
        onFailure: (err) => {
          console.error('New password challenge error:', err);
          reject(this.handleCognitoError(err));
        },
      });
    });
  }

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(email) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.forgotPassword({
        onSuccess: (data) => {
          resolve({
            success: true,
            message: 'Password reset code sent',
            destination: data.CodeDeliveryDetails.Destination,
          });
        },
        onFailure: (err) => {
          console.error('Password reset initiation error:', err);
          reject(this.handleCognitoError(err));
        },
      });
    });
  }

  /**
   * Confirm password reset with verification code
   */
  async confirmPasswordReset(email, verificationCode, newPassword) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmPassword(verificationCode, newPassword, {
        onSuccess: () => {
          resolve({
            success: true,
            message: 'Password reset successfully',
          });
        },
        onFailure: (err) => {
          console.error('Password reset confirmation error:', err);
          reject(this.handleCognitoError(err));
        },
      });
    });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(oldPassword, newPassword) {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();

      if (!cognitoUser) {
        reject(new Error('No authenticated user found'));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(this.handleCognitoError(err));
          return;
        }

        if (!session.isValid()) {
          reject(new Error('Invalid session'));
          return;
        }

        cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
          if (err) {
            console.error('Change password error:', err);
            reject(this.handleCognitoError(err));
            return;
          }

          resolve({
            success: true,
            message: 'Password changed successfully',
            result,
          });
        });
      });
    });
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
      
      // Also sign out from Amplify Auth for OAuth users
      await Auth.signOut();
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      return {
        user,
        attributes: await Auth.userAttributes(user),
        session: await Auth.currentSession(),
      };
    } catch (error) {
      // Try fallback to Cognito Identity SDK
      return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
          reject(new Error('No current user'));
          return;
        }

        cognitoUser.getSession((err, session) => {
          if (err) {
            reject(this.handleCognitoError(err));
            return;
          }

          if (!session.isValid()) {
            reject(new Error('Invalid session'));
            return;
          }

          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              reject(this.handleCognitoError(err));
              return;
            }

            resolve({
              user: cognitoUser,
              attributes: this.formatUserAttributes(attributes),
              session,
            });
          });
        });
      });
    }
  }

  /**
   * Refresh user session
   */
  async refreshSession() {
    try {
      const session = await Auth.currentSession();
      return session;
    } catch (error) {
      console.error('Session refresh error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * OAuth sign in with provider
   */
  async signInWithOAuth(provider) {
    try {
      await Auth.federatedSignIn({ provider });
    } catch (error) {
      console.error('OAuth sign in error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const attributes = await Auth.userAttributes(user);
      
      // Update last login provider for OAuth users
      const provider = this.getOAuthProvider(user);
      if (provider) {
        await this.updateUserAttribute(user, 'custom:last_login_provider', provider);
      }

      return {
        user,
        attributes: this.formatUserAttributes(attributes),
        session: await Auth.currentSession(),
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Helper: Update user attribute
   */
  async updateUserAttribute(cognitoUser, attributeName, attributeValue) {
    return new Promise((resolve, reject) => {
      const attribute = new CognitoUserAttribute({
        Name: attributeName,
        Value: attributeValue,
      });

      cognitoUser.updateAttributes([attribute], (err, result) => {
        if (err) {
          console.error('Update attribute error:', err);
          reject(this.handleCognitoError(err));
          return;
        }
        resolve(result);
      });
    });
  }

  /**
   * Helper: Extract user attributes from JWT payload
   */
  extractUserAttributes(payload) {
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      givenName: payload.given_name,
      familyName: payload.family_name,
      name: `${payload.given_name} ${payload.family_name}`,
      picture: payload.picture,
      oauthProvider: payload['custom:oauth_provider'],
      lastLoginProvider: payload['custom:last_login_provider'],
    };
  }

  /**
   * Helper: Format user attributes array to object
   */
  formatUserAttributes(attributes) {
    const formatted = {};
    attributes.forEach(attr => {
      if (attr.Name && attr.Value) {
        formatted[attr.Name.replace('custom:', '')] = attr.Value;
      }
    });
    return formatted;
  }

  /**
   * Helper: Get OAuth provider from user
   */
  getOAuthProvider(user) {
    const identities = user.signInUserSession?.idToken?.payload?.identities;
    if (identities && identities.length > 0) {
      return identities[0].providerName.toLowerCase();
    }
    return null;
  }

  /**
   * Validate password using the password validation utility
   */
  validatePassword(password, userInfo = {}) {
    return passwordValidator.validate(password, userInfo);
  }

  /**
   * Quick password validation for real-time feedback
   */
  quickValidatePassword(password) {
    return passwordValidator.quickValidate(password);
  }

  /**
   * Get password strength information
   */
  getPasswordStrength(password) {
    const result = passwordValidator.validate(password);
    return {
      strength: result.strength,
      score: result.score,
      estimatedCrackTime: result.estimatedCrackTime,
    };
  }

  /**
   * Check for duplicate email across providers
   */
  async checkForDuplicateEmail(email) {
    try {
      // Use the advanced Cognito service to check for existing users
      const users = await cognitoService.listUsers({
        filter: `email = "${email}"`,
        limit: 1,
      });

      if (users.users && users.users.length > 0) {
        const existingUser = users.users[0];
        const provider = existingUser.attributes.oauth_provider || 'unknown';
        
        throw {
          code: 'UsernameExistsException',
          name: 'UsernameExistsException',
          message: `An account with this email already exists (registered via ${provider})`,
          existingProvider: provider,
        };
      }
    } catch (error) {
      // If it's our custom duplicate error, re-throw it
      if (error.code === 'UsernameExistsException') {
        throw error;
      }
      
      // For other errors (like permission issues), log and continue
      console.warn('Could not check for duplicate email:', error);
    }
  }

  /**
   * Log security events (for audit and monitoring)
   */
  logSecurityEvent(eventType, eventData) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ipAddress: 'client-side', // Would need server-side implementation for real IP
      ...eventData,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.info('Security Event:', event);
    }

    // In production, this could send to CloudWatch, Splunk, etc.
    // For now, store in localStorage for basic audit trail
    try {
      const existingEvents = JSON.parse(localStorage.getItem('auth_security_events') || '[]');
      existingEvents.push(event);
      
      // Keep only last 100 events to prevent storage overflow
      const recentEvents = existingEvents.slice(-100);
      localStorage.setItem('auth_security_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Could not log security event:', error);
    }
  }

  /**
   * Get security audit log
   */
  getSecurityAuditLog() {
    try {
      return JSON.parse(localStorage.getItem('auth_security_events') || '[]');
    } catch (error) {
      console.warn('Could not retrieve security audit log:', error);
      return [];
    }
  }

  /**
   * Clear security audit log
   */
  clearSecurityAuditLog() {
    try {
      localStorage.removeItem('auth_security_events');
    } catch (error) {
      console.warn('Could not clear security audit log:', error);
    }
  }

  /**
   * Enhanced user session management
   */
  async validateSession() {
    try {
      const user = await this.getCurrentUser();
      
      // Check if session is still valid
      if (user.session && user.session.isValid()) {
        // Check if token is close to expiration (within 5 minutes)
        const accessToken = user.session.getAccessToken();
        const expirationTime = accessToken.getExpiration() * 1000;
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;
        
        if (timeUntilExpiration < 300000) { // 5 minutes
          // Attempt to refresh the session
          try {
            await this.refreshSession();
          } catch (refreshError) {
            console.warn('Could not refresh session:', refreshError);
            throw new Error('Session expired and could not be refreshed');
          }
        }
        
        return {
          valid: true,
          user: user.user,
          attributes: user.attributes,
          expiresAt: new Date(expirationTime).toISOString(),
          timeUntilExpiration: Math.max(0, timeUntilExpiration),
        };
      } else {
        throw new Error('Invalid session');
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Advanced password recovery with additional security checks
   */
  async initiateSecurePasswordReset(email, options = {}) {
    const { includeSecurityQuestions = false, clientMetadata = {} } = options;
    
    // Log password reset attempt
    this.logSecurityEvent('password_reset_initiated', {
      email,
      timestamp: new Date().toISOString(),
      includeSecurityQuestions,
    });

    try {
      const result = await this.initiatePasswordReset(email);
      
      // Enhanced result with additional security information
      return {
        ...result,
        securityRecommendations: [
          'Check your email and spam folder for the reset code',
          'The reset code will expire in 15 minutes',
          'Do not share the reset code with anyone',
          'Choose a strong, unique password',
        ],
        estimatedDeliveryTime: '1-2 minutes',
      };
    } catch (error) {
      // Log failed password reset
      this.logSecurityEvent('password_reset_failed', {
        email,
        error: error.code || error.name,
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  }

  /**
   * Account recovery with multiple verification methods
   */
  async initiateAccountRecovery(identifier, recoveryMethod = 'email') {
    const supportedMethods = ['email', 'sms', 'security_questions'];
    
    if (!supportedMethods.includes(recoveryMethod)) {
      throw new Error(`Unsupported recovery method: ${recoveryMethod}`);
    }

    this.logSecurityEvent('account_recovery_initiated', {
      identifier,
      method: recoveryMethod,
      timestamp: new Date().toISOString(),
    });

    // For now, only email recovery is implemented
    if (recoveryMethod === 'email') {
      return this.initiateSecurePasswordReset(identifier);
    } else {
      throw new Error(`Recovery method '${recoveryMethod}' is not yet implemented`);
    }
  }

  /**
   * Enhanced user attribute management
   */
  async updateUserAttributes(attributes, verifyChanges = true) {
    try {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        throw new Error('No authenticated user found');
      }

      // Validate email format if email is being updated
      if (attributes.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(attributes.email)) {
          throw new Error('Invalid email format');
        }
      }

      const attributeList = Object.entries(attributes).map(([name, value]) => {
        return new CognitoUserAttribute({
          Name: name,
          Value: value,
        });
      });

      return new Promise((resolve, reject) => {
        cognitoUser.updateAttributes(attributeList, (err, result) => {
          if (err) {
            console.error('Update attributes error:', err);
            reject(this.handleCognitoError(err));
            return;
          }

          // Log attribute update
          this.logSecurityEvent('user_attributes_updated', {
            updatedAttributes: Object.keys(attributes),
            timestamp: new Date().toISOString(),
          });

          resolve({
            success: true,
            result,
            updatedAttributes: Object.keys(attributes),
            requiresVerification: result === 'SUCCESS' ? false : true,
          });
        });
      });
    } catch (error) {
      console.error('Update user attributes error:', error);
      throw error;
    }
  }

  /**
   * Helper: Handle Cognito errors with user-friendly messages
   */
  handleCognitoError(error) {
    const errorMessages = {
      'UsernameExistsException': 'An account with this email already exists',
      'InvalidPasswordException': 'Password does not meet requirements',
      'InvalidParameterException': 'Invalid parameters provided',
      'CodeMismatchException': 'Invalid verification code',
      'ExpiredCodeException': 'Verification code has expired',
      'NotAuthorizedException': 'Incorrect username or password',
      'UserNotConfirmedException': 'Account not verified. Please check your email for verification code',
      'UserNotFoundException': 'No account found with this email',
      'TooManyRequestsException': 'Too many requests. Please try again later',
      'TooManyFailedAttemptsException': 'Too many failed attempts. Please try again later',
      'CodeDeliveryFailureException': 'Failed to send verification code',
      'LimitExceededException': 'Attempt limit exceeded. Please try again later',
      'PasswordResetRequiredException': 'Password reset required',
      'UserLambdaValidationException': 'User validation failed',
    };

    const userMessage = errorMessages[error.code] || error.message || 'An unexpected error occurred';

    return {
      code: error.code,
      name: error.name,
      message: userMessage,
      originalMessage: error.message,
    };
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;