#!/bin/bash

# Email Templates Deployment Script for GitStream
# This script deploys SES email templates using CloudFormation

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INFRASTRUCTURE_DIR="$PROJECT_DIR/infrastructure"

# Default values
ENVIRONMENT=${ENVIRONMENT:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
SES_EMAIL=${SES_EMAIL:-"noreply@gitstream.com"}
CUSTOM_DOMAIN=${CUSTOM_DOMAIN:-"auth-dev.gitstream.com"}
STACK_NAME_PREFIX="gitstream"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploys SES email templates CloudFormation stack for GitStream.

OPTIONS:
    -e, --environment ENV         Environment (dev/staging/prod) [default: dev]
    -r, --region REGION          AWS region [default: us-east-1]
    -s, --ses-email EMAIL        SES email address [default: noreply@gitstream.com]
    -d, --custom-domain DOMAIN   Custom domain [default: auth-dev.gitstream.com]
    --stack-name NAME            CloudFormation stack name [default: gitstream-ses-templates-ENV]
    --dry-run                   Show what would be done without executing
    --delete                    Delete the stack instead of creating/updating
    -h, --help                  Show this help message

EXAMPLES:
    $0 --environment dev --ses-email noreply@dev.example.com
    $0 --environment prod --custom-domain auth.example.com
    $0 --delete --environment dev

EOF
}

# Parse command line arguments
DRY_RUN=false
DELETE_STACK=false
STACK_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -s|--ses-email)
            SES_EMAIL="$2"
            shift 2
            ;;
        -d|--custom-domain)
            CUSTOM_DOMAIN="$2"
            shift 2
            ;;
        --stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --delete)
            DELETE_STACK=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Set default stack name if not provided
if [[ -z "$STACK_NAME" ]]; then
    STACK_NAME="${STACK_NAME_PREFIX}-ses-templates-${ENVIRONMENT}"
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

log_info "Starting email templates deployment for environment: $ENVIRONMENT"
log_info "Stack name: $STACK_NAME"
log_info "AWS Region: $AWS_REGION"
log_info "SES Email: $SES_EMAIL"
log_info "Custom Domain: $CUSTOM_DOMAIN"

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is required but not installed. Please install AWS CLI to continue."
    exit 1
fi

# Validate AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured or invalid. Please run 'aws configure'."
    exit 1
fi

log_success "AWS credentials validated"

# Check if template file exists
TEMPLATE_FILE="$INFRASTRUCTURE_DIR/ses-email-templates.yaml"
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    log_error "CloudFormation template not found: $TEMPLATE_FILE"
    exit 1
fi

log_success "CloudFormation template found: $TEMPLATE_FILE"

# Function to check if stack exists
stack_exists() {
    local stack_name="$1"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$AWS_REGION" &>/dev/null
}

# Function to get stack status
get_stack_status() {
    local stack_name="$1"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "DOES_NOT_EXIST"
}

# Function to wait for stack operation
wait_for_stack() {
    local stack_name="$1"
    local operation="$2"
    
    log_info "Waiting for stack $operation to complete..."
    
    local max_attempts=60
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        local status=$(get_stack_status "$stack_name")
        
        case $status in
            *_COMPLETE)
                log_success "Stack $operation completed successfully"
                return 0
                ;;
            *_FAILED|*_ROLLBACK_COMPLETE)
                log_error "Stack $operation failed with status: $status"
                return 1
                ;;
            *_IN_PROGRESS)
                echo -n "."
                sleep 10
                ((attempt++))
                ;;
            DOES_NOT_EXIST)
                if [[ "$operation" == "deletion" ]]; then
                    log_success "Stack deleted successfully"
                    return 0
                else
                    log_error "Stack does not exist"
                    return 1
                fi
                ;;
            *)
                log_warning "Unknown stack status: $status"
                sleep 10
                ((attempt++))
                ;;
        esac
    done
    
    log_error "Timeout waiting for stack $operation"
    return 1
}

# Function to delete stack
delete_stack() {
    local stack_name="$1"
    
    log_info "Deleting CloudFormation stack: $stack_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would delete stack: $stack_name"
        return 0
    fi
    
    if ! stack_exists "$stack_name"; then
        log_warning "Stack does not exist: $stack_name"
        return 0
    fi
    
    aws cloudformation delete-stack \
        --stack-name "$stack_name" \
        --region "$AWS_REGION"
    
    wait_for_stack "$stack_name" "deletion"
}

