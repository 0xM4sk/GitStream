# SSL Certificate and Custom Domain Setup Guide

## Overview
This guide provides step-by-step instructions for setting up SSL certificates and custom domains for the AWS Cognito User Pool infrastructure.

## Prerequisites
- AWS Account with appropriate permissions
- Domain ownership and DNS management access
- AWS CLI configured with appropriate credentials
- Route 53 hosted zone (recommended) or external DNS provider

## SSL Certificate Setup with AWS Certificate Manager

### Step 1: Request SSL Certificate

#### Using AWS Console
1. Navigate to AWS Certificate Manager (ACM) in the AWS Console
2. Ensure you're in the **us-east-1** region (required for Cognito custom domains)
3. Click "Request a certificate"
4. Select "Request a public certificate"
5. Enter domain names:
   - Primary: `auth.gitstream.com`
   - Additional (optional): `*.gitstream.com` for wildcard
6. Select validation method:
   - **DNS validation** (recommended)
   - Email validation (alternative)

#### Using AWS CLI
```bash
# Request certificate for custom domain
aws acm request-certificate \
  --domain-name auth.gitstream.com \
  --subject-alternative-names "*.gitstream.com" \
  --validation-method DNS \
  --region us-east-1 \
  --tags Key=Project,Value=GitStream Key=Environment,Value=prod

# Get certificate ARN from output
CERT_ARN="arn:aws:acm:us-east-1:ACCOUNT:certificate/CERTIFICATE-ID"
```

### Step 2: DNS Validation

#### For Route 53 Domains
```bash
# Get validation records
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1

# Note the CNAME record details from the output
# Example output will include:
# "ResourceRecord": {
#   "Name": "_abc123.auth.gitstream.com.",
#   "Type": "CNAME",
#   "Value": "_xyz789.acm-validations.aws."
# }

# Create validation record in Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_abc123.auth.gitstream.com.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_xyz789.acm-validations.aws."}]
      }
    }]
  }'
```

#### For External DNS Providers
1. Get validation CNAME records from ACM console or CLI
2. Add CNAME records to your DNS provider:
   - **Name**: `_abc123.auth.gitstream.com`
   - **Type**: CNAME
   - **Value**: `_xyz789.acm-validations.aws`
   - **TTL**: 300 seconds

### Step 3: Wait for Certificate Validation
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1

# Wait for status to change to "ISSUED"
# This typically takes 5-30 minutes
```

## Custom Domain Configuration

### Step 1: Configure Cognito Custom Domain

#### Using CloudFormation (Recommended)
The custom domain is configured in the CloudFormation template:
```yaml
CognitoDomain:
  Type: AWS::Cognito::UserPoolDomain
  Properties:
    UserPoolId: !Ref GitStreamUserPool
    Domain: !Ref CustomDomain
    CustomDomainConfig:
      CertificateArn: !Ref CertificateArn
```

#### Using AWS CLI
```bash
# Create custom domain in Cognito
aws cognito-idp create-user-pool-domain \
  --domain auth.gitstream.com \
  --user-pool-id us-east-1_XXXXXXXXX \
  --custom-domain-config CertificateArn=$CERT_ARN

# Get domain status
aws cognito-idp describe-user-pool-domain \
  --domain auth.gitstream.com
```

### Step 2: Configure DNS Records

#### Get Cognito Domain Target
```bash
# Get the CloudFront distribution domain
aws cognito-idp describe-user-pool-domain \
  --domain auth.gitstream.com

# Note the "CloudFrontDistribution" value
# Example: d1234567890.cloudfront.net
```

#### Configure CNAME Record

##### Using Route 53
```bash
# Create CNAME record pointing to CloudFront distribution
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "auth.gitstream.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "d1234567890.cloudfront.net"}]
      }
    }]
  }'
```

##### Using External DNS Provider
Add a CNAME record:
- **Name**: `auth.gitstream.com`
- **Type**: CNAME
- **Value**: `d1234567890.cloudfront.net`
- **TTL**: 300 seconds

### Step 3: Verify Domain Configuration
```bash
# Test DNS resolution
nslookup auth.gitstream.com
dig auth.gitstream.com CNAME

# Test HTTPS connectivity
curl -I https://auth.gitstream.com/login

# Should return HTTP 200 with Cognito headers
```

## Environment-Specific Configuration

### Development Environment
- **Domain**: `auth-dev.gitstream.com`
- **Certificate**: Separate certificate or wildcard
- **DNS**: CNAME to development Cognito domain

### Staging Environment
- **Domain**: `auth-staging.gitstream.com`
- **Certificate**: Separate certificate or wildcard
- **DNS**: CNAME to staging Cognito domain

### Production Environment
- **Domain**: `auth.gitstream.com`
- **Certificate**: Production certificate
- **DNS**: CNAME to production Cognito domain

## Deployment Scripts

### Certificate Creation Script
```bash
#!/bin/bash
# create-ssl-certificate.sh

