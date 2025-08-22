#!/bin/bash

# deploy-custom-domain.sh
# Deploy custom domain configuration for AWS Cognito User Pool

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <environment> <domain_name> <user_pool_id> <certificate_arn> [hosted_zone_id]"
    echo ""
    echo "Parameters:"
    echo "  environment     - Environment name (dev, staging, prod)"
    echo "  domain_name     - Custom domain name (e.g., auth-dev.gitstream.com)"
    echo "  user_pool_id    - Existing Cognito User Pool ID"
    echo "  certificate_arn - SSL certificate ARN from ACM (us-east-1)"
    echo "  hosted_zone_id  - Optional Route 53 Hosted Zone ID for auto DNS"
    echo ""
    echo "Examples:"
    echo "  $0 dev auth-dev.gitstream.com us-east-1_XXXXXXXXX arn:aws:acm:us-east-1:123456789012:certificate/abc123"
    echo "  $0 prod auth.gitstream.com us-east-1_XXXXXXXXX arn:aws:acm:us-east-1:123456789012:certificate/abc123 ZXXXXXXXXXXXXX"
    echo ""
}

# Function to validate AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured or credentials are invalid."
        exit 1
    fi
    
    print_success "AWS CLI is configured and working"
}

# Function to validate certificate
validate_certificate() {
    local cert_arn=$1
    
    print_status "Validating SSL certificate..."
    
    # Check if certificate exists and is in correct region
    local cert_status=$(aws acm describe-certificate \
        --certificate-arn "$cert_arn" \
        --region us-east-1 \
        --query 'Certificate.Status' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$cert_status" = "NOT_FOUND" ]; then
        print_error "Certificate not found or not accessible in us-east-1 region"
        return 1
    fi
    
    if [ "$cert_status" != "ISSUED" ]; then
        print_error "Certificate status is '$cert_status', must be 'ISSUED'"
        return 1
    fi
    
    print_success "Certificate is valid and issued"
    return 0
}

# Function to validate User Pool
validate_user_pool() {
    local user_pool_id=$1
    
    print_status "Validating User Pool..."
    
    local pool_status=$(aws cognito-idp describe-user-pool \
        --user-pool-id "$user_pool_id" \
        --query 'UserPool.Status' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$pool_status" = "NOT_FOUND" ]; then
        print_error "User Pool not found or not accessible"
        return 1
    fi
    
    print_success "User Pool is valid"
    return 0
}

# Function to check if domain is already configured
check_existing_domain() {
    local domain_name=$1
    
    print_status "Checking if domain is already configured..."
    
    local existing_domain=$(aws cognito-idp describe-user-pool-domain \
        --domain "$domain_name" \
        --query 'DomainDescription.Domain' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$existing_domain" != "NOT_FOUND" ]; then
        print_warning "Domain '$domain_name' is already configured for Cognito"
        local status=$(aws cognito-idp describe-user-pool-domain \
            --domain "$domain_name" \
            --query 'DomainDescription.Status' \
            --output text)
        print_status "Current status: $status"
        return 1
    fi
    
    return 0
}

# Function to deploy CloudFormation stack
deploy_stack() {
    local environment=$1
    local domain_name=$2
    local user_pool_id=$3
    local certificate_arn=$4
    local hosted_zone_id=$5
    
    local stack_name="gitstream-custom-domain-${environment}"
    
    print_status "Deploying CloudFormation stack: $stack_name"
    
    # Prepare parameters
    local parameters="ParameterKey=UserPoolId,ParameterValue=${user_pool_id}"
    parameters="$parameters ParameterKey=DomainName,ParameterValue=${domain_name}"
    parameters="$parameters ParameterKey=CertificateArn,ParameterValue=${certificate_arn}"
    parameters="$parameters ParameterKey=Environment,ParameterValue=${environment}"
    
    if [ -n "$hosted_zone_id" ]; then
        parameters="$parameters ParameterKey=HostedZoneId,ParameterValue=${hosted_zone_id}"
        parameters="$parameters ParameterKey=CreateRoute53Records,ParameterValue=true"
    fi
    
    # Deploy stack
    aws cloudformation create-stack \
        --stack-name "$stack_name" \
        --template-body file://infrastructure/custom-domain.yaml \
        --parameters $parameters \
        --capabilities CAPABILITY_NAMED_IAM \
        --region us-east-1 \
        --tags Key=Project,Value=GitStream Key=Environment,Value="$environment" Key=Component,Value=Authentication
    
    print_status "Stack creation initiated. Waiting for completion..."
    
    # Wait for stack creation
    if aws cloudformation wait stack-create-complete \
        --stack-name "$stack_name" \
        --region us-east-1; then
        print_success "Stack created successfully"
        return 0
    else
        print_error "Stack creation failed"
        return 1
    fi
}

# Function to get stack outputs
get_stack_outputs() {
    local environment=$1
    local stack_name="gitstream-custom-domain-${environment}"
    
    print_status "Getting stack outputs..."
    
    local cloudfront_domain=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region us-east-1 \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistribution`].OutputValue' \
        --output text)
    
    local domain_status=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region us-east-1 \
        --query 'Stacks[0].Outputs[?OutputKey==`DomainStatus`].OutputValue' \
        --output text)
    
    local hosted_ui_url=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region us-east-1 \
        --query 'Stacks[0].Outputs[?OutputKey==`CognitoHostedUIURL`].OutputValue' \
        --output text)
    
    echo ""
    print_success "Custom domain deployment completed!"
    echo "----------------------------------------"
    echo "Domain Name: $2"
    echo "Domain Status: $domain_status"
    echo "CloudFront Distribution: $cloudfront_domain"
    echo "Hosted UI URL: $hosted_ui_url"
    echo "----------------------------------------"
    
    if [ -z "$5" ]; then
        echo ""
        print_warning "Manual DNS configuration required:"
        echo "Create a CNAME record in your DNS provider:"
        echo "  Name: $2"
        echo "  Type: CNAME"
        echo "  Value: $cloudfront_domain"
        echo "  TTL: 300 seconds"
    else
        print_success "Route 53 DNS records were automatically created"
    fi
}

# Function to monitor domain status
monitor_domain_status() {
    local domain_name=$1
    local max_attempts=30
    local attempt=0
    
    print_status "Monitoring domain status until ACTIVE..."
    
    while [ $attempt -lt $max_attempts ]; do
        local status=$(aws cognito-idp describe-user-pool-domain \
            --domain "$domain_name" \
            --query 'DomainDescription.Status' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        case $status in
            "ACTIVE")
                print_success "Domain is now ACTIVE and ready to use"
                return 0
                ;;
            "CREATING")
                print_status "Domain status: $status (attempt $((attempt + 1))/$max_attempts)"
                ;;
            "FAILED")
                print_error "Domain configuration FAILED"
                return 1
                ;;
            "NOT_FOUND")
                print_warning "Domain not found (attempt $((attempt + 1))/$max_attempts)"
                ;;
            *)
                print_warning "Unknown domain status: $status"
                ;;
        esac
        
        sleep 30
        ((attempt++))
    done
    
    print_warning "Timeout waiting for domain to become ACTIVE"
    print_status "Current status: $(aws cognito-idp describe-user-pool-domain --domain "$domain_name" --query 'DomainDescription.Status' --output text)"
    return 1
}

# Main execution
main() {
    # Check parameters
    if [ $# -lt 4 ] || [ $# -gt 5 ]; then
        print_error "Invalid number of parameters"
        show_usage
        exit 1
    fi
    
    local environment=$1
    local domain_name=$2
    local user_pool_id=$3
    local certificate_arn=$4
    local hosted_zone_id=$5
    
    # Validate environment
    if [[ ! "$environment" =~ ^(dev|staging|prod)$ ]]; then
        print_error "Environment must be one of: dev, staging, prod"
        exit 1
    fi
    
    print_status "Starting custom domain deployment for environment: $environment"
    echo "Domain: $domain_name"
    echo "User Pool ID: $user_pool_id"
    echo "Certificate ARN: $certificate_arn"
    if [ -n "$hosted_zone_id" ]; then
        echo "Hosted Zone ID: $hosted_zone_id"
    fi
    echo ""
    
    # Run validation checks
    check_aws_cli || exit 1
    validate_certificate "$certificate_arn" || exit 1
    validate_user_pool "$user_pool_id" || exit 1
    
    # Check if domain already exists (warning only)
    check_existing_domain "$domain_name"
    
    # Deploy stack
    deploy_stack "$environment" "$domain_name" "$user_pool_id" "$certificate_arn" "$hosted_zone_id" || exit 1
    
    # Get outputs
    get_stack_outputs "$environment" "$domain_name" "$hosted_zone_id"
    
    # Monitor domain status
    monitor_domain_status "$domain_name"
    
    print_success "Custom domain deployment process completed!"
    echo ""
    print_status "Next steps:"
    echo "1. Verify DNS propagation: dig $domain_name CNAME"
    echo "2. Test HTTPS connectivity: curl -I https://$domain_name/login"
    echo "3. Update your application configuration to use the custom domain"
    echo "4. Test the complete authentication flow"
}

# Run main function with all arguments
main "$@"