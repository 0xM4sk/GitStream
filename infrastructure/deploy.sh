#!/bin/bash

# GitStream Cognito Infrastructure Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environment: dev|staging|prod
# Action: deploy|update|delete|status

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_NAME_PREFIX="gitstream-cognito-infrastructure"
TEMPLATE_FILE="$SCRIPT_DIR/master-stack.yaml"
PARAMETERS_FILE="$SCRIPT_DIR/deployment-parameters.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

show_usage() {
    echo "Usage: $0 [environment] [action]"
    echo ""
    echo "Environments:"
    echo "  dev      - Development environment"
    echo "  staging  - Staging environment"
    echo "  prod     - Production environment"
    echo ""
    echo "Actions:"
    echo "  deploy   - Deploy new stack (default)"
    echo "  update   - Update existing stack"
    echo "  delete   - Delete stack"
    echo "  status   - Show stack status"
    echo "  validate - Validate template"
    echo ""
    echo "Examples:"
    echo "  $0 dev deploy"
    echo "  $0 prod status"
    echo "  $0 staging update"
}

validate_template() {
    log_info "Validating CloudFormation template..."
    if aws cloudformation validate-template --template-body file://$TEMPLATE_FILE > /dev/null; then
        log_success "Template validation passed"
    else
        log_error "Template validation failed"
        exit 1
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed (required for parameter processing)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

get_parameters() {
    local env=$1
    cat $PARAMETERS_FILE | jq -r ".${env} | @json"
}

deploy_stack() {
    local env=$1
    local stack_name="${STACK_NAME_PREFIX}-${env}"
    local parameters=$(get_parameters $env)
    
    log_info "Deploying stack: $stack_name"
    log_info "Environment: $env"
    
    # Check if parameters exist for environment
    if [ "$parameters" == "null" ]; then
        log_error "No parameters found for environment: $env"
        exit 1
    fi
    
    # Deploy stack
    aws cloudformation deploy \
        --template-file $TEMPLATE_FILE \
        --stack-name $stack_name \
        --parameter-overrides $(echo $parameters | jq -r '.[] | "\(.ParameterKey)=\(.ParameterValue)"' | tr '\n' ' ') \
        --capabilities CAPABILITY_NAMED_IAM \
        --tags Environment=$env Project=GitStream Component=Cognito-Infrastructure \
        --no-fail-on-empty-changeset
    
    if [ $? -eq 0 ]; then
        log_success "Stack deployment completed"
        show_stack_outputs $env
    else
        log_error "Stack deployment failed"
        exit 1
    fi
}

update_stack() {
    local env=$1
    log_info "Updating stack for environment: $env"
    deploy_stack $env
}

delete_stack() {
    local env=$1
    local stack_name="${STACK_NAME_PREFIX}-${env}"
    
    log_warning "This will delete the entire Cognito infrastructure for $env environment"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Operation cancelled"
        exit 0
    fi
    
    log_info "Deleting stack: $stack_name"
    aws cloudformation delete-stack --stack-name $stack_name
    
    log_info "Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name $stack_name
    
    if [ $? -eq 0 ]; then
        log_success "Stack deletion completed"
    else
        log_error "Stack deletion failed or timed out"
        exit 1
    fi
}

show_stack_status() {
    local env=$1
    local stack_name="${STACK_NAME_PREFIX}-${env}"
    
    log_info "Checking stack status: $stack_name"
    
    # Get stack status
    local status=$(aws cloudformation describe-stacks --stack-name $stack_name --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$status" == "NOT_FOUND" ]; then
        log_warning "Stack does not exist: $stack_name"
        return 1
    fi
    
    echo "Stack Status: $status"
    
    # Show outputs if stack is in a complete state
    if [[ $status == *"COMPLETE"* ]]; then
        show_stack_outputs $env
    fi
}

show_stack_outputs() {
    local env=$1
    local stack_name="${STACK_NAME_PREFIX}-${env}"
    
    log_info "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name $stack_name \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue,Description]' \
        --output table 2>/dev/null || log_warning "No outputs available"
}

# Main script
ENVIRONMENT=${1:-}
ACTION=${2:-deploy}

# Validate inputs
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment parameter is required"
    show_usage
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment. Must be: dev, staging, or prod"
    show_usage
    exit 1
fi

if [[ ! "$ACTION" =~ ^(deploy|update|delete|status|validate)$ ]]; then
    log_error "Invalid action. Must be: deploy, update, delete, status, or validate"
    show_usage
    exit 1
fi

# Execute action
case $ACTION in
    validate)
        validate_template
        ;;
    deploy|update)
        check_prerequisites
        validate_template
        deploy_stack $ENVIRONMENT
        ;;
    delete)
        check_prerequisites
        delete_stack $ENVIRONMENT
        ;;
    status)
        check_prerequisites
        show_stack_status $ENVIRONMENT
        ;;
esac

log_success "Operation completed successfully"