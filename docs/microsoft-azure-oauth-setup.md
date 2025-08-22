# Microsoft Azure AD OAuth Setup Guide

## Overview

This guide provides step-by-step instructions for setting up a Microsoft Azure AD application for OAuth authentication with AWS Cognito User Pools. This enables users to sign in to your GitStream application using their Microsoft accounts (including personal Microsoft accounts, work, and school accounts).

## Prerequisites

- Azure account (free tier is sufficient)
- Access to Azure Active Directory portal
- Basic understanding of OAuth 2.0 / OpenID Connect
- AWS Cognito User Pool already configured (see cognito-user-pool.yaml)

## Step 1: Navigate to Azure AD Portal

1. Go to the [Azure Portal](https://portal.azure.com)
2. Sign in with your Microsoft account
3. Navigate to **Azure Active Directory** from the left sidebar
4. Click on **App registrations** in the left menu

## Step 2: Create New App Registration

1. Click **"+ New registration"** button
2. Fill in the application details:
   - **Name**: `GitStream Authentication`
   - **Supported account types**: Choose one of:
     - **Accounts in any organizational directory and personal Microsoft accounts** (recommended for maximum compatibility)
     - **Accounts in any organizational directory** (work/school accounts only)
     - **Accounts in this organizational directory only** (single tenant)
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `https://auth.gitstream.com/oauth2/idpresponse` (replace with your domain)

3. Click **"Register"** to create the application

## Step 3: Configure Authentication Settings

1. In your newly created app, go to **Authentication** in the left menu
2. Under **Redirect URIs**, add all necessary callback URLs:
   ```
   https://auth.gitstream.com/oauth2/idpresponse
   https://auth-staging.gitstream.com/oauth2/idpresponse
   https://auth-dev.gitstream.com/oauth2/idpresponse
   http://localhost:3000/auth/callback (for development)
   ```

3. Under **Implicit grant and hybrid flows**, ensure these are checked:
   - ✅ **ID tokens** (used for implicit and hybrid flows)
   - ✅ **Access tokens** (used for implicit flows)

4. Under **Advanced settings**:
   - **Allow public client flows**: **No** (recommended for security)
   - **Treat application as a public client**: **No**

5. Click **"Save"**

## Step 4: Configure API Permissions

1. Go to **API permissions** in the left menu
2. The following permissions should be present by default:
   - **Microsoft Graph > User.Read** (Delegated)

3. To add additional permissions if needed:
   - Click **"+ Add a permission"**
   - Select **Microsoft Graph**
   - Choose **Delegated permissions**
   - Add these permissions:
     - `openid` (Sign users in)
     - `profile` (View users' basic profile)
     - `email` (View users' email address)

4. Click **"Grant admin consent"** if you have admin privileges (recommended)

## Step 5: Generate Client Secret

1. Go to **Certificates & secrets** in the left menu
2. Under **Client secrets**, click **"+ New client secret"**
3. Add a description: `GitStream OAuth Secret`
4. Choose expiration: **24 months** (recommended) or **Custom**
5. Click **"Add"**
6. **IMPORTANT**: Copy the **Value** immediately - it won't be shown again
7. Store this securely in your password manager or secrets management system

## Step 6: Collect Required Information

From your Azure AD app registration, collect the following information:

### Application (Client) ID
- Found on the **Overview** page
- Example: `12345678-1234-1234-1234-123456789012`

### Client Secret
- The value you copied in Step 5
- Example: `abcdefgh-1234-5678-9012-ijklmnopqrst`

### Directory (Tenant) ID (if using single tenant)
- Found on the **Overview** page
- Example: `87654321-4321-4321-4321-210987654321`

### Well-Known Configuration Endpoint
- For multi-tenant: `https://login.microsoftonline.com/common/v2.0/.well-known/openid_configuration`
- For single tenant: `https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid_configuration`

## Step 7: Configure AWS Cognito

### Environment Variables
Set these environment variables for your deployment:

```bash
export MICROSOFT_CLIENT_ID="12345678-1234-1234-1234-123456789012"
export MICROSOFT_CLIENT_SECRET="abcdefgh-1234-5678-9012-ijklmnopqrst"
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
    CallbackUrls="https://auth-dev.gitstream.com/oauth2/idpresponse,http://localhost:3000/auth/callback" \
    LogoutUrls="https://auth-dev.gitstream.com/logout,http://localhost:3000/auth/logout"
```

## Step 8: Test the Integration

### Manual Testing
1. Deploy your CloudFormation template with Microsoft credentials
2. Go to your Cognito Hosted UI: `https://auth-dev.gitstream.com/login`
3. Click "Sign in with Microsoft"
4. You should be redirected to Microsoft's login page
5. After successful authentication, you should be redirected back to your application

### Troubleshooting Common Issues

#### Issue: "AADSTS50011: The reply URL does not match"
**Solution**: Verify that the redirect URI in Azure AD exactly matches the Cognito callback URL

#### Issue: "AADSTS700051: response_type 'code' is not enabled for the application"
**Solution**: In Azure AD Authentication settings, ensure "ID tokens" is checked

#### Issue: "Invalid client secret"
**Solution**: Regenerate the client secret in Azure AD and update your environment variables

#### Issue: Users can't access after authentication
**Solution**: Check that the required scopes (openid, profile, email) are properly configured

## Security Best Practices

### Client Secret Management
- Store client secrets in AWS Secrets Manager or AWS Systems Manager Parameter Store
- Rotate client secrets regularly (Azure AD supports multiple active secrets)
- Never commit secrets to source code

### Scopes and Permissions
- Request only the minimum required scopes
- Regularly review and audit API permissions
- Use the principle of least privilege

### Multi-tenant Considerations
- Understand the security implications of multi-tenant vs single-tenant configuration
- Consider using tenant restrictions if needed for organizational security

## Monitoring and Logging

### Azure AD Sign-in Logs
- Monitor sign-in activities in Azure AD > Monitoring > Sign-ins
- Set up alerts for failed authentication attempts
- Review unusual sign-in patterns

### AWS CloudWatch Integration
- Monitor Cognito authentication events
- Set up alarms for high failure rates
- Track user registration and sign-in patterns

## Additional Resources

- [Microsoft identity platform documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [AWS Cognito federated identities documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/external-identity-providers.html)
- [OpenID Connect specification](https://openid.net/connect/)

## Support

For issues specific to this integration:
1. Check Azure AD sign-in logs for authentication failures
2. Review AWS CloudWatch logs for Cognito events
3. Verify all redirect URIs and scopes are correctly configured
4. Ensure client secret is valid and not expired

## Next Steps

After completing this setup:
1. Test the OAuth flow end-to-end
2. Configure LinkedIn OAuth provider (see linkedin-oauth-setup.md)
3. Implement proper error handling in your application
4. Set up monitoring and alerting for authentication events