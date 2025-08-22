# GitStream AWS Cognito User Pool Infrastructure

This repository contains the complete AWS Cognito User Pool infrastructure for GitStream user authentication, including CloudFormation templates, configuration files, and comprehensive documentation.

## Overview

The GitStream authentication system leverages AWS Cognito User Pools to provide secure, scalable user authentication with OAuth provider integration. This infrastructure supports:

- **Multi-Provider Authentication**: Google OAuth with extensibility for Microsoft and LinkedIn
- **Custom Domain**: Branded authentication experience with SSL termination
- **Comprehensive Monitoring**: CloudWatch logging, metrics, and alerting
- **Infrastructure as Code**: Complete CloudFormation deployment templates
- **Security Best Practices**: Enhanced security configuration and monitoring

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Browser  │───▶│   Custom Domain  │───▶│  Cognito User   │
│                 │    │ auth.gitstream.  │    │      Pool       │
└─────────────────┘    │       com        │    └─────────────────┘
                       └──────────────────┘              │
                               │                          │
                       ┌──────────────────┐              │
                       │ AWS Certificate  │              │
                       │    Manager       │              │
                       └──────────────────┘              │
                                                          │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ OAuth Providers │───▶│     Identity     │───▶│   CloudWatch    │
│ (Google, etc.)  │    │    Providers     │    │    Logging      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Domain ownership for custom authentication URLs
- Google Cloud Console project for OAuth

### Deployment
```bash
# Set environment variables
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Deploy to development
./scripts/deploy-cognito-infrastructure.sh dev

# Deploy to production
./scripts/deploy-cognito-infrastructure.sh prod
```

## Repository Structure

```
├── infrastructure/
│   ├── cognito-user-pool.yaml         # Main Cognito infrastructure
│   └── cloudwatch-logging.yaml       # Monitoring and logging
├── config/
│   └── oauth-providers.json          # OAuth provider configurations
├── docs/
│   ├── cognito-design.md             # Infrastructure design specification
│   ├── ssl-domain-setup.md           # SSL certificate and domain setup
│   └── deployment-guide.md           # Complete deployment guide
├── scripts/
│   ├── deploy-cognito-infrastructure.sh
│   └── cleanup-cognito-infrastructure.sh
└── README.md
```

## Key Components

### 1. Cognito User Pool (`infrastructure/cognito-user-pool.yaml`)
- Complete User Pool configuration with security best practices
- Google OAuth identity provider integration
- Custom domain configuration with SSL certificate
- Password policies and MFA configuration
- Lambda triggers for enhanced logging

### 2. CloudWatch Monitoring (`infrastructure/cloudwatch-logging.yaml`)
- Structured logging for authentication events
- Custom metrics and alarms for security monitoring
- SNS alerting for critical events
- CloudWatch dashboard for real-time monitoring

### 3. OAuth Provider Configuration (`config/oauth-providers.json`)
- Comprehensive OAuth provider settings
- Environment-specific configurations
- Security and monitoring parameters
- Deployment configuration mappings

## Configuration

### Environment Variables
```bash
# Required for deployment
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Optional
AWS_REGION=us-east-1  # Required for Cognito custom domains
ALERT_EMAIL=admin@gitstream.com
```

### Custom Domain Setup
1. Request SSL certificate in AWS Certificate Manager (us-east-1 region)
2. Validate certificate via DNS
3. Deploy Cognito infrastructure
4. Configure DNS CNAME record to CloudFront distribution

### OAuth Provider Setup
1. Create Google Cloud Console project
2. Configure OAuth consent screen
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs
5. Store credentials in AWS Secrets Manager

## Deployment

### Development Environment
```bash
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-cognito-dev \
  --parameter-overrides Environment=dev \
    CustomDomain=auth-dev.gitstream.com \
    CallbackUrls="http://localhost:3000/auth/callback" \
  --capabilities CAPABILITY_NAMED_IAM
```

