#!/bin/bash

# Email Templates Validation Script for GitStream
# This script validates email templates and tests SES configuration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/config/email-templates.json"

# Default values
ENVIRONMENT=${ENVIRONMENT:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
TEST_EMAIL=${TEST_EMAIL:-""}

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

Validates email templates and tests SES configuration for GitStream.

OPTIONS:
    -e, --environment ENV   Environment (dev/staging/prod) [default: dev]
    -r, --region REGION     AWS region [default: us-east-1]
    -t, --test-email EMAIL  Email address for sending test emails
    --validate-only         Only validate templates, skip sending tests
    --dry-run              Show what would be done without executing
    -h, --help             Show this help message

EXAMPLES:
    $0 --environment dev --test-email test@example.com
    $0 --validate-only
    $0 --dry-run --environment prod

EOF
}

# Parse command line arguments
VALIDATE_ONLY=false
DRY_RUN=false

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
        -t|--test-email)
            TEST_EMAIL="$2"
            shift 2
            ;;
        --validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

log_info "Starting email templates validation for environment: $ENVIRONMENT"
log_info "AWS Region: $AWS_REGION"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed. Please install jq to continue."
    exit 1
fi

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

# Validate configuration file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    log_error "Email templates configuration file not found: $CONFIG_FILE"
    exit 1
fi

log_success "Email templates configuration file found"

# Validate JSON structure
if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    log_error "Invalid JSON in configuration file: $CONFIG_FILE"
    exit 1
fi

log_success "Configuration file JSON structure is valid"

# Extract configuration values
FROM_ADDRESS=$(jq -r ".environmentOverrides.${ENVIRONMENT}.fromAddress // .emailConfiguration.fromAddress" "$CONFIG_FILE")
DOMAIN=$(jq -r ".environmentOverrides.${ENVIRONMENT}.domain // .emailConfiguration.domain" "$CONFIG_FILE")
CONFIGURATION_SET=$(jq -r ".environmentOverrides.${ENVIRONMENT}.configurationSet // .emailConfiguration.configurationSet" "$CONFIG_FILE")

log_info "Configuration values:"
log_info "  From Address: $FROM_ADDRESS"
log_info "  Domain: $DOMAIN"
log_info "  Configuration Set: $CONFIGURATION_SET"

# Function to validate SES identity
validate_ses_identity() {
    local email_address="$1"
    local identity_domain="${email_address#*@}"
    
    log_info "Checking SES identity verification for: $identity_domain"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would check SES identity verification"
        return 0
    fi
    
    local verification_status=$(aws ses get-identity-verification-attributes \
        --identities "$identity_domain" \
        --region "$AWS_REGION" \
        --query "VerificationAttributes.\"$identity_domain\".VerificationStatus" \
        --output text 2>/dev/null)
    
    if [[ "$verification_status" == "Success" ]]; then
        log_success "SES identity verified for domain: $identity_domain"
    else
        log_error "SES identity not verified for domain: $identity_domain (status: $verification_status)"
        return 1
    fi
}

# Function to check DKIM status
check_dkim_status() {
    local email_address="$1"
    local identity_domain="${email_address#*@}"
    
    log_info "Checking DKIM status for: $identity_domain"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would check DKIM status"
        return 0
    fi
    
    local dkim_status=$(aws ses get-identity-dkim-attributes \
        --identities "$identity_domain" \
        --region "$AWS_REGION" \
        --query "DkimAttributes.\"$identity_domain\".DkimEnabled" \
        --output text 2>/dev/null)
    
    if [[ "$dkim_status" == "true" ]]; then
        log_success "DKIM enabled for domain: $identity_domain"
    else
        log_warning "DKIM not enabled for domain: $identity_domain"
    fi
}

# Function to check if SES templates exist
check_ses_templates() {
    log_info "Checking if SES email templates exist..."
    
    local templates=(
        "gitstream-password-reset-${ENVIRONMENT}"
        "gitstream-welcome-${ENVIRONMENT}"
        "gitstream-login-notification-${ENVIRONMENT}"
        "gitstream-account-locked-${ENVIRONMENT}"
        "gitstream-password-changed-${ENVIRONMENT}"
    )
    
    for template in "${templates[@]}"; do
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY-RUN] Would check template: $template"
            continue
        fi
        
        if aws ses get-template --template-name "$template" --region "$AWS_REGION" &>/dev/null; then
            log_success "Template exists: $template"
        else
            log_error "Template not found: $template"
            return 1
        fi
    done
}

