# LinkedIn OAuth Setup Guide

## Overview

This guide provides step-by-step instructions for setting up a LinkedIn application for OAuth authentication with AWS Cognito User Pools. This enables users to sign in to your GitStream application using their LinkedIn accounts (professional networking profiles).

## Prerequisites

- LinkedIn account (personal or company account)
- Access to LinkedIn Developers portal
- Basic understanding of OAuth 2.0 / OpenID Connect
- AWS Cognito User Pool already configured (see cognito-user-pool.yaml)

## Step 1: Navigate to LinkedIn Developers Portal

1. Go to the [LinkedIn Developers Portal](https://www.linkedin.com/developers/)
2. Sign in with your LinkedIn account
3. Click **"Create app"** or navigate to **"My apps"** and click **"Create app"**

## Step 2: Create New LinkedIn Application

### Basic Information
1. Fill in the application details:
   - **App name**: `GitStream Authentication`
   - **LinkedIn Page**: Select your company page (required) or create one
     - If you don't have a company page, you'll need to create one first
     - For personal projects, you can create a basic company page
   - **Privacy policy URL**: `https://gitstream.com/privacy` (replace with your actual privacy policy)
   - **App logo**: Upload a logo (recommended size: 300x300px)

2. Check the **"I agree to LinkedIn API Terms of Use"**
3. Click **"Create app"**

## Step 3: Configure OAuth Settings

### Application Settings
1. In your newly created app, go to the **"Settings"** tab
2. Note the **App ID** - you'll need this as your Client ID
3. Under **"OAuth 2.0 settings"**:
   - **Authorized Redirect URLs for your app**: Add all necessary callback URLs:
     ```
     https://auth.gitstream.com/oauth2/idpresponse
     https://auth-staging.gitstream.com/oauth2/idpresponse
     https://auth-dev.gitstream.com/oauth2/idpresponse
     http://localhost:3000/auth/callback (for development)
     ```

### Auth Tab Configuration
1. Click on the **"Auth"** tab
2. Under **"OAuth 2.0 Client Credentials"**:
   - **Client ID**: This is auto-generated (same as App ID)
   - **Client Secret**: Click **"Generate a client secret"**
   - **IMPORTANT**: Copy the client secret immediately - it won't be shown again

3. Under **"OAuth 2.0 Authorized Redirect URLs"**:
   - Verify all your redirect URLs are listed
   - Add any missing URLs and click **"Update"**

## Step 4: Request Required API Products

LinkedIn requires explicit approval for accessing user data. You need to request access to specific products:

### Sign In with LinkedIn using OpenID Connect
1. Go to the **"Products"** tab in your app dashboard
2. Find **"Sign In with LinkedIn using OpenID Connect"**
3. Click **"Request access"**
4. This product provides:
   - `openid` scope
   - `profile` scope  
   - `email` scope
   - Basic profile information

### Application Review Process
- LinkedIn will review your application (typically takes 1-7 business days)
- Provide clear use case description
- Ensure your app complies with LinkedIn's API policies
- You may need to provide additional documentation about your use case

### Development vs Production
- During development, you can test with your own LinkedIn account
- For production use, you must complete the review process
- Some features may be limited until approval

## Step 5: Configure API Permissions and Scopes

### Required Scopes
For basic authentication, you need these scopes:
- `openid` - Required for OpenID Connect authentication
- `profile` - Access to basic profile information (name, profile picture)
- `email` - Access to email address

### Additional Optional Scopes
Depending on your application needs:
- `r_liteprofile` - Access to lite profile (for older API versions)
- `r_emailaddress` - Access to email address (for older API versions)

**Note**: LinkedIn is transitioning to OpenID Connect, so prefer the OpenID scopes over the legacy r_* scopes.

## Step 6: Collect Required Information

From your LinkedIn app, collect the following information:

### Client ID (App ID)
- Found on the **Settings** tab or **Auth** tab
- Example: `1234567890abcdef`

### Client Secret
- Generated in the **Auth** tab
- Example: `abcdefghijklmnop`

### OpenID Connect Discovery Document
- LinkedIn OpenID Connect endpoint: `https://www.linkedin.com/oauth/.well-known/openid_configuration`
- This provides all necessary endpoints automatically

## Step 7: Configure AWS Cognito

### Environment Variables
Set these environment variables for your deployment:

```bash
export LINKEDIN_CLIENT_ID="1234567890abcdef"
export LINKEDIN_CLIENT_SECRET="abcdefghijklmnop"
```

### CloudFormation Deployment
When deploying the CloudFormation template, provide these parameters:

```bash
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-auth-dev \
  --parameter-overrides \
    Environment=dev \
    CustomDomain=auth-dev.gitstream.com \
    CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/... \
    GoogleClientId=$GOOGLE_CLIENT_ID \
    GoogleClientSecret=$GOOGLE_CLIENT_SECRET \
    MicrosoftClientId=$MICROSOFT_CLIENT_ID \
    MicrosoftClientSecret=$MICROSOFT_CLIENT_SECRET \
    LinkedInClientId=$LINKEDIN_CLIENT_ID \
    LinkedInClientSecret=$LINKEDIN_CLIENT_SECRET \
    CallbackUrls="https://auth-dev.gitstream.com/oauth2/idpresponse,http://localhost:3000/auth/callback" \
    LogoutUrls="https://auth-dev.gitstream.com/logout,http://localhost:3000/auth/logout"
```

## Step 8: Test the Integration

### Manual Testing
1. Deploy your CloudFormation template with LinkedIn credentials
2. Go to your Cognito Hosted UI: `https://auth-dev.gitstream.com/login`
3. Click "Sign in with LinkedIn"
4. You should be redirected to LinkedIn's authorization page
5. After successful authentication, you should be redirected back to your application

### User Information Available
After successful authentication, you'll receive:
- **sub**: Unique LinkedIn user identifier
- **given_name**: User's first name
- **family_name**: User's last name
- **email**: User's email address
- **picture**: User's profile picture URL
- **locale**: User's locale preference

## Step 9: Troubleshooting Common Issues

### Issue: "The redirect_uri does not match"
**Solution**: 
- Verify redirect URI in LinkedIn app exactly matches Cognito callback URL
- Ensure URLs use HTTPS in production
- Check for trailing slashes or case sensitivity

### Issue: "invalid_client_id or client_secret"
**Solution**:
- Verify Client ID and Client Secret are correctly copied
- Check for extra spaces or characters
- Regenerate client secret if needed

### Issue: "insufficient_scope"
**Solution**:
- Ensure your app has been approved for required products
- Verify scopes in your OAuth configuration match approved permissions
- Wait for LinkedIn review process to complete

### Issue: "Application not approved"
**Solution**:
- Complete LinkedIn's review process
- Provide detailed use case description
- Ensure compliance with LinkedIn API policies

### Development Mode Limitations
- Only app developers can test during review period
- Limited number of test accounts
- Some features may be restricted

## Security Best Practices

### Client Secret Management
- Store client secrets securely using AWS Secrets Manager
- Rotate secrets periodically
- Never expose secrets in client-side code or public repositories

### Scope Management
- Request only the minimum required scopes
- Regularly review permissions and remove unused ones
- Follow principle of least privilege

### API Rate Limits
- LinkedIn has rate limits on API calls
- Implement proper error handling for rate limit responses
- Cache user information appropriately

## LinkedIn API Compliance

### Terms of Service
- Review and comply with LinkedIn API Terms of Service
- Ensure proper attribution when displaying LinkedIn data
- Respect user privacy and data protection regulations

### Data Usage
- Only use data for stated purposes in your application
- Implement proper data retention policies
- Provide clear privacy policy to users

### Branding Guidelines
- Follow LinkedIn's branding guidelines for login buttons
- Use approved LinkedIn logos and styling
- Maintain consistent user experience

## Monitoring and Analytics

### LinkedIn Analytics
- Monitor app usage in LinkedIn Developer Portal
- Track authentication success/failure rates
- Review API usage and rate limiting

### AWS CloudWatch Integration
- Monitor Cognito authentication events
- Set up alarms for high failure rates
- Track user registration and sign-in patterns

## Additional Resources

- [LinkedIn Developers Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [LinkedIn OAuth 2.0 Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [LinkedIn OpenID Connect Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/openid-connect)
- [AWS Cognito federated identities documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/external-identity-providers.html)

## Support and Common Questions

### How long does LinkedIn app review take?
- Typically 1-7 business days
- Can be longer during high-volume periods
- Provide complete and accurate information to speed up process

### Can I test before approval?
- Yes, developers of the app can test with their own accounts
- Limited functionality until full approval
- Cannot onboard external users during review

### What if my app is rejected?
- Review rejection reasons carefully
- Address all mentioned issues
- Resubmit with detailed explanations of changes

## Next Steps

After completing this setup:
1. Wait for LinkedIn application approval (if required)
2. Test the OAuth flow end-to-end with approved account
3. Implement proper error handling for authentication failures
4. Set up monitoring and alerting for authentication events
5. Consider implementing user profile caching for better performance