### Production Environment
```bash
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-cognito-prod \
  --parameter-overrides Environment=prod \
    CustomDomain=auth.gitstream.com \
    CallbackUrls="https://gitstream.com/auth/callback" \
  --capabilities CAPABILITY_NAMED_IAM
```

## Monitoring and Alerting

### CloudWatch Logs
- **Authentication Events**: User sign-ins, sign-ups, password resets
- **OAuth Events**: Provider redirects, token exchanges, failures
- **Security Events**: Failed logins, suspicious activity, rate limiting

### Metrics and Alarms
- **High Failed Login Rate**: >10 failures/5 minutes
- **Unusual Registration Patterns**: >20 registrations/hour
- **OAuth Provider Failures**: >5 failures/15 minutes

### Dashboard
Access the CloudWatch dashboard at:
`https://console.aws.amazon.com/cloudwatch/home#dashboards:name=GitStream-Cognito-{environment}`

## Security Features

### Authentication Security
- Strong password policies (8+ chars, mixed case, numbers, symbols)
- Optional MFA via SMS
- Account lockout policies
- Rate limiting for login attempts

### Infrastructure Security
- HTTPS-only communication
- AWS managed encryption at rest
- JWT tokens with configurable expiration
- CORS configuration for web domains
- CloudTrail logging for all operations

### Monitoring Security
- Real-time alerting for suspicious activity
- Comprehensive audit logs
- Failed login attempt tracking
- OAuth provider failure monitoring

## Cost Optimization

### AWS Cognito Pricing
- **Monthly Active Users (MAU)**: First 50,000 free, then $0.0055/MAU
- **SMS MFA**: $0.05 per message
- **Custom Domains**: No additional charge

### Additional AWS Costs
- **CloudWatch Logs**: $0.50/GB ingested
- **CloudWatch Metrics**: $0.30 per custom metric
- **SNS**: $0.50 per 1M requests
- **Lambda**: $0.20 per 1M requests

For GitStream's expected usage (<10 users), total monthly cost: **<$5**

## Extending the Infrastructure

### Adding OAuth Providers

1. **Microsoft Azure AD**:
   - Configure in Azure AD Portal
   - Add to `config/oauth-providers.json`
   - Update CloudFormation template

2. **LinkedIn**:
   - Set up LinkedIn Developer app
   - Configure OIDC provider in Cognito
   - Add attribute mappings

### Custom Attributes
Add custom user attributes in CloudFormation:
```yaml
Schema:
  - AttributeDataType: String
    Name: custom_attribute_name
    Mutable: true
    DeveloperOnlyAttribute: false
```

### Additional Environments
Copy environment configuration patterns from existing dev/staging/prod setups.

## Troubleshooting

### Common Issues

1. **Certificate Validation Failing**
   - Verify DNS records are correctly added
   - Check certificate is in us-east-1 region
   - Wait up to 30 minutes for validation

2. **Custom Domain Not Working**
   - Verify CNAME points to CloudFront distribution
   - Check certificate status is "ISSUED"
   - Clear browser cache

3. **OAuth Flow Failures**
   - Verify redirect URIs match in provider console
   - Check provider app is approved/published
   - Review CloudWatch logs for detailed errors

### Support Resources
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)

## Contributing

### Making Changes
1. Test all changes in development environment first
2. Update documentation for any configuration changes
3. Follow CloudFormation best practices
4. Ensure security reviews for any authentication changes

### Code Standards
- Use descriptive resource names in CloudFormation
- Include comprehensive documentation
- Follow AWS Well-Architected Framework principles
- Implement proper error handling and logging

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or support:
- **Technical Issues**: Create GitHub issue
- **Security Concerns**: security@gitstream.com
- **General Questions**: support@gitstream.com

---

**Note**: This infrastructure provides the foundation for all GitStream authentication flows. Ensure proper testing before deploying to production environments.
