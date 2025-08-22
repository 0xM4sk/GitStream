# AWS Cognito Infrastructure Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the complete AWS Cognito User Pool infrastructure for GitStream user authentication.

## Prerequisites

### AWS Account Setup
- AWS CLI installed and configured
- AWS account with appropriate permissions
- Access to AWS regions: `us-east-1` (required for Cognito custom domains)
- Domain ownership for custom authentication URLs

### Required IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*",
        "acm:*",
        "cloudformation:*",
        "lambda:*",
        "logs:*",
        "sns:*",
        "cloudwatch:*",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### External Dependencies
- Google Cloud Console project for OAuth
- Domain DNS management access
- Email access for SNS alerts

## Pre-Deployment Setup

### 1. Google OAuth Configuration

#### Create Google Cloud Project
```bash
# Open Google Cloud Console
open https://console.cloud.google.com/

# Create new project or select existing
# Project Name: GitStream Authentication
# Project ID: gitstream-auth-{environment}
```

#### Configure OAuth Consent Screen
1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill required information:
   - App name: `GitStream`
   - User support email: `support@gitstream.com`
   - App domain: `gitstream.com`
   - Developer contact: `dev@gitstream.com`

#### Create OAuth Credentials
```bash
# Navigate to "APIs & Services" > "Credentials"
# Click "Create Credentials" > "OAuth 2.0 Client IDs"
# Application type: Web application
# Name: GitStream Web Client

# Authorized redirect URIs:
# https://auth.gitstream.com/oauth2/idpresponse
# https://auth-staging.gitstream.com/oauth2/idpresponse
# https://auth-dev.gitstream.com/oauth2/idpresponse
```

### 2. Store OAuth Secrets in AWS Secrets Manager
```bash
# Create secret for Google OAuth credentials
aws secretsmanager create-secret \
  --name "gitstream/oauth/google" \
  --description "Google OAuth credentials for GitStream" \
  --secret-string '{
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "client_secret": "YOUR_GOOGLE_CLIENT_SECRET"
  }'

# Verify secret creation
aws secretsmanager describe-secret --secret-id "gitstream/oauth/google"
```

## Deployment Steps

### Step 1: SSL Certificate Setup

#### Request Certificate
```bash
# Request SSL certificate (must be in us-east-1)
aws acm request-certificate \
  --domain-name auth.gitstream.com \
  --subject-alternative-names "auth-staging.gitstream.com,auth-dev.gitstream.com" \
  --validation-method DNS \
  --region us-east-1 \
  --tags Key=Project,Value=GitStream Key=Environment,Value=prod

# Note the Certificate ARN from output
CERT_ARN="arn:aws:acm:us-east-1:ACCOUNT:certificate/CERTIFICATE-ID"
```

#### Validate Certificate
```bash
# Get validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1

# Add CNAME records to your DNS provider
# Wait for certificate to be issued (5-30 minutes)
```

### Step 2: Deploy Core Infrastructure

#### Deploy User Pool
```bash
# Deploy main Cognito infrastructure
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-cognito-prod \
  --parameter-overrides \
    Environment=prod \
    CustomDomain=auth.gitstream.com \
    CertificateArn=$CERT_ARN \
    GoogleClientId=$GOOGLE_CLIENT_ID \
    GoogleClientSecret=$GOOGLE_CLIENT_SECRET \
    CallbackUrls="https://gitstream.com/auth/callback" \
    LogoutUrls="https://gitstream.com/auth/logout" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Get outputs
aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-prod \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

#### Deploy Monitoring Infrastructure
```bash
# Get User Pool details from previous deployment
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-prod \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

USER_POOL_ARN=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-prod \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolArn`].OutputValue' \
  --output text)

# Deploy monitoring stack
aws cloudformation deploy \
  --template-file infrastructure/cloudwatch-logging.yaml \
  --stack-name gitstream-cognito-monitoring-prod \
  --parameter-overrides \
    Environment=prod \
    UserPoolId=$USER_POOL_ID \
    UserPoolArn=$USER_POOL_ARN \
    AlertEmail=admin@gitstream.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Step 3: Configure Custom Domain DNS

#### Get CloudFront Distribution
```bash
# Get the CloudFront distribution domain
CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain auth.gitstream.com \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text)

