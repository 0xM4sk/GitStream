# Email Infrastructure README

This document provides a quick reference for the GitStream email infrastructure components.

## Files Overview

### Core Infrastructure
- `ses-email-templates.yaml` - CloudFormation template for SES email templates and configuration
- `master-stack.yaml` - Updated to include SES integration with Cognito

### Configuration
- `../config/email-templates.json` - Email template configuration and settings
- `../docs/email-setup.md` - Comprehensive setup and troubleshooting guide

### Automation Scripts
- `../scripts/deploy-email-templates.sh` - Deploy email infrastructure
- `../scripts/validate-email-templates.sh` - Validate and test email templates

## Quick Deployment

### 1. Deploy Email Templates
```bash
cd scripts
./deploy-email-templates.sh --environment dev --ses-email noreply@yourdomain.com
```

### 2. Validate Setup
```bash
./validate-email-templates.sh --environment dev --test-email test@yourdomain.com
```

### 3. Deploy Full Stack
```bash
cd ../infrastructure
aws cloudformation deploy \
  --template-file master-stack.yaml \
  --stack-name gitstream-auth-dev \
  --parameter-overrides \
    Environment=dev \
    SESEmailAddress=noreply@yourdomain.com \
    CustomDomain=auth-dev.yourdomain.com \
  --capabilities CAPABILITY_NAMED_IAM
```

## Email Templates

1. **Password Reset** (`gitstream-password-reset-{env}`)
2. **Welcome** (`gitstream-welcome-{env}`)
3. **Login Notification** (`gitstream-login-notification-{env}`)
4. **Account Locked** (`gitstream-account-locked-{env}`)
5. **Password Changed** (`gitstream-password-changed-{env}`)

## Environment Configuration

Update `config/email-templates.json` for environment-specific settings:
- Development: `dev.gitstream.com`
- Staging: `staging.gitstream.com`
- Production: `gitstream.com`

## Troubleshooting

1. **Domain not verified**: Check DNS records and SES console
2. **Templates not found**: Run deployment script
3. **Emails not sending**: Verify SES sandbox mode and quotas
4. **High bounce rate**: Check email addresses and reputation

For detailed troubleshooting, see `../docs/email-setup.md`.

## Dependencies

- AWS SES enabled in target region
- Domain verification completed
- DKIM configuration set up
- IAM permissions for SES operations

## Monitoring

- CloudWatch logs: `/aws/ses/gitstream-{env}/events`
- SES dashboard: AWS Console → SES → Sending statistics
- Template metrics: CloudWatch SES metrics

## Security Features

- DKIM signing enabled
- SPF records configured
- Bounce and complaint tracking
- Rate limiting and monitoring
- Secure template variables