# Function to validate template syntax
validate_template_syntax() {
    local template_name="$1"
    
    log_info "Validating template syntax: $template_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would validate template syntax"
        return 0
    fi
    
    # Get template content
    local template_content=$(aws ses get-template \
        --template-name "$template_name" \
        --region "$AWS_REGION" \
        --output json 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to retrieve template: $template_name"
        return 1
    fi
    
    # Basic validation - check for required variables
    local html_part=$(echo "$template_content" | jq -r '.Template.HtmlPart')
    local text_part=$(echo "$template_content" | jq -r '.Template.TextPart')
    local subject=$(echo "$template_content" | jq -r '.Template.SubjectPart')
    
    # Check if template parts exist
    if [[ "$html_part" == "null" ]] || [[ -z "$html_part" ]]; then
        log_error "Template $template_name is missing HTML part"
        return 1
    fi
    
    if [[ "$text_part" == "null" ]] || [[ -z "$text_part" ]]; then
        log_error "Template $template_name is missing text part"
        return 1
    fi
    
    if [[ "$subject" == "null" ]] || [[ -z "$subject" ]]; then
        log_error "Template $template_name is missing subject"
        return 1
    fi
    
    log_success "Template syntax validation passed: $template_name"
}

# Function to send test email
send_test_email() {
    local template_name="$1"
    local test_data="$2"
    
    if [[ -z "$TEST_EMAIL" ]]; then
        log_warning "No test email provided, skipping email sending test for: $template_name"
        return 0
    fi
    
    log_info "Sending test email using template: $template_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would send test email to: $TEST_EMAIL"
        return 0
    fi
    
    aws ses send-templated-email \
        --region "$AWS_REGION" \
        --source "$FROM_ADDRESS" \
        --destination "ToAddresses=$TEST_EMAIL" \
        --template "$template_name" \
        --template-data "$test_data" \
        --configuration-set-name "$CONFIGURATION_SET" &>/dev/null
    
    if [[ $? -eq 0 ]]; then
        log_success "Test email sent successfully using template: $template_name"
    else
        log_error "Failed to send test email using template: $template_name"
        return 1
    fi
}

# Main validation function
main() {
    local exit_code=0
    
    # Step 1: Validate SES identity
    if ! validate_ses_identity "$FROM_ADDRESS"; then
        exit_code=1
    fi
    
    # Step 2: Check DKIM status
    check_dkim_status "$FROM_ADDRESS"
    
    # Step 3: Check if templates exist
    if ! check_ses_templates; then
        exit_code=1
    fi
    
    # Step 4: Validate template syntax
    local templates=(
        "gitstream-password-reset-${ENVIRONMENT}"
        "gitstream-welcome-${ENVIRONMENT}"
        "gitstream-login-notification-${ENVIRONMENT}"
        "gitstream-account-locked-${ENVIRONMENT}"
        "gitstream-password-changed-${ENVIRONMENT}"
    )
    
    for template in "${templates[@]}"; do
        if ! validate_template_syntax "$template"; then
            exit_code=1
        fi
    done
    
    # Step 5: Send test emails (if not validate-only)
    if [[ "$VALIDATE_ONLY" == "false" ]] && [[ -n "$TEST_EMAIL" ]]; then
        log_info "Sending test emails..."
        
        # Test password reset email
        local password_reset_data='{"resetLink":"https://test.example.com/reset?token=test123","name":"Test User"}'
        if ! send_test_email "gitstream-password-reset-${ENVIRONMENT}" "$password_reset_data"; then
            exit_code=1
        fi
        
        # Test welcome email
        local welcome_data='{"name":"Test User","portalDomain":"portal.example.com"}'
        if ! send_test_email "gitstream-welcome-${ENVIRONMENT}" "$welcome_data"; then
            exit_code=1
        fi
        
        # Test login notification email
        local login_data='{"name":"Test User","loginTime":"2025-01-01 12:00:00 UTC","location":"New York, NY","device":"Chrome on Windows","ipAddress":"192.168.1.1","customDomain":"auth.example.com","portalDomain":"portal.example.com"}'
        if ! send_test_email "gitstream-login-notification-${ENVIRONMENT}" "$login_data"; then
            exit_code=1
        fi
        
        # Test account locked email
        local account_locked_data='{"name":"Test User","lockReason":"Too many failed login attempts","unlockTime":"2025-01-01 13:00:00 UTC","supportLink":"https://support.example.com","customDomain":"auth.example.com"}'
        if ! send_test_email "gitstream-account-locked-${ENVIRONMENT}" "$account_locked_data"; then
            exit_code=1
        fi
        
        # Test password changed email
        local password_changed_data='{"name":"Test User","changeTime":"2025-01-01 12:00:00 UTC","supportLink":"https://support.example.com","customDomain":"auth.example.com"}'
        if ! send_test_email "gitstream-password-changed-${ENVIRONMENT}" "$password_changed_data"; then
            exit_code=1
        fi
    fi
    
    # Summary
    echo
    if [[ $exit_code -eq 0 ]]; then
        log_success "Email templates validation completed successfully!"
        if [[ -n "$TEST_EMAIL" ]] && [[ "$VALIDATE_ONLY" == "false" ]]; then
            log_info "Test emails sent to: $TEST_EMAIL"
        fi
    else
        log_error "Email templates validation failed!"
    fi
    
    return $exit_code
}

# Run main function
main "$@"