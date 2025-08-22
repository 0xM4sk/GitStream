# Email Setup Guide for GitStream Authentication

This document provides comprehensive instructions for setting up and configuring AWS SES (Simple Email Service) for GitStream's authentication system, including domain verification, DKIM setup, and email template management.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS SES Initial Setup](#aws-ses-initial-setup)
3. [Domain Verification](#domain-verification)
4. [DKIM Configuration](#dkim-configuration)
5. [Email Template Deployment](#email-template-deployment)
6. [Testing Email Delivery](#testing-email-delivery)
7. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
8. [Security Best Practices](#security-best-practices)

## Prerequisites

- AWS CLI configured with appropriate permissions
- Access to DNS management for your domain
- CloudFormation deployment permissions
- SES service permissions in your AWS account

### Required AWS Permissions

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:*",
                "route53:*",
                "cloudformation:*",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:PassRole",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## AWS SES Initial Setup

### Step 1: Request Production Access

If you're deploying to production, you need to request removal from the SES sandbox:

1. Go to AWS SES Console → Account dashboard
2. Click "Request production access"
3. Fill out the request form with:
   - **Use case type**: Transactional
   - **Website URL**: Your GitStream domain
   - **Use case description**: "Authentication emails for GitStream knowledge management platform"
   - **Expected sending volume**: Based on your user projections
   - **Bounce/complaint handling**: "We monitor bounce and complaint rates and handle them automatically"

### Step 2: Verify Your Email Domain

#### Option A: Automatic Domain Verification (Recommended)

The CloudFormation template includes automatic domain verification if you use Route 53:

```bash
# Deploy with automatic verification
aws cloudformation deploy \
  --template-file infrastructure/ses-email-templates.yaml \
  --stack-name gitstream-ses-templates-dev \
  --parameter-overrides \
    Environment=dev \
    SESEmailAddress=noreply@yourdomain.com \
    CustomDomain=auth-dev.yourdomain.com
```

#### Option B: Manual Domain Verification

If using external DNS providers:

1. Go to SES Console → Verified identities
2. Click "Create identity" → Domain
3. Enter your domain (e.g., `gitstream.com`)
4. Choose "Easy DKIM" (recommended)
5. Add the provided DNS records to your DNS provider

### Step 3: Configure MAIL FROM Domain

Set up a subdomain for MAIL FROM to improve deliverability:

1. In SES Console, select your verified domain
2. Go to "Mail from domain" tab
3. Edit and set to `mail.yourdomain.com`
4. Add MX record: `10 feedback-smtp.us-east-1.amazonses.com`
5. Add TXT record: `v=spf1 include:amazonses.com ~all`

## Domain Verification

### DNS Records Required

Add these DNS records to your domain:

#### For Domain Verification
```
Type: TXT
Name: _amazonses.yourdomain.com
Value: [provided by AWS SES]
```

#### For DKIM Signing
```
Type: CNAME
Name: selector1._domainkey.yourdomain.com
Value: selector1.dkim-token.dkim.amazonses.com

Type: CNAME  
Name: selector2._domainkey.yourdomain.com
Value: selector2.dkim-token.dkim.amazonses.com

Type: CNAME
Name: selector3._domainkey.yourdomain.com  
Value: selector3.dkim-token.dkim.amazonses.com
```

#### For MAIL FROM Domain
```
Type: MX
Name: mail.yourdomain.com
Value: 10 feedback-smtp.us-east-1.amazonses.com

Type: TXT
Name: mail.yourdomain.com
Value: v=spf1 include:amazonses.com ~all
```

### Verification Script

Use the provided script to check domain verification status:

```bash
# Check domain verification
aws ses get-identity-verification-attributes \
  --identities yourdomain.com \
  --region us-east-1

# Check DKIM status
aws ses get-identity-dkim-attributes \
  --identities yourdomain.com \
  --region us-east-1
```

## DKIM Configuration

DKIM (DomainKeys Identified Mail) signing is crucial for email deliverability:

1. **Enable DKIM**: This is done automatically in the CloudFormation template
2. **Monitor DKIM Status**: Check that all three DKIM records are verified
3. **Test DKIM**: Use mail-tester.com or similar tools

### DKIM Troubleshooting

Common DKIM issues and solutions:

**Issue**: DKIM records not verifying
- **Solution**: Ensure all three CNAME records are properly added
- **Check**: DNS propagation using `dig` or online DNS checkers

**Issue**: DKIM signing disabled
- **Solution**: Re-enable in SES console or redeploy CloudFormation

## Email Template Deployment

### Deploy SES Email Templates

```bash
# Deploy email templates stack
cd infrastructure/
aws cloudformation deploy \
  --template-file ses-email-templates.yaml \
  --stack-name gitstream-ses-templates-${ENVIRONMENT} \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    SESEmailAddress=noreply@${DOMAIN} \
    CustomDomain=auth-${ENVIRONMENT}.${DOMAIN} \
  --capabilities CAPABILITY_NAMED_IAM
```

### Integrate with Master Stack

Update the master stack to include SES email templates:

```yaml
# Add to master-stack.yaml Resources section
SESTemplatesStack:
  Type: AWS::CloudFormation::Stack
  DependsOn: CognitoStack
  Properties:
    TemplateURL: './ses-email-templates.yaml'
    Parameters:
      Environment: !Ref Environment
      SESEmailAddress: !Ref SESEmailAddress
      CustomDomain: !Ref CustomDomain
    Tags:
      - Key: Environment
        Value: !Ref Environment
      - Key: Project
        Value: GitStream
      - Key: Component
        Value: SES-Templates
```

### Update Cognito Configuration

Modify the Cognito User Pool to use the SES IAM role:

```yaml
# In cognito-user-pool.yaml
EmailConfiguration:
  EmailSendingAccount: DEVELOPER
  SourceArn: !GetAtt SESTemplatesStack.Outputs.SESIdentityArn
  From: !Ref SESEmailAddress
```

## Testing Email Delivery

### 1. Test Domain Verification

```bash
# Check if domain is verified
aws ses get-send-quota --region us-east-1

# Check sending statistics  
aws ses get-send-statistics --region us-east-1
```

### 2. Send Test Emails

```bash
# Test password reset email
aws ses send-templated-email \
  --region us-east-1 \
  --source noreply@yourdomain.com \
  --destination ToAddresses=test@example.com \
  --template gitstream-password-reset-dev \
  --template-data '{"resetLink":"https://test.com","name":"Test User"}'

# Test welcome email
aws ses send-templated-email \
  --region us-east-1 \
  --source noreply@yourdomain.com \
  --destination ToAddresses=test@example.com \
  --template gitstream-welcome-dev \
  --template-data '{"name":"Test User","portalDomain":"portal.yourdomain.com"}'
```

### 3. Integration Testing

Test the complete authentication flow:

1. **Registration**: Sign up with a new email address
2. **Verification**: Check verification email delivery and functionality
3. **Password Reset**: Test password reset flow
4. **Login Notifications**: Verify security notifications work

### 4. Email Deliverability Testing

Use these tools to test email quality:

- **Mail Tester**: https://www.mail-tester.com/
- **MX Toolbox**: https://mxtoolbox.com/deliverability
- **SendForensics**: https://www.sendforensics.com/

Target scores:
- Mail Tester: 8/10 or higher
- SpamAssassin: Score below 5
- DKIM: Pass
- SPF: Pass

## Monitoring and Troubleshooting

### CloudWatch Metrics

Monitor these key SES metrics:

- **Send**: Number of emails sent
- **Bounce**: Bounce rate (keep below 5%)
- **Complaint**: Complaint rate (keep below 0.1%)
- **Delivery**: Successful delivery rate

### CloudWatch Alarms

The template creates alarms for:

```yaml
# High bounce rate alarm
BounceRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub 'GitStream-SES-HighBounceRate-${Environment}'
    MetricName: Reputation.BounceRate
    Threshold: 5.0
    ComparisonOperator: GreaterThanThreshold
```

### Common Issues and Solutions

#### Issue: Emails Not Sending

**Symptoms**: No emails received, no errors in logs
**Diagnosis**:
```bash
# Check SES sending quota
aws ses describe-account-sending-enabled --region us-east-1

# Check domain verification
aws ses get-identity-verification-attributes \
  --identities yourdomain.com --region us-east-1
```

**Solutions**:
- Verify domain is confirmed
- Check you haven't exceeded sending quota
- Ensure SES sending is enabled

#### Issue: High Bounce Rate

**Symptoms**: CloudWatch alarms firing
**Diagnosis**: Check bounce reasons in SES console

**Solutions**:
- Clean email lists
- Implement better email validation
- Monitor recipient feedback

#### Issue: Emails Going to Spam

**Symptoms**: Low deliverability scores
**Diagnosis**: Use mail testing tools

**Solutions**:
- Ensure DKIM is properly configured
- Set up SPF records correctly
- Monitor sending reputation
- Warm up IP reputation gradually

### Log Analysis

SES events are logged to CloudWatch. Query common patterns:

```bash
# Search for bounce events
aws logs filter-log-events \
  --log-group-name /aws/ses/gitstream-dev/events \
  --filter-pattern "bounce" \
  --start-time 1640995200000

# Search for specific email template
aws logs filter-log-events \
  --log-group-name /aws/ses/gitstream-dev/events \
  --filter-pattern "gitstream-password-reset"
```

## Security Best Practices

### 1. IAM Roles and Policies

- Use least-privilege IAM roles
- Separate roles for different services
- Regular access reviews

### 2. Email Content Security

- Never include sensitive information in emails
- Use secure HTTPS links only
- Implement proper token expiration

### 3. Rate Limiting

```javascript
// Implement rate limiting for password reset requests
const rateLimiter = {
  maxRequests: 3,
  timeWindow: 3600000, // 1 hour
  
  isAllowed: function(email) {
    // Check if user has exceeded rate limit
    const requests = this.getRequestCount(email);
    return requests < this.maxRequests;
  }
};
```

### 4. Monitoring and Alerting

- Set up alerts for unusual sending patterns
- Monitor bounce and complaint rates
- Regular security audits

### 5. Data Protection

- Encrypt email templates with sensitive placeholders
- Implement proper data retention policies
- Regular backups of configuration

## Environment-Specific Configuration

### Development Environment

```bash
export ENVIRONMENT=dev
export DOMAIN=dev.gitstream.com
export SES_EMAIL=noreply@dev.gitstream.com
```

### Staging Environment

```bash
export ENVIRONMENT=staging  
export DOMAIN=staging.gitstream.com
export SES_EMAIL=noreply@staging.gitstream.com
```

### Production Environment

```bash
export ENVIRONMENT=prod
export DOMAIN=gitstream.com
export SES_EMAIL=noreply@gitstream.com
```

## Backup and Disaster Recovery

### Template Backup

```bash
# Export email templates
aws ses list-templates --region us-east-1

# Backup specific template
aws ses get-template \
  --template-name gitstream-password-reset-prod \
  --region us-east-1 > backup/password-reset-template.json
```

### Configuration Backup

- Store CloudFormation templates in version control
- Regular exports of SES configurations
- Document all DNS settings

## Support and Troubleshooting

### Getting Help

1. Check CloudWatch logs first
2. Review SES console for delivery metrics
3. Test with mail delivery tools
4. Check DNS propagation

### Escalation Process

1. **Level 1**: Check documentation and logs
2. **Level 2**: AWS Support (if business/enterprise)
3. **Level 3**: Engage development team

For additional support, contact the GitStream development team with:
- Environment details
- Error messages and logs
- Steps to reproduce the issue
- Expected vs actual behavior

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Maintainer**: GitStream Development Team