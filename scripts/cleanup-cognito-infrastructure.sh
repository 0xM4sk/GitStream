#!/bin/bash
# cleanup-cognito-infrastructure.sh
# Complete cleanup script for GitStream Cognito infrastructure

set -e

ENVIRONMENT=${1:-dev}

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 dev"
  echo "Available environments: dev, staging, prod"
  exit 1
fi

echo "🗑️  Cleaning up GitStream Cognito infrastructure for $ENVIRONMENT environment..."
echo ""
echo "⚠️  WARNING: This will permanently delete all authentication infrastructure for $ENVIRONMENT"
echo "  - Cognito User Pool and all users"
echo "  - CloudWatch logs and metrics"
echo "  - Lambda functions"
echo "  - SNS topics and subscriptions"
echo "  - Custom domain configuration"
echo ""
echo "Note: SSL certificates and DNS records must be cleaned up manually"
echo ""
read -p "Are you sure you want to continue? Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cleanup cancelled"
  exit 0
fi

echo ""
echo "🗑️  Starting cleanup process..."

# Check AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "❌ Error: AWS CLI not configured. Please run 'aws configure' first."
  exit 1
fi

# Delete monitoring stack first
echo "📊 Deleting monitoring infrastructure..."
if aws cloudformation describe-stacks --stack-name gitstream-cognito-monitoring-$ENVIRONMENT --region us-east-1 >/dev/null 2>&1; then
  aws cloudformation delete-stack \
    --stack-name gitstream-cognito-monitoring-$ENVIRONMENT \
    --region us-east-1

  echo "⏳ Waiting for monitoring stack deletion..."
  aws cloudformation wait stack-delete-complete \
    --stack-name gitstream-cognito-monitoring-$ENVIRONMENT \
    --region us-east-1

  if [ $? -eq 0 ]; then
    echo "✅ Monitoring infrastructure deleted successfully"
  else
    echo "❌ Failed to delete monitoring infrastructure"
    echo "Please check the AWS console for details"
  fi
else
  echo "ℹ️  Monitoring stack not found, skipping..."
fi

echo ""

# Delete main Cognito stack
echo "🏗️  Deleting Cognito User Pool infrastructure..."
if aws cloudformation describe-stacks --stack-name gitstream-cognito-$ENVIRONMENT --region us-east-1 >/dev/null 2>&1; then
  # Get domain name before deletion for cleanup instructions
  CUSTOM_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name gitstream-cognito-$ENVIRONMENT \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoDomainName`].OutputValue' \
    --output text 2>/dev/null || echo "")

  # Get certificate ARN before deletion
  CERT_ARN=$(aws cloudformation describe-stacks \
    --stack-name gitstream-cognito-$ENVIRONMENT \
    --region us-east-1 \
    --query 'Stacks[0].Parameters[?ParameterKey==`CertificateArn`].ParameterValue' \
    --output text 2>/dev/null || echo "")

  aws cloudformation delete-stack \
    --stack-name gitstream-cognito-$ENVIRONMENT \
    --region us-east-1

  echo "⏳ Waiting for Cognito stack deletion..."
  aws cloudformation wait stack-delete-complete \
    --stack-name gitstream-cognito-$ENVIRONMENT \
    --region us-east-1

  if [ $? -eq 0 ]; then
    echo "✅ Cognito infrastructure deleted successfully"
  else
    echo "❌ Failed to delete Cognito infrastructure"
    echo "Please check the AWS console for details"
    exit 1
  fi
else
  echo "ℹ️  Cognito stack not found, skipping..."
fi

echo ""
echo "🎉 Cleanup completed successfully!"
echo ""

# Provide manual cleanup instructions
echo "📋 Manual Cleanup Required:"
echo ""

if [ -n "$CUSTOM_DOMAIN" ]; then
  echo "🌐 DNS Records:"
  echo "  Remove CNAME record for: $CUSTOM_DOMAIN"
  echo "  Check your DNS provider's management console"
  echo ""
fi

if [ -n "$CERT_ARN" ]; then
  echo "🔐 SSL Certificate:"
  echo "  Certificate ARN: $CERT_ARN"
  echo "  Delete manually from AWS Certificate Manager if no longer needed"
  echo "  Command: aws acm delete-certificate --certificate-arn $CERT_ARN --region us-east-1"
  echo ""
fi

echo "🔍 OAuth Provider Apps:"
echo "  Google Cloud Console: https://console.cloud.google.com/apis/credentials"
echo "  Delete OAuth app if no longer needed"
echo ""

echo "💰 Cost Verification:"
echo "  Check AWS Cost Explorer to verify all resources are cleaned up"
echo "  Monitor for any unexpected charges in the next billing cycle"
echo ""

echo "✅ All AWS infrastructure for GitStream Cognito $ENVIRONMENT has been removed"