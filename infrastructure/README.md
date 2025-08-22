# GitStream Cognito Infrastructure

This directory contains CloudFormation templates and deployment scripts for GitStream's AWS Cognito user authentication infrastructure.

## Overview

The infrastructure consists of three main components:

1. **SSL Certificate Management** (`certificate-manager.yaml`)
2. **Cognito User Pool** (`cognito-user-pool.yaml`) 
3. **CloudWatch Logging & Monitoring** (`cloudwatch-logging.yaml`)

These are orchestrated by a master stack template (`master-stack.yaml`) that ensures proper deployment order and resource dependencies.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitStream Cognito Infrastructure         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌──────────────────┐               │
│  │  SSL Certificate │    │   Cognito User   │               │
│  │   (ACM + Lambda │ ─► │      Pool        │               │
│  │   monitoring)   │    │  + Custom Domain │               │
│  └─────────────────┘    └──────────────────┘               │
│                                   │                         │
│                                   ▼                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           CloudWatch Logging & Monitoring               ││
│  │  • Auth Events Log Group                                ││
│  │  • OAuth Events Log Group                               ││
│  │  • Security Events Log Group                            ││
│  │  • Custom Metrics & Alarms                              ││
│  │  • Enhanced Lambda Logging                              ││
│  │  • CloudWatch Dashboard                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Features

### SSL Certificate Management
- Automated SSL certificate provisioning via AWS Certificate Manager
- DNS or email validation support
- Certificate expiration monitoring and alerts
- Daily automated certificate status checks
- CloudWatch metrics for certificate health

### Cognito User Pool
- Email-based user authentication
- Multi-provider OAuth support (Google, Microsoft, LinkedIn)
- Custom domain with SSL certificate integration
- MFA support (SMS-based)
- Advanced security features (device tracking, risk assessment)
- Custom branded email templates
- Comprehensive user attribute schema

### CloudWatch Logging & Monitoring
- Structured logging for authentication events
- Separate log groups for auth, OAuth, and security events
- Custom CloudWatch metrics and alarms
- Real-time security threat detection
- Interactive CloudWatch dashboard
- SNS alerts for critical events

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured with appropriate permissions
2. **jq** installed for JSON processing
3. **Domain control** for DNS configuration (if using custom domain)
4. **SES verified email** for sending authentication emails
5. **OAuth provider credentials** (Google OAuth app configured)

### Required AWS Permissions

The deployment requires the following AWS service permissions:
- CloudFormation (full access)
- Cognito Identity Provider (full access)
- Certificate Manager (full access)
- CloudWatch Logs (full access)
- CloudWatch (metrics and alarms)
- Lambda (function creation and management)
- IAM (role and policy creation)
- SNS (topic and subscription management)
- EventBridge (rule creation)
- Route 53 (if using hosted zone)

## Quick Start

1. **Configure Parameters**
   ```bash
   # Edit deployment-parameters.json with your values
   nano deployment-parameters.json
   ```

2. **Deploy to Development**
   ```bash
   ./deploy.sh dev deploy
   ```

3. **Check Deployment Status**
   ```bash
   ./deploy.sh dev status
   ```

## Configuration

### Required Parameters

Edit `deployment-parameters.json` to configure:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `CustomDomain` | Domain for Cognito hosted UI | `auth.gitstream.com` |
| `HostedZoneId` | Route 53 hosted zone ID | `Z1234567890ABC` |
| `GoogleClientId` | Google OAuth client ID | `123456789-abc.apps.googleusercontent.com` |
| `GoogleClientSecret` | Google OAuth client secret | `GOCSPX-xxxxxxxxxx` |
| `CallbackUrls` | OAuth callback URLs | `https://app.gitstream.com/auth/callback` |
| `SESEmailAddress` | Verified SES email for auth emails | `noreply@gitstream.com` |
| `AlertEmail` | Email for infrastructure alerts | `admin@gitstream.com` |

