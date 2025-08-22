# AWS Cognito User Pool Design Specification

## Overview
This document outlines the comprehensive design for the AWS Cognito User Pool infrastructure that will serve as the foundation for the user authentication system.

## User Pool Configuration

### Basic Settings
- **Pool Name**: `gitstream-user-pool`
- **User Sign-up**: Allow users to sign themselves up
- **Username Configuration**: Email address as username
- **Case Sensitivity**: Case insensitive
- **Attribute Verification**: Email verification required

### User Attributes
**Standard Attributes (Required)**:
- `email` (required, mutable)
- `given_name` (required, mutable)
- `family_name` (required, mutable)

**Custom Attributes**:
- `custom:oauth_provider` (mutable) - Track which OAuth provider was used
- `custom:last_login_provider` (mutable) - Track most recent login method

### Password Policy
- **Minimum Length**: 8 characters
- **Require Numbers**: Yes
- **Require Special Characters**: Yes
- **Require Uppercase**: Yes
- **Require Lowercase**: Yes
- **Temporary Password Validity**: 7 days

### Multi-Factor Authentication (MFA)
- **MFA Setting**: Optional
- **MFA Methods**: SMS text message (for email/password users)
- **OAuth Users**: MFA handled by provider

### Email Configuration
- **Email Verification**: Required for email/password signup
- **From Email**: `noreply@gitstream.com` (or configured domain)
- **Reply-To Email**: `support@gitstream.com`
- **Email Verification Subject**: "Verify your GitStream account"
- **Email Verification Message**: Custom HTML template

### Account Recovery
- **Password Recovery**: Email-based
- **Account Recovery Message**: Custom HTML template
- **Recovery Code Validity**: 24 hours

## App Client Configuration

### App Client Settings
- **Client Name**: `gitstream-web-client`
- **Client Type**: Public client (SPA)
- **Auth Flows**:
  - `ALLOW_USER_SRP_AUTH` (for email/password)
  - `ALLOW_REFRESH_TOKEN_AUTH` (for token refresh)
- **OAuth Flows**:
  - Authorization code grant
  - Implicit grant (for callback handling)

### OAuth Configuration
**Callback URLs**:
- Development: `http://localhost:3000/auth/callback`
- Staging: `https://staging.gitstream.com/auth/callback`
- Production: `https://gitstream.com/auth/callback`

**Logout URLs**:
- Development: `http://localhost:3000/auth/logout`
- Staging: `https://staging.gitstream.com/auth/logout`
- Production: `https://gitstream.com/auth/logout`

**OAuth Scopes**:
- `openid` (required for OpenID Connect)
- `email` (access to email address)
- `profile` (access to profile information)

### Token Configuration
- **ID Token Validity**: 1 hour
- **Access Token Validity**: 1 hour
- **Refresh Token Validity**: 30 days
- **Refresh Token Rotation**: Enabled

## Custom Domain Configuration

### Domain Settings
- **Custom Domain**: `auth.gitstream.com`
- **Certificate Source**: AWS Certificate Manager
- **Certificate Requirements**:
  - Domain validation required
  - Must cover `auth.gitstream.com`
  - Should be in `us-east-1` region

### DNS Configuration
- **CNAME Record**: `auth.gitstream.com` → `{cognito-domain}.amazoncognito.com`
- **TTL**: 300 seconds
- **Validation**: DNS validation for certificate

## OAuth Provider Configuration

### Google OAuth Provider
- **Provider Name**: `Google`
- **Provider Type**: `Google`
- **Client ID**: `{google-client-id}` (from Google Cloud Console)
- **Client Secret**: `{google-client-secret}` (stored in AWS Secrets Manager)
- **Authorize Scopes**: `openid email profile`
- **Attribute Mapping**:
  - `email` → `email`
  - `given_name` → `given_name`
  - `family_name` → `family_name`
  - `picture` → `picture`

### Attribute Mapping Strategy
- **Primary Identifier**: Email address
- **Profile Updates**: Allow updates from OAuth provider
- **Conflict Resolution**: OAuth provider takes precedence
- **Provider Tracking**: Store provider info in custom attributes

## CloudWatch Logging Configuration

