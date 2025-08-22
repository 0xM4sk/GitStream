/**
 * Advanced Cognito Service
 * 
 * Provides advanced Cognito SDK integration utilities and administrative functions
 * beyond the basic authentication flows provided by authService.js
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminSetUserPasswordCommand,
  AdminConfirmSignUpCommand,
  AdminResendConfirmationCodeCommand,
  ListUsersCommand,
  DescribeUserPoolCommand,
  UpdateUserPoolCommand,
  GetUserAttributeVerificationCodeCommand,
  VerifyUserAttributeCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminResetUserPasswordCommand,
  AdminSetUserMFAPreferenceCommand,
  AdminInitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Configuration
const config = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
};

/**
 * Advanced Cognito Service Class
 * 
 * Provides administrative and advanced user management capabilities
 * for the Cognito User Pool
 */
class CognitoService {
  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
      // Note: In production, use appropriate AWS credentials configuration
      // This assumes the app has proper IAM roles configured
    });
  }

  /**
   * Administrative Functions
   */

  /**
   * Create a new user administratively
   */
  async adminCreateUser(userData) {
    const { email, tempPassword, attributes = {}, sendInvite = true } = userData;
    
    try {
      const userAttributes = [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        ...Object.entries(attributes).map(([name, value]) => ({
          Name: name,
          Value: value,
        })),
      ];

      const command = new AdminCreateUserCommand({
        UserPoolId: config.userPoolId,
        Username: email,
        UserAttributes: userAttributes,
        TemporaryPassword: tempPassword,
        MessageAction: sendInvite ? 'SEND' : 'SUPPRESS',
        ForceAliasCreation: false,
      });

      const result = await this.client.send(command);
      
      return {
        success: true,
        user: result.User,
        username: result.User.Username,
        userStatus: result.User.UserStatus,
        needsPasswordChange: result.User.UserStatus === 'FORCE_CHANGE_PASSWORD',
      };
    } catch (error) {
      console.error('Admin create user error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Delete a user administratively
   */
  async adminDeleteUser(username) {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('Admin delete user error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Update user attributes administratively
   */
  async adminUpdateUserAttributes(username, attributes) {
    try {
      const userAttributes = Object.entries(attributes).map(([name, value]) => ({
        Name: name,
        Value: value,
      }));

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        UserAttributes: userAttributes,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'User attributes updated successfully',
      };
    } catch (error) {
      console.error('Admin update user attributes error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Get user details administratively
   */
  async adminGetUser(username) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      });

      const result = await this.client.send(command);
      
      return {
        username: result.Username,
        userStatus: result.UserStatus,
        enabled: result.Enabled,
        created: result.UserCreateDate,
        lastModified: result.UserLastModifiedDate,
        attributes: this.formatUserAttributes(result.UserAttributes || []),
        mfaOptions: result.MFAOptions || [],
      };
    } catch (error) {
      console.error('Admin get user error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Set user password administratively (permanent)
   */
  async adminSetUserPassword(username, password, permanent = true) {
    try {
      const command = new AdminSetUserPasswordCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        Password: password,
        Permanent: permanent,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'Password set successfully',
      };
    } catch (error) {
      console.error('Admin set user password error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Confirm user sign up administratively
   */
  async adminConfirmSignUp(username) {
    try {
      const command = new AdminConfirmSignUpCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'User confirmed successfully',
      };
    } catch (error) {
      console.error('Admin confirm sign up error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Disable user account administratively
   */
  async adminDisableUser(username) {
    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'User disabled successfully',
      };
    } catch (error) {
      console.error('Admin disable user error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Enable user account administratively
   */
  async adminEnableUser(username) {
    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'User enabled successfully',
      };
    } catch (error) {
      console.error('Admin enable user error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * User Pool Management Functions
   */

  /**
   * List users in the user pool
   */
  async listUsers(options = {}) {
    const { limit = 20, paginationToken, filter } = options;
    
    try {
      const command = new ListUsersCommand({
        UserPoolId: config.userPoolId,
        Limit: limit,
        PaginationToken: paginationToken,
        Filter: filter,
      });

      const result = await this.client.send(command);
      
      return {
        users: result.Users?.map(user => ({
          username: user.Username,
          userStatus: user.UserStatus,
          enabled: user.Enabled,
          created: user.UserCreateDate,
          lastModified: user.UserLastModifiedDate,
          attributes: this.formatUserAttributes(user.Attributes || []),
        })) || [],
        paginationToken: result.PaginationToken,
      };
    } catch (error) {
      console.error('List users error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Get user pool configuration
   */
  async getUserPoolConfig() {
    try {
      const command = new DescribeUserPoolCommand({
        UserPoolId: config.userPoolId,
      });

      const result = await this.client.send(command);
      
      return {
        userPool: result.UserPool,
        policies: result.UserPool?.Policies,
        mfaConfiguration: result.UserPool?.MfaConfiguration,
        emailConfiguration: result.UserPool?.EmailConfiguration,
        smsConfiguration: result.UserPool?.SmsConfiguration,
      };
    } catch (error) {
      console.error('Get user pool config error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Advanced Authentication Functions
   */

  /**
   * Initiate admin authentication flow
   */
  async adminInitiateAuth(username, password, authFlow = 'ADMIN_NO_SRP_AUTH') {
    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: config.userPoolId,
        ClientId: config.clientId,
        AuthFlow: authFlow,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const result = await this.client.send(command);
      
      return {
        challengeName: result.ChallengeName,
        challengeParameters: result.ChallengeParameters,
        authenticationResult: result.AuthenticationResult,
        session: result.Session,
      };
    } catch (error) {
      console.error('Admin initiate auth error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Respond to authentication challenge
   */
  async respondToAuthChallenge(challengeName, challengeResponses, session) {
    try {
      const command = new RespondToAuthChallengeCommand({
        ClientId: config.clientId,
        ChallengeName: challengeName,
        ChallengeResponses: challengeResponses,
        Session: session,
      });

      const result = await this.client.send(command);
      
      return {
        challengeName: result.ChallengeName,
        challengeParameters: result.ChallengeParameters,
        authenticationResult: result.AuthenticationResult,
        session: result.Session,
      };
    } catch (error) {
      console.error('Respond to auth challenge error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Group Management Functions
   */

  /**
   * List groups for a user
   */
  async adminListGroupsForUser(username) {
    try {
      const command = new AdminListGroupsForUserCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      });

      const result = await this.client.send(command);
      
      return {
        groups: result.Groups?.map(group => ({
          groupName: group.GroupName,
          description: group.Description,
          roleArn: group.RoleArn,
          precedence: group.Precedence,
          created: group.CreationDate,
          lastModified: group.LastModifiedDate,
        })) || [],
      };
    } catch (error) {
      console.error('Admin list groups for user error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Add user to group
   */
  async adminAddUserToGroup(username, groupName) {
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        GroupName: groupName,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: `User added to group ${groupName} successfully`,
      };
    } catch (error) {
      console.error('Admin add user to group error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Remove user from group
   */
  async adminRemoveUserFromGroup(username, groupName) {
    try {
      const command = new AdminRemoveUserFromGroupCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        GroupName: groupName,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: `User removed from group ${groupName} successfully`,
      };
    } catch (error) {
      console.error('Admin remove user from group error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * MFA Management Functions
   */

  /**
   * Set user MFA preference
   */
  async adminSetUserMFAPreference(username, mfaOptions) {
    const { sms = {}, totp = {} } = mfaOptions;
    
    try {
      const command = new AdminSetUserMFAPreferenceCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        SMSMfaSettings: sms.enabled ? {
          Enabled: sms.enabled,
          PreferredMfa: sms.preferred || false,
        } : undefined,
        SoftwareTokenMfaSettings: totp.enabled ? {
          Enabled: totp.enabled,
          PreferredMfa: totp.preferred || false,
        } : undefined,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'MFA preferences updated successfully',
      };
    } catch (error) {
      console.error('Admin set user MFA preference error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Password Recovery Functions
   */

  /**
   * Reset user password administratively
   */
  async adminResetUserPassword(username, sendNotification = true) {
    try {
      const command = new AdminResetUserPasswordCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      });

      await this.client.send(command);
      
      return {
        success: true,
        message: 'Password reset initiated. User will receive a temporary password.',
      };
    } catch (error) {
      console.error('Admin reset user password error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Resend confirmation code administratively
   */
  async adminResendConfirmationCode(username) {
    try {
      const command = new AdminResendConfirmationCodeCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        ClientId: config.clientId,
      });

      const result = await this.client.send(command);
      
      return {
        success: true,
        destination: result.CodeDeliveryDetails?.Destination,
        attributeName: result.CodeDeliveryDetails?.AttributeName,
        deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium,
      };
    } catch (error) {
      console.error('Admin resend confirmation code error:', error);
      throw this.handleCognitoError(error);
    }
  }

  /**
   * Utility Functions
   */

  /**
   * Format user attributes array to object
   */
  formatUserAttributes(attributes) {
    const formatted = {};
    attributes.forEach(attr => {
      if (attr.Name && attr.Value !== undefined) {
        // Remove 'custom:' prefix for cleaner object keys
        const key = attr.Name.replace('custom:', '');
        formatted[key] = attr.Value;
      }
    });
    return formatted;
  }

  /**
   * Validate user pool configuration
   */
  async validateConfiguration() {
    try {
      if (!config.userPoolId || !config.clientId) {
        throw new Error('Missing required Cognito configuration');
      }

      // Test connection by getting user pool info
      await this.getUserPoolConfig();
      
      return {
        valid: true,
        userPoolId: config.userPoolId,
        clientId: config.clientId,
        region: config.region,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        config: {
          userPoolId: !!config.userPoolId,
          clientId: !!config.clientId,
          region: config.region,
        },
      };
    }
  }

  /**
   * Enhanced error handling for AWS SDK v3
   */
  handleCognitoError(error) {
    // Map AWS SDK v3 error codes to user-friendly messages
    const errorMessages = {
      'UserNotFoundException': 'User not found',
      'UsernameExistsException': 'An account with this email already exists',
      'InvalidPasswordException': 'Password does not meet requirements',
      'InvalidParameterException': 'Invalid parameters provided',
      'CodeMismatchException': 'Invalid verification code',
      'ExpiredCodeException': 'Verification code has expired',
      'NotAuthorizedException': 'Access denied',
      'UserNotConfirmedException': 'Account not verified',
      'TooManyRequestsException': 'Too many requests. Please try again later',
      'TooManyFailedAttemptsException': 'Too many failed attempts',
      'LimitExceededException': 'Attempt limit exceeded',
      'InternalErrorException': 'Internal service error',
      'ResourceNotFoundException': 'Resource not found',
      'InvalidUserPoolConfigurationException': 'Invalid user pool configuration',
      'UnsupportedUserStateException': 'User state not supported for this operation',
      'UserPoolTaggingException': 'User pool tagging error',
      'AliasExistsException': 'Alias already exists',
      'UserImportInProgressException': 'User import in progress',
      'MessageActionNotSupportedException': 'Message action not supported',
      'ConcurrentModificationException': 'Concurrent modification detected',
    };

    const errorName = error.name || error.constructor?.name;
    const userMessage = errorMessages[errorName] || error.message || 'An unexpected error occurred';

    return {
      name: errorName,
      code: error.$metadata?.httpStatusCode || 'UNKNOWN',
      message: userMessage,
      originalMessage: error.message,
      requestId: error.$metadata?.requestId,
    };
  }
}

// Export singleton instance
const cognitoService = new CognitoService();
export default cognitoService;