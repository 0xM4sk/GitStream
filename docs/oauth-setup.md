# OAuth Integration Setup Guide

This guide provides comprehensive instructions for setting up OAuth providers with AWS Cognito for the GitStream application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Microsoft Azure OAuth Setup](#microsoft-azure-oauth-setup)
5. [LinkedIn OAuth Setup](#linkedin-oauth-setup)
6. [Facebook OAuth Setup](#facebook-oauth-setup)
7. [Amazon OAuth Setup](#amazon-oauth-setup)
8. [Configuration Files](#configuration-files)
9. [Environment Variables](#environment-variables)
10. [Testing and Validation](#testing-and-validation)
11. [Troubleshooting](#troubleshooting)
12. [Security Best Practices](#security-best-practices)

## Overview

GitStream uses AWS Cognito as the authentication provider with support for multiple OAuth identity providers. This document covers the setup and configuration of each supported provider.

### Supported Providers
- **Google** - Primary OAuth provider
- **Microsoft Azure AD** - Enterprise authentication
- **LinkedIn** - Professional network integration
- **Facebook** - Social authentication
- **Amazon** - Login with Amazon

## Prerequisites

Before setting up OAuth providers, ensure you have:

1. **AWS Account** with Cognito permissions
2. **Domain ownership** for custom domains
3. **SSL certificate** configured in AWS Certificate Manager
4. **CloudFormation/CDK** deployment pipeline ready
5. **Developer accounts** for each OAuth provider

## Google OAuth Setup

### 1. Google Cloud Console Configuration

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google+ API
   - Google Identity API
   - OpenID Connect API

### 2. Create OAuth 2.0 Credentials

```bash
# Create OAuth client via gcloud CLI (alternative to console)
gcloud auth login
gcloud projects create gitstream-oauth --name="GitStream OAuth"
gcloud config set project gitstream-oauth
gcloud services enable plus.googleapis.com
gcloud services enable openidconnect.googleapis.com
```

### 3. Configure Authorized Redirect URIs

Add the following redirect URIs based on your environment:

**Development:**
- `http://localhost:3000/auth/callback`
- `http://localhost:3001/auth/callback`
- `https://auth-dev.gitstream.com/oauth2/idpresponse`

**Staging:**
- `https://staging.gitstream.com/auth/callback`
- `https://auth-staging.gitstream.com/oauth2/idpresponse`

**Production:**
- `https://gitstream.com/auth/callback`
- `https://auth.gitstream.com/oauth2/idpresponse`

### 4. Environment Variables

```bash
# Google OAuth credentials
export GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Microsoft Azure OAuth Setup

### 1. Azure AD App Registration

1. Go to [Azure AD Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Navigate to "App registrations"
3. Click "New registration"
4. Configure the application:
   - **Name:** GitStream OAuth
   - **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI:** Web platform with your callback URLs

### 2. Authentication Configuration

```json
{
  "redirectUris": [
    "https://auth.gitstream.com/oauth2/idpresponse",
    "https://auth-staging.gitstream.com/oauth2/idpresponse",
    "https://auth-dev.gitstream.com/oauth2/idpresponse"
  ],
  "logoutUrl": "https://auth.gitstream.com/logout"
}
```

### 3. API Permissions

Grant the following Microsoft Graph permissions:
- `openid` (Sign users in)
- `profile` (View users' basic profile)
- `email` (View users' email address)

### 4. Client Secret Generation

1. Go to "Certificates & secrets"
2. Create a new client secret
3. Copy the value immediately (it won't be shown again)

### 5. Environment Variables

```bash
# Microsoft OAuth credentials
export MICROSOFT_CLIENT_ID="your-azure-application-id"
export MICROSOFT_CLIENT_SECRET="your-azure-client-secret"
```

## LinkedIn OAuth Setup

### 1. LinkedIn Developer App

1. Visit [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Fill in the required information:
   - **App name:** GitStream
   - **LinkedIn Page:** Your company page
   - **Privacy policy URL:** https://gitstream.com/privacy
   - **App logo:** Upload your app logo

### 2. OAuth 2.0 Settings

Configure OAuth settings:
- **Authorized redirect URLs:** Add your callback URLs
- **OAuth 2.0 scopes:** Request `openid`, `profile`, `email`

### 3. Products and Permissions

Request access to:
- **OpenID Connect API**
- **Profile API**
- **Email Address API**

### 4. Environment Variables

```bash
# LinkedIn OAuth credentials
export LINKEDIN_CLIENT_ID="your-linkedin-client-id"
export LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
```

## Facebook OAuth Setup

### 1. Facebook App Creation

1. Go to [Facebook for Developers](https://developers.facebook.com/apps)
2. Create a new app
3. Choose "Consumer" app type
4. Add Facebook Login product

### 2. Facebook Login Configuration

```json
{
  "validOAuthRedirectURIs": [
    "https://auth.gitstream.com/oauth2/idpresponse",
    "https://auth-staging.gitstream.com/oauth2/idpresponse",
    "https://auth-dev.gitstream.com/oauth2/idpresponse"
  ]
}
```

### 3. Permissions and Features

Request the following permissions:
- `public_profile` (default)
- `email`

### 4. Environment Variables

```bash
# Facebook OAuth credentials
export FACEBOOK_APP_ID="your-facebook-app-id"
export FACEBOOK_APP_SECRET="your-facebook-app-secret"
```

## Amazon OAuth Setup

### 1. Login with Amazon Configuration

1. Visit [Login with Amazon](https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html)
2. Create a new Security Profile
3. Configure the security profile with your app details

### 2. Web Settings Configuration

```json
{
  "allowedReturnURLs": [
    "https://auth.gitstream.com/oauth2/idpresponse",
    "https://auth-staging.gitstream.com/oauth2/idpresponse",
    "https://auth-dev.gitstream.com/oauth2/idpresponse"
  ]
}
```

### 3. Environment Variables

```bash
# Amazon OAuth credentials
export AMAZON_CLIENT_ID="your-amazon-client-id"
export AMAZON_CLIENT_SECRET="your-amazon-client-secret"
```

## Configuration Files

### oauth-providers.json

This file contains the complete configuration for all OAuth providers. Key sections include:

```json
{
  "providers": {
    "google": { ... },
    "microsoft": { ... },
    "linkedin": { ... }
  },
  "environment_config": {
    "development": { ... },
    "staging": { ... },
    "production": { ... }
  },
  "security_configuration": { ... }
}
```

### cognito-config.json

Contains AWS Cognito-specific configuration:

```json
{
  "cognito": {
    "user_pool": { ... },
    "user_pool_client": { ... },
    "identity_providers": { ... }
  }
}
```

## Environment Variables

Create environment-specific configuration files:

### Development (.env.development)

```bash
# Environment
ENVIRONMENT=development
COGNITO_DOMAIN=auth-dev.gitstream.com
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/dev-cert-id

# Callback URLs
CALLBACK_URLS=http://localhost:3000/auth/callback,https://auth-dev.gitstream.com/oauth2/idpresponse
LOGOUT_URLS=http://localhost:3000/auth/logout,https://auth-dev.gitstream.com/logout

# OAuth Provider Credentials
GOOGLE_CLIENT_ID=dev-google-client-id
GOOGLE_CLIENT_SECRET=dev-google-client-secret
MICROSOFT_CLIENT_ID=dev-microsoft-client-id
MICROSOFT_CLIENT_SECRET=dev-microsoft-client-secret
```

### Staging (.env.staging)

```bash
# Environment
ENVIRONMENT=staging
COGNITO_DOMAIN=auth-staging.gitstream.com
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/staging-cert-id

# Callback URLs
CALLBACK_URLS=https://staging.gitstream.com/auth/callback,https://auth-staging.gitstream.com/oauth2/idpresponse
LOGOUT_URLS=https://staging.gitstream.com/auth/logout,https://auth-staging.gitstream.com/logout

# OAuth Provider Credentials (use staging-specific credentials)
GOOGLE_CLIENT_ID=staging-google-client-id
GOOGLE_CLIENT_SECRET=staging-google-client-secret
```

### Production (.env.production)

```bash
# Environment
ENVIRONMENT=production
COGNITO_DOMAIN=auth.gitstream.com
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/prod-cert-id

# Callback URLs
CALLBACK_URLS=https://gitstream.com/auth/callback,https://auth.gitstream.com/oauth2/idpresponse
LOGOUT_URLS=https://gitstream.com/auth/logout,https://auth.gitstream.com/logout

# OAuth Provider Credentials (use production credentials)
GOOGLE_CLIENT_ID=prod-google-client-id
GOOGLE_CLIENT_SECRET=prod-google-client-secret
```

## Testing and Validation

### 1. Configuration Validation Script

Create a validation script to test your configuration:

```javascript
// config-validator.js
const fs = require('fs');

function validateOAuthConfig() {
    const oauthConfig = JSON.parse(fs.readFileSync('config/oauth-providers.json', 'utf8'));
    const cognitoConfig = JSON.parse(fs.readFileSync('config/cognito-config.json', 'utf8'));
    
    // Validate required environment variables
    const requiredVars = cognitoConfig.validation.required_environment_variables;
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('Missing required environment variables:', missingVars);
        return false;
    }
    
    // Validate callback URLs use HTTPS in production
    if (process.env.ENVIRONMENT === 'production') {
        const callbackUrls = process.env.CALLBACK_URLS.split(',');
        const httpUrls = callbackUrls.filter(url => url.startsWith('http://'));
        
        if (httpUrls.length > 0) {
            console.error('HTTP callback URLs not allowed in production:', httpUrls);
            return false;
        }
    }
    
    console.log('Configuration validation passed');
    return true;
}

if (require.main === module) {
    validateOAuthConfig();
}

module.exports = { validateOAuthConfig };
```

### 2. OAuth Flow Testing

Test each provider individually:

```bash
# Test Google OAuth
curl -X GET "https://auth-dev.gitstream.com/oauth2/authorize?response_type=code&client_id=${COGNITO_CLIENT_ID}&redirect_uri=${CALLBACK_URL}&identity_provider=Google&scope=openid%20email%20profile"

# Test Microsoft OAuth
curl -X GET "https://auth-dev.gitstream.com/oauth2/authorize?response_type=code&client_id=${COGNITO_CLIENT_ID}&redirect_uri=${CALLBACK_URL}&identity_provider=Microsoft&scope=openid%20email%20profile"
```

### 3. End-to-End Integration Test

```javascript
// integration-test.js
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

async function testCognitoIntegration() {
    try {
        // Test user pool configuration
        const userPool = await cognito.describeUserPool({
            UserPoolId: process.env.COGNITO_USER_POOL_ID
        }).promise();
        
        console.log('User Pool Status:', userPool.UserPool.Status);
        
        // Test identity providers
        const providers = await cognito.listIdentityProviders({
            UserPoolId: process.env.COGNITO_USER_POOL_ID
        }).promise();
        
        console.log('Configured Providers:', providers.Providers.map(p => p.ProviderName));
        
    } catch (error) {
        console.error('Integration test failed:', error);
    }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Invalid Redirect URI

**Error:** `redirect_uri_mismatch`

**Solution:**
- Verify redirect URIs in OAuth provider configuration match exactly
- Ensure URIs include protocol (https://)
- Check for trailing slashes

#### 2. Invalid Client Credentials

**Error:** `invalid_client`

**Solution:**
- Verify client ID and secret are correctly set
- Check for extra spaces or special characters
- Ensure credentials are for the correct environment

#### 3. Scope Permissions Denied

**Error:** `insufficient_scope`

**Solution:**
- Review requested scopes in provider configuration
- Ensure your app has been approved for requested permissions
- Check scope spelling and format

#### 4. SSL Certificate Issues

**Error:** `ssl_certificate_verify_failed`

**Solution:**
- Verify SSL certificate is valid and not expired
- Check certificate covers your custom domain
- Ensure certificate is properly linked to Cognito domain

### Debug Logging

Enable debug logging for OAuth flows:

```javascript
// Enable CloudWatch logging
const cognitoConfig = {
    ...baseConfig,
    logging: {
        level: 'DEBUG',
        events: [
            'UserAuthentication_Success',
            'UserAuthentication_Failure',
            'OAuth_TokenExchange_Success',
            'OAuth_TokenExchange_Failure'
        ]
    }
};
```

### Health Check Endpoints

Create health check endpoints for monitoring:

```javascript
// health-check.js
app.get('/health/oauth/:provider', async (req, res) => {
    const { provider } = req.params;
    
    try {
        const providerConfig = oauthConfig.providers[provider];
        
        if (!providerConfig || !providerConfig.enabled) {
            return res.status(404).json({ status: 'not_configured' });
        }
        
        // Test provider availability
        const response = await fetch(providerConfig.configuration.authorize_url);
        
        res.json({
            status: 'healthy',
            provider: provider,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            provider: provider,
            error: error.message
        });
    }
});
```

## Security Best Practices

### 1. Credential Management

- **Never commit secrets to version control**
- Use AWS Secrets Manager for production credentials
- Implement credential rotation policies
- Use different credentials for each environment

### 2. Network Security

- Use HTTPS for all OAuth callbacks
- Implement proper CORS policies
- Set up WAF rules for authentication endpoints
- Monitor for suspicious authentication patterns

### 3. Token Security

- Use short-lived access tokens (60 minutes max)
- Implement refresh token rotation
- Set appropriate token scopes
- Monitor token usage patterns

### 4. Monitoring and Alerting

```json
{
  "cloudwatch_alarms": {
    "failed_oauth_logins": {
      "threshold": 10,
      "period": "5_minutes",
      "action": "alert"
    },
    "unusual_login_patterns": {
      "threshold": 50,
      "period": "1_hour",
      "action": "investigate"
    }
  }
}
```

### 5. Compliance Considerations

- Implement GDPR-compliant data handling
- Support user data deletion requests
- Maintain audit trails for authentication events
- Regular security assessments and penetration testing

## Deployment Checklist

Before deploying OAuth configuration:

- [ ] All environment variables configured
- [ ] SSL certificates validated
- [ ] OAuth provider apps configured
- [ ] Callback URLs tested
- [ ] CloudFormation templates updated
- [ ] Monitoring and alerting configured
- [ ] Security review completed
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Rollback plan prepared

## Support and Resources

### Documentation Links

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [LinkedIn OAuth 2.0](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)

### Contact Information

For additional support or questions:
- Technical Issues: Create a GitHub issue
- Security Concerns: Contact security team
- General Questions: Reference project documentation

---

*Last updated: 2025-08-22*
*Document version: 1.0*