# Function to deploy stack
deploy_stack() {
    local stack_name="$1"
    local template_file="$2"
    
    local operation="creation"
    if stack_exists "$stack_name"; then
        operation="update"
    fi
    
    log_info "Starting CloudFormation stack $operation: $stack_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would $operation stack with parameters:"
        log_info "  Environment: $ENVIRONMENT"
        log_info "  SESEmailAddress: $SES_EMAIL"
        log_info "  CustomDomain: $CUSTOM_DOMAIN"
        return 0
    fi
    
    # Build parameters
    local parameters=(
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
        "ParameterKey=SESEmailAddress,ParameterValue=$SES_EMAIL"
        "ParameterKey=CustomDomain,ParameterValue=$CUSTOM_DOMAIN"
    )
    
    # Deploy stack
    local deploy_cmd=(
        aws cloudformation deploy
        --template-file "$template_file"
        --stack-name "$stack_name"
        --region "$AWS_REGION"
        --capabilities CAPABILITY_NAMED_IAM
        --tags "Environment=$ENVIRONMENT" "Project=GitStream" "Component=SES-Templates"
    )
    
    # Add parameters
    for param in "${parameters[@]}"; do
        deploy_cmd+=(--parameter-overrides "$param")
    done
    
    # Execute deployment
    if "${deploy_cmd[@]}"; then
        log_success "CloudFormation stack $operation completed successfully"
        
        # Get stack outputs
        log_info "Stack outputs:"
        aws cloudformation describe-stacks \
            --stack-name "$stack_name" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].Outputs[?OutputKey].{Key:OutputKey,Value:OutputValue}' \
            --output table
            
    else
        log_error "CloudFormation stack $operation failed"
        return 1
    fi
}

# Function to validate template
validate_template() {
    local template_file="$1"
    
    log_info "Validating CloudFormation template..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would validate template: $template_file"
        return 0
    fi
    
    if aws cloudformation validate-template \
        --template-body "file://$template_file" \
        --region "$AWS_REGION" &>/dev/null; then
        log_success "CloudFormation template validation passed"
    else
        log_error "CloudFormation template validation failed"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if SES service is available in region
    local ses_regions=$(aws ses describe-configuration-sets --region "$AWS_REGION" 2>/dev/null || echo "unavailable")
    if [[ "$ses_regions" == "unavailable" ]]; then
        log_error "SES service is not available in region: $AWS_REGION"
        log_info "SES is available in: us-east-1, us-west-2, eu-west-1, etc."
        return 1
    fi
    
    log_success "SES service is available in region: $AWS_REGION"
    
    # Check SES sending quota (if not in sandbox)
    local send_quota=$(aws ses get-send-quota --region "$AWS_REGION" --query 'Max24HourSend' --output text 2>/dev/null || echo "0")
    if [[ "$send_quota" == "200.0" ]]; then
        log_warning "SES is in sandbox mode (quota: 200 emails/day)"
        log_info "Request production access at: https://console.aws.amazon.com/ses/home?region=$AWS_REGION#account-details:"
    else
        log_success "SES production access enabled (quota: $send_quota emails/day)"
    fi
}

# Main deployment function
main() {
    local exit_code=0
    
    # Check prerequisites
    if ! check_prerequisites; then
        exit_code=1
    fi
    
    # Validate template
    if ! validate_template "$TEMPLATE_FILE"; then
        exit_code=1
        if [[ $exit_code -ne 0 ]]; then
            return $exit_code
        fi
    fi
    
    # Delete or deploy stack
    if [[ "$DELETE_STACK" == "true" ]]; then
        if ! delete_stack "$STACK_NAME"; then
            exit_code=1
        fi
    else
        if ! deploy_stack "$STACK_NAME" "$TEMPLATE_FILE"; then
            exit_code=1
        fi
    fi
    
    # Summary
    echo
    if [[ $exit_code -eq 0 ]]; then
        if [[ "$DELETE_STACK" == "true" ]]; then
            log_success "Email templates stack deletion completed successfully!"
        else
            log_success "Email templates deployment completed successfully!"
            log_info "Next steps:"
            log_info "1. Verify SES domain and complete DKIM setup"
            log_info "2. Test email delivery using: ./validate-email-templates.sh"
            log_info "3. Update Cognito User Pool to use SES templates"
        fi
    else
        log_error "Email templates deployment failed!"
    fi
    
    return $exit_code
}

# Run main function
main "$@"