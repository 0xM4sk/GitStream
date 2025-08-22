# Custom Domain Setup for AWS Cognito - GitStream

## Overview
This guide focuses specifically on setting up custom domains for AWS Cognito User Pools in the GitStream authentication system. This complements the comprehensive SSL certificate setup detailed in `ssl-domain-setup.md`.

## Quick Setup Guide

### Prerequisites
- AWS Account with Cognito and Route 53 permissions
- Valid SSL certificate in AWS Certificate Manager (us-east-1 region)
- Existing Cognito User Pool
- Domain ownership and DNS management access

### Step 1: Prepare Certificate
```bash
# Ensure your SSL certificate is in us-east-1 and status is ISSUED
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID \
  --region us-east-1

# Verify certificate covers your domain
# Status should be "ISSUED"
# DomainName should match your intended auth domain
```

### Step 2: Deploy Custom Domain Configuration

#### Option A: Standalone Domain Setup
Use the `custom-domain.yaml` CloudFormation template for existing User Pools:

```bash
# Deploy custom domain configuration
aws cloudformation create-stack \
  --stack-name gitstream-custom-domain-dev \
  --template-body file://infrastructure/custom-domain.yaml \
  --parameters \
    ParameterKey=UserPoolId,ParameterValue=us-east-1_XXXXXXXXX \
    ParameterKey=DomainName,ParameterValue=auth-dev.gitstream.com \
    ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID \
    ParameterKey=Environment,ParameterValue=dev \
    ParameterKey=HostedZoneId,ParameterValue=ZXXXXXXXXXXXXX \
    ParameterKey=CreateRoute53Records,ParameterValue=true \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### Option B: Integrated Setup
If using the complete infrastructure (`cognito-user-pool.yaml`), the custom domain is included:

```bash
# Deploy complete infrastructure with custom domain
./scripts/deploy-cognito-infrastructure.sh dev
```

### Step 3: DNS Configuration

#### Automatic (Route 53)
If using Route 53 and the `CreateRoute53Records=true` parameter, DNS records are created automatically.

#### Manual DNS Setup
Get the CloudFront distribution domain:
```bash
# Get CloudFront domain for CNAME record
aws cognito-idp describe-user-pool-domain \
  --domain auth-dev.gitstream.com
```

Create CNAME record in your DNS provider:
- **Name**: `auth-dev.gitstream.com`
- **Type**: CNAME
- **Value**: `d1234567890.cloudfront.net` (from command output)
- **TTL**: 300 seconds

### Step 4: Verification
```bash
# Test DNS resolution
dig auth-dev.gitstream.com CNAME

# Test HTTPS connectivity
curl -I https://auth-dev.gitstream.com/login

# Verify Cognito hosted UI
open https://auth-dev.gitstream.com/login?client_id=YOUR_CLIENT_ID&response_type=code&scope=openid+email+profile&redirect_uri=http://localhost:3000/auth/callback
```

## Environment-Specific Domains

### Development
- **Domain**: `auth-dev.gitstream.com`
- **Purpose**: Local development and testing
- **SSL**: Development certificate or wildcard

### Staging
- **Domain**: `auth-staging.gitstream.com`
- **Purpose**: Pre-production testing
- **SSL**: Staging certificate or wildcard

### Production
- **Domain**: `auth.gitstream.com`
- **Purpose**: Live production authentication
- **SSL**: Production certificate with monitoring

## Configuration Parameters

### Required Parameters
```yaml
UserPoolId: us-east-1_XXXXXXXXX        # Existing Cognito User Pool
DomainName: auth.gitstream.com         # Your custom domain
CertificateArn: arn:aws:acm:...        # SSL certificate ARN
Environment: prod                      # Environment tag
```

### Optional Parameters
```yaml
HostedZoneId: ZXXXXXXXXXXXXX          # Route 53 zone for auto DNS
CreateRoute53Records: true            # Auto-create DNS records
DNSTTLSeconds: 300                    # TTL for DNS records
```

## Domain Status Monitoring

### CloudWatch Dashboard
Each domain deployment creates a monitoring dashboard:
- CloudFront request metrics
- Error rates (4xx, 5xx)
- Origin latency
- Traffic patterns

Access via: AWS Console > CloudWatch > Dashboards > `Cognito-Domain-{Environment}-{DomainName}`

### CloudWatch Alarms
Automatic alerts for:
- **High Error Rate**: >10% 4xx errors over 10 minutes
- **High Latency**: >5 seconds origin latency over 15 minutes

### Manual Monitoring
```bash
# Check domain status
aws cognito-idp describe-user-pool-domain --domain auth.gitstream.com

# Check CloudFront metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=EDFDVBD6EXAMPLE \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### Domain Not Resolving
1. **Check DNS propagation**:
   ```bash
   dig auth.gitstream.com
   nslookup auth.gitstream.com 8.8.8.8
   ```

2. **Verify CNAME record**:
   - Ensure CNAME points to correct CloudFront distribution
   - Check TTL is not too high (recommend 300 seconds)
   - Verify no conflicting A records exist

### SSL Certificate Issues
1. **Certificate region**: Must be in `us-east-1` for Cognito
2. **Domain validation**: Ensure certificate covers exact domain name
3. **Certificate status**: Must be `ISSUED`, not `PENDING_VALIDATION`

### Cognito Domain Status
Check domain status and wait for completion:
```bash
# Monitor domain creation progress
aws cognito-idp describe-user-pool-domain --domain auth.gitstream.com

# Status should be "ACTIVE"
# If "CREATING", wait and check again
# If "FAILED", check certificate and domain configuration
```