### Log Groups
1. **Authentication Events**:
   - Group Name: `/aws/cognito/gitstream-user-pool/auth-events`
   - Retention: 14 days
   - Events: Sign-in, sign-up, password reset, MFA

2. **OAuth Flow Events**:
   - Group Name: `/aws/cognito/gitstream-user-pool/oauth-events`
   - Retention: 14 days
   - Events: OAuth redirects, token exchanges, provider callbacks

3. **Security Events**:
   - Group Name: `/aws/cognito/gitstream-user-pool/security-events`
   - Retention: 30 days
   - Events: Failed logins, account lockouts, suspicious activity

### Metrics and Alarms
- **Failed Login Rate**: Alert if >10 failures/minute
- **New User Registrations**: Monitor for unusual spikes
- **Token Refresh Failures**: Alert on authentication issues
- **OAuth Provider Errors**: Monitor provider connectivity

## Security Configuration

### Encryption
- **Data at Rest**: Enabled (AWS managed keys)
- **Data in Transit**: HTTPS only
- **Token Encryption**: JWT with RS256 signing

### Access Control
- **Admin Access**: IAM roles for user pool management
- **API Access**: Least privilege principles
- **Cross-Origin**: CORS configured for web domains

### Rate Limiting
- **Sign-in Attempts**: 5 attempts per minute per IP
- **Password Reset**: 3 attempts per hour per email
- **Account Creation**: 10 per hour per IP

## Environment-Specific Configuration

### Development Environment
- **Pool Name**: `gitstream-user-pool-dev`
- **Custom Domain**: `auth-dev.gitstream.com`
- **Callback URLs**: Localhost and development URLs
- **Logging**: Verbose logging enabled

### Staging Environment
- **Pool Name**: `gitstream-user-pool-staging`
- **Custom Domain**: `auth-staging.gitstream.com`
- **Callback URLs**: Staging URLs only
- **Logging**: Standard logging

### Production Environment
- **Pool Name**: `gitstream-user-pool-prod`
- **Custom Domain**: `auth.gitstream.com`
- **Callback URLs**: Production URLs only
- **Logging**: Essential logging only
- **Backup**: Automated user export enabled

## Dependencies and Prerequisites

### AWS Services Required
- AWS Cognito User Pools
- AWS Certificate Manager
- AWS CloudWatch
- AWS Secrets Manager (for OAuth secrets)

### External Dependencies
- Google Cloud Console project with OAuth app configured
- Domain control for DNS configuration
- SSL certificate for custom domain

### IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*",
        "acm:*",
        "logs:*",
        "secretsmanager:GetSecretValue",
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "*"
    }
  ]
}
```

## Testing Strategy

### Unit Tests
- CloudFormation template validation
- Configuration parameter validation
- OAuth callback URL testing

### Integration Tests
- End-to-end OAuth flow testing
- Email verification testing
- Password reset flow testing
- Token refresh testing

### Security Tests
- OAuth security flow validation
- Rate limiting verification
- CORS configuration testing
- Token expiration testing

## Monitoring and Maintenance

### Health Checks
- OAuth provider connectivity
- Custom domain certificate validity
- CloudWatch log ingestion
- User pool configuration drift

### Maintenance Tasks
- Certificate renewal (automated)
- User pool backup and export
- Log retention management
- Performance monitoring

### Scaling Considerations
- Current design supports <10 users efficiently
- Can scale to 1000+ users with minimal changes
- OAuth provider rate limits monitored
- CloudWatch cost optimization for low usage

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create User Pool with basic configuration
2. Set up App Client with OAuth flows
3. Configure CloudWatch logging
4. Deploy via CloudFormation

### Phase 2: Custom Domain
1. Create SSL certificate in ACM
2. Configure custom domain in Cognito
3. Set up DNS records
4. Test custom domain functionality

### Phase 3: OAuth Integration
1. Configure Google OAuth provider
2. Set up attribute mapping
3. Test OAuth flow end-to-end
4. Configure error handling

### Phase 4: Production Readiness
1. Security configuration review
2. Monitoring and alerting setup
3. Backup and recovery testing
4. Documentation completion

This design provides a solid foundation for the user authentication system while maintaining flexibility for future enhancements and additional OAuth providers.