### OAuth Provider Setup

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-custom-domain/oauth2/idpresponse`
6. Copy Client ID and Client Secret to parameters file

#### Microsoft OAuth Setup (Optional)
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application in Azure AD
3. Configure redirect URIs
4. Generate client secret
5. Add credentials to parameters file

## Deployment

### Environment-specific Deployment

```bash
# Deploy to development
./deploy.sh dev deploy

# Deploy to staging  
./deploy.sh staging deploy

# Deploy to production
./deploy.sh prod deploy
```

### Update Existing Stack

```bash
./deploy.sh [env] update
```

### Delete Stack

```bash
./deploy.sh [env] delete
```

### Validate Template

```bash
./deploy.sh [env] validate
```

## Post-Deployment Steps

1. **Verify SSL Certificate**
   - Check certificate validation in ACM console
   - Ensure DNS records are properly configured

2. **Configure DNS** (if not using Route 53)
   - Point your custom domain to the Cognito CloudFront distribution
   - DNS record type: CNAME
   - Value: CloudFront domain from stack outputs

3. **Test OAuth Providers**
   - Test Google OAuth flow in Cognito console
   - Verify callback URLs are correctly configured

4. **Monitor Deployment**
   - Check CloudWatch dashboard for authentication metrics
   - Verify log groups are receiving events
   - Test SNS alerts (optional)

## Monitoring and Alerts

### CloudWatch Dashboard
Access the dashboard via the stack outputs or directly in CloudWatch console:
- Authentication metrics (successful/failed logins)
- Registration trends
- OAuth provider performance
- Security event analysis

### Log Groups
- `/aws/cognito/gitstream-user-pool-{env}/auth-events`
- `/aws/cognito/gitstream-user-pool-{env}/oauth-events`
- `/aws/cognito/gitstream-user-pool-{env}/security-events`

### Key Metrics
- `GitStream/Cognito/SuccessfulLogins`
- `GitStream/Cognito/FailedLogins`
- `GitStream/Cognito/NewRegistrations`
- `GitStream/Cognito/OAuthFailures`
- `GitStream/Certificate/DaysToExpiry`

## Troubleshooting

### Common Issues

1. **Certificate Validation Fails**
   - Verify domain ownership
   - Check DNS propagation
   - Ensure hosted zone is correctly configured

2. **OAuth Provider Errors**
   - Verify client credentials in parameters
   - Check callback URLs match OAuth app configuration
   - Ensure OAuth app is properly configured and approved

3. **Email Delivery Issues**
   - Verify SES email address is verified
   - Check SES sending quotas
   - Review CloudWatch logs for delivery errors

4. **Stack Deployment Fails**
   - Check CloudFormation events in AWS console
   - Verify IAM permissions
   - Review parameter values for correctness

### Debugging Commands

```bash
# Check stack events
aws cloudformation describe-stack-events --stack-name gitstream-cognito-infrastructure-dev

# View CloudWatch logs
aws logs tail /aws/cognito/gitstream-user-pool-dev/auth-events

# Test certificate status
aws acm describe-certificate --certificate-arn <certificate-arn>
```

## Security Considerations

- OAuth client secrets are stored as NoEcho parameters
- Certificate monitoring alerts on suspicious patterns
- Failed login attempt monitoring and alerting
- Advanced security mode enabled on User Pool
- MFA support available for enhanced security
- Comprehensive audit logging for compliance

## Cost Optimization

- Log retention periods optimized (14-30 days)
- Lambda functions use appropriate timeout settings
- CloudWatch alarms configured to avoid unnecessary charges
- Certificate monitoring runs once daily (not real-time)

## Files Overview

| File | Purpose |
|------|---------|
| `master-stack.yaml` | Main orchestration template |
| `certificate-manager.yaml` | SSL certificate and monitoring |
| `cognito-user-pool.yaml` | User pool and OAuth configuration |
| `cloudwatch-logging.yaml` | Logging and monitoring setup |
| `deployment-parameters.json` | Environment-specific parameters |
| `deploy.sh` | Automated deployment script |
| `README.md` | This documentation |

## Support

For issues or questions:
1. Check CloudFormation stack events
2. Review CloudWatch logs
3. Consult AWS documentation for specific services
4. Review stack outputs for configuration values