echo "CloudFront Distribution: $CLOUDFRONT_DOMAIN"
```

#### Configure DNS Record
```bash
# Using Route 53 (replace HOSTED_ZONE_ID with your zone)
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "auth.gitstream.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$CLOUDFRONT_DOMAIN'"}]
      }
    }]
  }'

# Or add manually to your DNS provider:
# CNAME: auth.gitstream.com -> $CLOUDFRONT_DOMAIN
```

### Step 4: Verification and Testing

#### Test SSL Certificate
```bash
# Test certificate validity
curl -I https://auth.gitstream.com/login
openssl s_client -connect auth.gitstream.com:443 -servername auth.gitstream.com < /dev/null
```

#### Test Cognito Hosted UI
```bash
# Get hosted UI URL
HOSTED_UI_URL=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-prod \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`HostedUIUrl`].OutputValue' \
  --output text)

echo "Test login at: $HOSTED_UI_URL"
```

#### Test OAuth Flow
1. Open the hosted UI URL in browser
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify redirect to callback URL
5. Check CloudWatch logs for events

## Environment-Specific Deployments

### Development Environment
```bash
# Deploy development stack
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-cognito-dev \
  --parameter-overrides \
    Environment=dev \
    CustomDomain=auth-dev.gitstream.com \
    CertificateArn=$DEV_CERT_ARN \
    GoogleClientId=$GOOGLE_CLIENT_ID \
    GoogleClientSecret=$GOOGLE_CLIENT_SECRET \
    CallbackUrls="http://localhost:3000/auth/callback,https://auth-dev.gitstream.com/oauth2/idpresponse" \
    LogoutUrls="http://localhost:3000/auth/logout,https://auth-dev.gitstream.com/logout" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Staging Environment
```bash
# Deploy staging stack
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-cognito-staging \
  --parameter-overrides \
    Environment=staging \
    CustomDomain=auth-staging.gitstream.com \
    CertificateArn=$STAGING_CERT_ARN \
    GoogleClientId=$GOOGLE_CLIENT_ID \
    GoogleClientSecret=$GOOGLE_CLIENT_SECRET \
    CallbackUrls="https://staging.gitstream.com/auth/callback,https://auth-staging.gitstream.com/oauth2/idpresponse" \
    LogoutUrls="https://staging.gitstream.com/auth/logout,https://auth-staging.gitstream.com/logout" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Post-Deployment Configuration

### Configure Lambda Triggers
```bash
# Configure Lambda triggers for enhanced logging
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

LAMBDA_ARN=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-monitoring-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`EnhancedLoggingFunction`].OutputValue' \
  --output text)

# Configure triggers
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --lambda-config '{
    "PreSignUp": "'$LAMBDA_ARN'",
    "PostAuthentication": "'$LAMBDA_ARN'",
    "PreAuthentication": "'$LAMBDA_ARN'"
  }'
```

### Test Monitoring and Alerts
```bash
# Test SNS subscription
aws sns confirm-subscription \
  --topic-arn $(aws cloudformation describe-stacks \
    --stack-name gitstream-cognito-monitoring-prod \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoAlertsSnsTopic`].OutputValue' \
    --output text) \
  --token "CHECK_EMAIL_FOR_CONFIRMATION_TOKEN"

# Generate test events to verify logging
# (Use the hosted UI to sign up/sign in)
```

## Deployment Scripts

### Complete Deployment Script
```bash
#!/bin/bash
# deploy-cognito-infrastructure.sh

set -e

ENVIRONMENT=${1:-dev}
DOMAIN_PREFIX="auth"
if [ "$ENVIRONMENT" != "prod" ]; then
  DOMAIN_PREFIX="auth-$ENVIRONMENT"
fi
CUSTOM_DOMAIN="$DOMAIN_PREFIX.gitstream.com"

echo "Deploying GitStream Cognito infrastructure for $ENVIRONMENT environment..."

# Check prerequisites
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables required"
  exit 1
fi

# Request/get certificate ARN
echo "Requesting SSL certificate for $CUSTOM_DOMAIN..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name $CUSTOM_DOMAIN \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"
echo "Please validate the certificate via DNS before continuing..."
read -p "Press enter when certificate is validated..."

# Deploy main infrastructure
echo "Deploying Cognito User Pool..."
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    CustomDomain=$CUSTOM_DOMAIN \
    CertificateArn=$CERT_ARN \
    GoogleClientId=$GOOGLE_CLIENT_ID \
    GoogleClientSecret=$GOOGLE_CLIENT_SECRET \
    CallbackUrls="https://gitstream.com/auth/callback" \
    LogoutUrls="https://gitstream.com/auth/logout" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Get User Pool details
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

USER_POOL_ARN=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolArn`].OutputValue' \
  --output text)