DOMAIN=$1
ENVIRONMENT=$2

if [ -z "$DOMAIN" ] || [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <domain> <environment>"
  echo "Example: $0 auth.gitstream.com prod"
  exit 1
fi

echo "Creating SSL certificate for $DOMAIN..."

# Request certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN \
  --validation-method DNS \
  --region us-east-1 \
  --tags Key=Project,Value=GitStream Key=Environment,Value=$ENVIRONMENT \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Wait for certificate details to be available
echo "Waiting for certificate details..."
sleep 10

# Get validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

echo "Add the CNAME record above to your DNS provider to validate the certificate."
echo "Certificate ARN: $CERT_ARN"
```

### Domain Configuration Script
```bash
#!/bin/bash
# configure-custom-domain.sh

USER_POOL_ID=$1
DOMAIN=$2
CERT_ARN=$3

if [ -z "$USER_POOL_ID" ] || [ -z "$DOMAIN" ] || [ -z "$CERT_ARN" ]; then
  echo "Usage: $0 <user-pool-id> <domain> <certificate-arn>"
  exit 1
fi

echo "Configuring custom domain $DOMAIN for User Pool $USER_POOL_ID..."

# Create custom domain
aws cognito-idp create-user-pool-domain \
  --domain $DOMAIN \
  --user-pool-id $USER_POOL_ID \
  --custom-domain-config CertificateArn=$CERT_ARN

# Wait for domain to be ready
echo "Waiting for domain configuration..."
sleep 30

# Get CloudFront distribution
CLOUDFRONT_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain $DOMAIN \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text)

echo "Domain configured successfully!"
echo "CloudFront Distribution: $CLOUDFRONT_DOMAIN"
echo "Create a CNAME record: $DOMAIN -> $CLOUDFRONT_DOMAIN"
```

## Troubleshooting

### Common Issues

#### Certificate Validation Fails
- **Symptoms**: Certificate stuck in "Pending validation" status
- **Solutions**:
  - Verify DNS record is correctly added
  - Check TTL is set to 300 seconds or less
  - Ensure no conflicting DNS records exist
  - Wait up to 30 minutes for propagation

#### Custom Domain Not Working
- **Symptoms**: Domain returns errors or doesn't resolve
- **Solutions**:
  - Verify CNAME record points to correct CloudFront distribution
  - Check certificate is in "ISSUED" status
  - Ensure certificate is in us-east-1 region
  - Verify domain ownership

#### SSL Certificate Issues
- **Symptoms**: Browser shows SSL errors
- **Solutions**:
  - Verify certificate covers the exact domain name
  - Check certificate expiration date
  - Ensure certificate is properly validated
  - Clear browser cache and try again

### Validation Commands
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1

# Check custom domain status
aws cognito-idp describe-user-pool-domain --domain auth.gitstream.com

# Test DNS resolution
dig auth.gitstream.com
nslookup auth.gitstream.com

# Test SSL certificate
openssl s_client -connect auth.gitstream.com:443 -servername auth.gitstream.com

# Test Cognito endpoint
curl -v https://auth.gitstream.com/login
```

### Monitoring and Alerts
```bash
# Set up CloudWatch alarm for certificate expiration
aws cloudwatch put-metric-alarm \
  --alarm-name "SSL-Certificate-Expiry" \
  --alarm-description "SSL certificate expiring soon" \
  --metric-name DaysToExpiry \
  --namespace AWS/CertificateManager \
  --statistic Minimum \
  --period 86400 \
  --threshold 30 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=CertificateArn,Value=$CERT_ARN \
  --evaluation-periods 1
```

## Best Practices

### Security
- Always use DNS validation for certificates
- Enable CloudTrail logging for certificate operations
- Use least-privilege IAM policies
- Monitor certificate expiration dates
- Implement certificate auto-renewal where possible

### Performance
- Use CloudFront for global distribution
- Set appropriate TTL values for DNS records
- Monitor SSL handshake performance
- Implement health checks for custom domains

### Maintenance
- Document all certificate and domain configurations
- Set up automated monitoring and alerting
- Plan for certificate renewal well in advance
- Test domain configuration in non-production environments first

## Cost Considerations
- SSL certificates from ACM are free for AWS services
- Custom domains in Cognito have no additional charges
- CloudFront distribution costs depend on usage
- Route 53 hosted zones have monthly charges
- DNS queries have per-query charges (minimal for small usage)

This setup provides a robust, secure foundation for the Cognito authentication infrastructure with proper SSL termination and custom domain branding.