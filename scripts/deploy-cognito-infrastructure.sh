#!/bin/bash
# deploy-cognito-infrastructure.sh
# Complete deployment script for GitStream Cognito infrastructure

set -e

ENVIRONMENT=${1:-dev}
DOMAIN_PREFIX="auth"
if [ "$ENVIRONMENT" != "prod" ]; then
  DOMAIN_PREFIX="auth-$ENVIRONMENT"
fi
CUSTOM_DOMAIN="$DOMAIN_PREFIX.gitstream.com"

echo "🚀 Deploying GitStream Cognito infrastructure for $ENVIRONMENT environment..."

# Check prerequisites
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables required"
  echo "Please set these variables with your Google OAuth credentials:"
  echo "  export GOOGLE_CLIENT_ID='your-client-id'"
  echo "  export GOOGLE_CLIENT_SECRET='your-client-secret'"
  exit 1
fi

# Check AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "❌ Error: AWS CLI not configured. Please run 'aws configure' first."
  exit 1
fi

# Set default alert email if not provided
ALERT_EMAIL=${ALERT_EMAIL:-admin@gitstream.com}

echo "📋 Configuration:"
echo "  Environment: $ENVIRONMENT"
echo "  Custom Domain: $CUSTOM_DOMAIN"
echo "  Alert Email: $ALERT_EMAIL"
echo "  AWS Region: us-east-1 (required for Cognito custom domains)"
echo ""

# Request/get certificate ARN
echo "🔐 Requesting SSL certificate for $CUSTOM_DOMAIN..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name $CUSTOM_DOMAIN \
  --validation-method DNS \
  --region us-east-1 \
  --tags Key=Project,Value=GitStream Key=Environment,Value=$ENVIRONMENT \
  --query 'CertificateArn' \
  --output text)

if [ $? -ne 0 ]; then
  echo "❌ Failed to request SSL certificate"
  exit 1
fi

echo "✅ Certificate requested successfully"
echo "📋 Certificate ARN: $CERT_ARN"
echo ""

# Get validation records
echo "📋 Certificate validation required. Please add the following DNS records:"
echo ""
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output table

echo ""
echo "⚠️  IMPORTANT: Add the above CNAME record to your DNS provider before continuing"
echo "    This is required to validate the SSL certificate"
echo ""
read -p "Press enter when the DNS record has been added and you're ready to continue..."

# Wait for certificate validation
echo "⏳ Waiting for certificate validation (this may take up to 30 minutes)..."
aws acm wait certificate-validated \
  --certificate-arn $CERT_ARN \
  --region us-east-1

if [ $? -ne 0 ]; then
  echo "❌ Certificate validation failed or timed out"
  echo "Please check your DNS records and try again"
  exit 1
fi

echo "✅ Certificate validated successfully"
echo ""

# Set callback and logout URLs based on environment
if [ "$ENVIRONMENT" = "prod" ]; then
  CALLBACK_URLS="https://gitstream.com/auth/callback"
  LOGOUT_URLS="https://gitstream.com/auth/logout"
elif [ "$ENVIRONMENT" = "staging" ]; then
  CALLBACK_URLS="https://staging.gitstream.com/auth/callback"
  LOGOUT_URLS="https://staging.gitstream.com/auth/logout"
else
  CALLBACK_URLS="http://localhost:3000/auth/callback,http://localhost:3001/auth/callback"
  LOGOUT_URLS="http://localhost:3000/auth/logout,http://localhost:3001/auth/logout"
fi

# Deploy main infrastructure
echo "🏗️  Deploying Cognito User Pool..."
aws cloudformation deploy \
  --template-file infrastructure/cognito-user-pool.yaml \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    CustomDomain=$CUSTOM_DOMAIN \
    CertificateArn=$CERT_ARN \
    GoogleClientId=$GOOGLE_CLIENT_ID \
    GoogleClientSecret=$GOOGLE_CLIENT_SECRET \
    CallbackUrls="$CALLBACK_URLS" \
    LogoutUrls="$LOGOUT_URLS" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy Cognito User Pool"
  exit 1
fi

echo "✅ Cognito User Pool deployed successfully"
echo ""

# Get User Pool details
echo "📋 Retrieving deployment details..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

USER_POOL_ARN=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolArn`].OutputValue' \
  --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name gitstream-cognito-$ENVIRONMENT \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

# Deploy monitoring infrastructure
echo "📊 Deploying monitoring infrastructure..."
aws cloudformation deploy \
  --template-file infrastructure/cloudwatch-logging.yaml \
  --stack-name gitstream-cognito-monitoring-$ENVIRONMENT \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    UserPoolId=$USER_POOL_ID \
    UserPoolArn=$USER_POOL_ARN \
    AlertEmail=$ALERT_EMAIL \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy monitoring infrastructure"
  exit 1
fi

echo "✅ Monitoring infrastructure deployed successfully"
echo ""

# Get CloudFront distribution for DNS
echo "🌐 Retrieving custom domain details..."
CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain $CUSTOM_DOMAIN \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text)

if [ $? -ne 0 ]; then
  echo "⚠️  Warning: Could not retrieve CloudFront distribution. Domain may still be configuring."
  CLOUDFRONT_DOMAIN="<check-aws-console>"
fi

# Get hosted UI URL
HOSTED_UI_URL="https://$CUSTOM_DOMAIN/login?client_id=$USER_POOL_CLIENT_ID&response_type=code&scope=openid+email+profile&redirect_uri=$(echo $CALLBACK_URLS | cut -d',' -f1)"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  User Pool ID: $USER_POOL_ID"
echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "  Custom Domain: $CUSTOM_DOMAIN"
echo "  CloudFront Distribution: $CLOUDFRONT_DOMAIN"
echo ""
echo "🔗 Next Steps:"
echo "  1. Add DNS CNAME record:"
echo "     Name: $CUSTOM_DOMAIN"
echo "     Type: CNAME"
echo "     Value: $CLOUDFRONT_DOMAIN"
echo "     TTL: 300"
echo ""
echo "  2. Test the hosted UI:"
echo "     URL: $HOSTED_UI_URL"
echo ""
echo "  3. Configure your application with:"
echo "     User Pool ID: $USER_POOL_ID"
echo "     Client ID: $USER_POOL_CLIENT_ID"
echo "     Domain: $CUSTOM_DOMAIN"
echo ""
echo "📊 Monitoring:"
echo "  CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=GitStream-Cognito-$ENVIRONMENT"
echo "  Log Groups:"
echo "    - /aws/cognito/gitstream-user-pool-$ENVIRONMENT/auth-events"
echo "    - /aws/cognito/gitstream-user-pool-$ENVIRONMENT/oauth-events"
echo "    - /aws/cognito/gitstream-user-pool-$ENVIRONMENT/security-events"
echo ""
echo "🔔 Alerts will be sent to: $ALERT_EMAIL"
echo ""
echo "✅ GitStream Cognito infrastructure is ready for use!"