# Deploy monitoring
echo "Deploying monitoring infrastructure..."
aws cloudformation deploy \
  --template-file infrastructure/cloudwatch-logging.yaml \
  --stack-name gitstream-cognito-monitoring-$ENVIRONMENT \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    UserPoolId=$USER_POOL_ID \
    UserPoolArn=$USER_POOL_ARN \
    AlertEmail=admin@gitstream.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Get CloudFront distribution for DNS
CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain $CUSTOM_DOMAIN \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text)

echo "Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Add DNS record: $CUSTOM_DOMAIN CNAME $CLOUDFRONT_DOMAIN"
echo "2. Test hosted UI: https://$CUSTOM_DOMAIN/login"
echo "3. Configure application callback URLs"
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "CloudFront Distribution: $CLOUDFRONT_DOMAIN"
```

### Cleanup Script
```bash
#!/bin/bash
# cleanup-cognito-infrastructure.sh

ENVIRONMENT=${1:-dev}

echo "Cleaning up GitStream Cognito infrastructure for $ENVIRONMENT environment..."

# Delete monitoring stack
aws cloudformation delete-stack \
  --stack-name gitstream-cognito-monitoring-$ENVIRONMENT \
  --region us-east-1

# Wait for monitoring stack deletion
aws cloudformation wait stack-delete-complete \
  --stack-name gitstream-cognito-monitoring-$ENVIRONMENT \
  --region us-east-1

# Delete main stack
aws cloudformation delete-stack \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --region us-east-1

# Wait for main stack deletion
aws cloudformation wait stack-delete-complete \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --region us-east-1

echo "Cleanup completed!"
echo "Note: SSL certificates and DNS records need to be cleaned up manually"
```

## Troubleshooting

### Common Issues

#### CloudFormation Deployment Fails
```bash
# Check stack events for errors
aws cloudformation describe-stack-events \
  --stack-name gitstream-cognito-prod \
  --region us-east-1

# Common solutions:
# 1. Verify IAM permissions
# 2. Check parameter values
# 3. Ensure certificate is validated
# 4. Verify region (must be us-east-1 for custom domains)
```

#### Custom Domain Not Working
```bash
# Check domain status
aws cognito-idp describe-user-pool-domain \
  --domain auth.gitstream.com

# Verify DNS propagation
dig auth.gitstream.com CNAME
nslookup auth.gitstream.com

# Check certificate status
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1
```

#### OAuth Provider Issues
```bash
# Check identity provider configuration
aws cognito-idp describe-identity-provider \
  --user-pool-id $USER_POOL_ID \
  --provider-name Google

# Verify redirect URIs in Google Console match Cognito configuration
# Check that OAuth app is properly configured and approved
```

### Monitoring and Logs
```bash
# Check CloudWatch logs
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/cognito/gitstream-user-pool"

# View recent log events
aws logs filter-log-events \
  --log-group-name "/aws/cognito/gitstream-user-pool-prod/auth-events" \
  --start-time $(date -d '1 hour ago' +%s)000

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace "GitStream/Cognito" \
  --metric-name "SuccessfulLogins" \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum
```

## Maintenance

### Regular Tasks
- Monitor certificate expiration (90 days for ACM)
- Review CloudWatch logs and metrics
- Update OAuth provider configurations as needed
- Review and rotate secrets in AWS Secrets Manager
- Monitor costs and usage patterns

### Updates and Changes
- Use CloudFormation for all infrastructure changes
- Test changes in development environment first
- Maintain documentation for any configuration changes
- Follow change management procedures for production

This deployment guide provides a complete foundation for the AWS Cognito User Pool infrastructure, supporting the GitStream authentication requirements with proper monitoring, security, and maintainability.