### CloudFront Issues
1. **Distribution not ready**: Wait 15-20 minutes after domain creation
2. **SSL mismatch**: Verify certificate covers the domain name
3. **Origin errors**: Check Cognito service health

## Security Best Practices

### Domain Security
- Use HTTPS-only for all authentication flows
- Implement proper CORS policies for callback URLs
- Monitor for unauthorized domain usage

### DNS Security
- Use DNSSEC where supported
- Monitor DNS changes
- Implement DNS monitoring alerts

### SSL Certificate Security
- Enable certificate transparency monitoring
- Set up expiration alerts (30 days before expiry)
- Use automated renewal where possible

## Cost Optimization

### DNS Costs
- Route 53 hosted zone: $0.50/month per zone
- DNS queries: $0.40 per million queries (first 1B queries/month)

### CloudFront Costs
- Data transfer: Varies by region and volume
- HTTPS requests: $0.0075 per 10,000 requests (first 10M requests/month)
- No additional charges for Cognito integration

### Certificate Costs
- ACM certificates: Free for AWS services
- No charges for Cognito custom domain usage

## Automation Scripts

### Domain Deployment Script
```bash
#!/bin/bash
# deploy-custom-domain.sh

ENVIRONMENT=$1
DOMAIN_NAME=$2
USER_POOL_ID=$3
CERTIFICATE_ARN=$4

if [ $# -ne 4 ]; then
    echo "Usage: $0 <environment> <domain_name> <user_pool_id> <certificate_arn>"
    echo "Example: $0 dev auth-dev.gitstream.com us-east-1_XXXXXXXXX arn:aws:acm:..."
    exit 1
fi

echo "Deploying custom domain configuration..."

aws cloudformation create-stack \
  --stack-name "gitstream-custom-domain-${ENVIRONMENT}" \
  --template-body file://infrastructure/custom-domain.yaml \
  --parameters \
    ParameterKey=UserPoolId,ParameterValue=${USER_POOL_ID} \
    ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME} \
    ParameterKey=CertificateArn,ParameterValue=${CERTIFICATE_ARN} \
    ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

echo "Waiting for stack creation to complete..."
aws cloudformation wait stack-create-complete \
  --stack-name "gitstream-custom-domain-${ENVIRONMENT}" \
  --region us-east-1

echo "Getting CloudFront distribution for DNS configuration..."
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "gitstream-custom-domain-${ENVIRONMENT}" \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistribution`].OutputValue' \
  --output text)

echo "Custom domain deployment complete!"
echo "Domain: ${DOMAIN_NAME}"
echo "CloudFront Distribution: ${CLOUDFRONT_DOMAIN}"
echo "Create CNAME record: ${DOMAIN_NAME} -> ${CLOUDFRONT_DOMAIN}"
```

### Health Check Script
```bash
#!/bin/bash
# check-domain-health.sh

DOMAIN_NAME=$1

if [ -z "$DOMAIN_NAME" ]; then
    echo "Usage: $0 <domain_name>"
    echo "Example: $0 auth.gitstream.com"
    exit 1
fi

echo "Checking domain health for: $DOMAIN_NAME"

# DNS Resolution Check
echo "1. DNS Resolution:"
if dig +short $DOMAIN_NAME CNAME | grep -q cloudfront; then
    echo "   ✓ DNS resolves to CloudFront distribution"
else
    echo "   ✗ DNS resolution issue"
fi

# HTTPS Connectivity Check
echo "2. HTTPS Connectivity:"
if curl -s -I https://$DOMAIN_NAME/login | head -1 | grep -q "200\|302"; then
    echo "   ✓ HTTPS endpoint responding"
else
    echo "   ✗ HTTPS endpoint not accessible"
fi

# SSL Certificate Check
echo "3. SSL Certificate:"
if echo | openssl s_client -connect $DOMAIN_NAME:443 -servername $DOMAIN_NAME 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    echo "   ✓ SSL certificate valid"
else
    echo "   ✗ SSL certificate issue"
fi

# Cognito Domain Status
echo "4. Cognito Domain Status:"
STATUS=$(aws cognito-idp describe-user-pool-domain --domain $DOMAIN_NAME --query 'DomainDescription.Status' --output text 2>/dev/null)
if [ "$STATUS" = "ACTIVE" ]; then
    echo "   ✓ Cognito domain is ACTIVE"
else
    echo "   ✗ Cognito domain status: $STATUS"
fi

echo "Domain health check complete."
```

## Integration with GitStream

### Frontend Configuration
Update your application configuration to use the custom domain:

```javascript
// src/utils/cognitoConfig.js
const cognitoConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_XXXXXXXXX',
  userPoolWebClientId: 'abcdef123456789',
  domain: 'auth.gitstream.com',  // Custom domain
  oauth: {
    domain: 'auth.gitstream.com',
    scope: ['openid', 'email', 'profile'],
    redirectSignIn: 'https://gitstream.com/auth/callback',
    redirectSignOut: 'https://gitstream.com/auth/logout',
    responseType: 'code'
  }
};
```

### Backend Integration
Ensure your backend validates tokens from the custom domain:

```javascript
// Verify JWT tokens include custom domain
const token = req.headers.authorization;
const decoded = jwt.verify(token, publicKey, {
  issuer: `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}`,
  audience: userPoolClientId
});
```

This setup provides a branded, secure authentication experience for GitStream users while maintaining full AWS Cognito functionality.