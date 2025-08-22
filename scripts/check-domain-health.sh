#!/bin/bash

# check-domain-health.sh
# Comprehensive health check for AWS Cognito custom domains

set -e

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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

show_usage() {
    echo "Usage: $0 <domain_name> [options]"
    echo ""
    echo "Parameters:"
    echo "  domain_name     - Custom domain to check (e.g., auth.gitstream.com)"
    echo ""
    echo "Options:"
    echo "  -v, --verbose   - Show detailed output"
    echo "  -q, --quick     - Skip detailed SSL checks"
    echo "  -j, --json      - Output results in JSON format"
    echo "  -h, --help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 auth.gitstream.com"
    echo "  $0 auth-dev.gitstream.com --verbose"
    echo "  $0 auth.gitstream.com --json"
    echo ""
}

# Default options
VERBOSE=false
QUICK=false
JSON_OUTPUT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -q|--quick)
            QUICK=true
            shift
            ;;
        -j|--json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            if [ -z "$DOMAIN_NAME" ]; then
                DOMAIN_NAME=$1
            else
                print_error "Unknown option: $1"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name is required"
    show_usage
    exit 1
fi

# Initialize results
RESULTS="{\"domain\":\"$DOMAIN_NAME\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"checks\":{}}"

# Function to update JSON results
update_result() {
    local check_name=$1
    local status=$2
    local message=$3
    local details=$4
    
    if [ "$JSON_OUTPUT" = true ]; then
        RESULTS=$(echo "$RESULTS" | jq --arg check "$check_name" --arg status "$status" --arg msg "$message" --arg details "$details" \
            '.checks[$check] = {"status": $status, "message": $msg, "details": $details}')
    fi
}

# Function to check DNS resolution
check_dns_resolution() {
    if [ "$JSON_OUTPUT" != true ]; then
        print_status "1. DNS Resolution Check"
    fi
    
    # Check if domain resolves to CloudFront
    local cname_result=$(dig +short "$DOMAIN_NAME" CNAME 2>/dev/null | head -1)
    
    if [[ "$cname_result" == *"cloudfront.net"* ]]; then
        if [ "$JSON_OUTPUT" != true ]; then
            print_success "DNS resolves to CloudFront distribution: $cname_result"
        fi
        update_result "dns_resolution" "pass" "DNS resolves to CloudFront" "$cname_result"
        
        if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" != true ]; then
            echo "   CloudFront Distribution: $cname_result"
        fi
        return 0
    else
        if [ "$JSON_OUTPUT" != true ]; then
            print_error "DNS does not resolve to CloudFront distribution"
            if [ -n "$cname_result" ]; then
                echo "   Current CNAME: $cname_result"
            else
                echo "   No CNAME record found"
            fi
        fi
        update_result "dns_resolution" "fail" "DNS does not resolve to CloudFront" "$cname_result"
        return 1
    fi
}

# Function to check DNS propagation
check_dns_propagation() {
    if [ "$JSON_OUTPUT" != true ]; then
        print_status "2. DNS Propagation Check"
    fi
    
    local dns_servers=("8.8.8.8" "1.1.1.1" "208.67.222.222")
    local propagation_status="pass"
    local propagation_details=""
    
    for dns_server in "${dns_servers[@]}"; do
        local result=$(dig @"$dns_server" +short "$DOMAIN_NAME" CNAME 2>/dev/null | head -1)
        
        if [[ "$result" == *"cloudfront.net"* ]]; then
            if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" != true ]; then
                print_success "DNS server $dns_server: $result"
            fi
            propagation_details="$propagation_details $dns_server:pass"
        else
            if [ "$JSON_OUTPUT" != true ]; then
                print_warning "DNS server $dns_server: No CloudFront CNAME found"
            fi
            propagation_status="warning"
            propagation_details="$propagation_details $dns_server:fail"
        fi
    done
    
    update_result "dns_propagation" "$propagation_status" "DNS propagation check" "$propagation_details"
    
    if [ "$propagation_status" = "pass" ] && [ "$JSON_OUTPUT" != true ]; then
        print_success "DNS propagation complete across multiple servers"
    fi
}

# Function to check HTTPS connectivity
check_https_connectivity() {
    if [ "$JSON_OUTPUT" != true ]; then
        print_status "3. HTTPS Connectivity Check"
    fi
    
    local url="https://$DOMAIN_NAME/login"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    case $http_code in
        200|302|401)
            if [ "$JSON_OUTPUT" != true ]; then
                print_success "HTTPS endpoint responding (HTTP $http_code)"
            fi
            update_result "https_connectivity" "pass" "HTTPS endpoint responding" "HTTP $http_code"
            return 0
            ;;
        000)
            if [ "$JSON_OUTPUT" != true ]; then
                print_error "HTTPS endpoint not reachable (connection timeout/failed)"
            fi
            update_result "https_connectivity" "fail" "HTTPS endpoint not reachable" "Connection failed"
            return 1
            ;;
        *)
            if [ "$JSON_OUTPUT" != true ]; then
                print_warning "HTTPS endpoint responding with unexpected code: $http_code"
            fi
            update_result "https_connectivity" "warning" "Unexpected HTTP response code" "HTTP $http_code"
            return 1
            ;;
    esac
}

# Function to check SSL certificate
check_ssl_certificate() {
    if [ "$QUICK" = true ]; then
        return 0
    fi
    
    if [ "$JSON_OUTPUT" != true ]; then
        print_status "4. SSL Certificate Check"
    fi
    
    # Check certificate validity
    local cert_info=$(echo | timeout 10 openssl s_client -connect "$DOMAIN_NAME:443" -servername "$DOMAIN_NAME" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$cert_info" ]; then
        local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        local expiry_date=$(date -d "$not_after" +%s 2>/dev/null || echo "0")
        local current_date=$(date +%s)
        local days_until_expiry=$(( (expiry_date - current_date) / 86400 ))
        
        if [ $days_until_expiry -gt 30 ]; then
            if [ "$JSON_OUTPUT" != true ]; then
                print_success "SSL certificate valid ($days_until_expiry days until expiry)"
                if [ "$VERBOSE" = true ]; then
                    echo "   Expires: $not_after"
                fi
            fi
            update_result "ssl_certificate" "pass" "SSL certificate valid" "$days_until_expiry days until expiry"
        elif [ $days_until_expiry -gt 0 ]; then
            if [ "$JSON_OUTPUT" != true ]; then
                print_warning "SSL certificate expires soon ($days_until_expiry days)"
            fi
            update_result "ssl_certificate" "warning" "SSL certificate expires soon" "$days_until_expiry days until expiry"
        else
            if [ "$JSON_OUTPUT" != true ]; then
                print_error "SSL certificate has expired"
            fi
            update_result "ssl_certificate" "fail" "SSL certificate expired" "Expired"
        fi
    else
        if [ "$JSON_OUTPUT" != true ]; then
            print_error "SSL certificate check failed or certificate not accessible"
        fi
        update_result "ssl_certificate" "fail" "SSL certificate not accessible" "Check failed"
    fi
}

# Function to check Cognito domain status
check_cognito_domain_status() {
    if [ "$JSON_OUTPUT" != true ]; then
        print_status "5. Cognito Domain Status Check"
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        if [ "$JSON_OUTPUT" != true ]; then
            print_warning "AWS CLI not available, skipping Cognito domain status check"
        fi
        update_result "cognito_domain_status" "skip" "AWS CLI not available" "Skipped"
        return 0
    fi
    
    local domain_status=$(aws cognito-idp describe-user-pool-domain \
        --domain "$DOMAIN_NAME" \
        --query 'DomainDescription.Status' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    case $domain_status in
        "ACTIVE")
            if [ "$JSON_OUTPUT" != true ]; then
                print_success "Cognito domain is ACTIVE"
                
                if [ "$VERBOSE" = true ]; then
                    local cloudfront_domain=$(aws cognito-idp describe-user-pool-domain \
                        --domain "$DOMAIN_NAME" \
                        --query 'DomainDescription.CloudFrontDistribution' \
                        --output text 2>/dev/null)
                    echo "   CloudFront Distribution: $cloudfront_domain"
                fi
            fi
            update_result "cognito_domain_status" "pass" "Cognito domain is ACTIVE" "$domain_status"
            ;;
        "CREATING")
            if [ "$JSON_OUTPUT" != true ]; then
                print_warning "Cognito domain is still being created"
            fi
            update_result "cognito_domain_status" "warning" "Cognito domain still creating" "$domain_status"
            ;;
        "FAILED")
            if [ "$JSON_OUTPUT" != true ]; then
                print_error "Cognito domain configuration failed"
            fi
            update_result "cognito_domain_status" "fail" "Cognito domain configuration failed" "$domain_status"
            ;;
        "NOT_FOUND")
            if [ "$JSON_OUTPUT" != true ]; then
                print_error "Cognito domain not found or not accessible"
            fi
            update_result "cognito_domain_status" "fail" "Cognito domain not found" "$domain_status"
            ;;
        *)
            if [ "$JSON_OUTPUT" != true ]; then
                print_warning "Unknown Cognito domain status: $domain_status"
            fi
            update_result "cognito_domain_status" "warning" "Unknown domain status" "$domain_status"
            ;;
    esac
}

# Function to check CloudFront distribution health
check_cloudfront_health() {
    if [ "$QUICK" = true ] || [ "$JSON_OUTPUT" != true ]; then
        return 0
    fi
    
    print_status "6. CloudFront Distribution Health"
    
    # Get CloudFront distribution from DNS
    local cloudfront_domain=$(dig +short "$DOMAIN_NAME" CNAME 2>/dev/null | head -1)
    
    if [[ "$cloudfront_domain" == *"cloudfront.net"* ]]; then
        # Test CloudFront endpoint directly
        local cf_http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$cloudfront_domain/login" 2>/dev/null || echo "000")
        
        case $cf_http_code in
            200|302|401)
                print_success "CloudFront distribution responding (HTTP $cf_http_code)"
                ;;
            000)
                print_error "CloudFront distribution not reachable"
                ;;
            *)
                print_warning "CloudFront distribution responding with code: $cf_http_code"
                ;;
        esac
    else
        print_warning "Could not determine CloudFront distribution from DNS"
    fi
}

# Function to perform response time test
check_response_time() {
    if [ "$VERBOSE" != true ] || [ "$JSON_OUTPUT" = true ]; then
        return 0
    fi
    
    print_status "7. Response Time Check"
    
    local url="https://$DOMAIN_NAME/login"
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "0")
    
    if (( $(echo "$response_time > 0" | bc -l) )); then
        local response_ms=$(echo "$response_time * 1000" | bc -l | cut -d. -f1)
        
        if (( response_ms < 1000 )); then
            print_success "Response time: ${response_ms}ms (excellent)"
        elif (( response_ms < 3000 )); then
            print_success "Response time: ${response_ms}ms (good)"
        elif (( response_ms < 5000 )); then
            print_warning "Response time: ${response_ms}ms (acceptable)"
        else
            print_warning "Response time: ${response_ms}ms (slow)"
        fi
    else
        print_error "Could not measure response time"
    fi
}

# Function to generate summary
generate_summary() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "$RESULTS" | jq .
        return
    fi
    
    echo ""
    echo "=========================================="
    echo "Domain Health Check Summary"
    echo "=========================================="
    echo "Domain: $DOMAIN_NAME"
    echo "Check Time: $(date)"
    echo ""
    
    # Count check results from JSON
    local total_checks=$(echo "$RESULTS" | jq '.checks | length')
    local passed_checks=$(echo "$RESULTS" | jq '[.checks[] | select(.status == "pass")] | length')
    local warning_checks=$(echo "$RESULTS" | jq '[.checks[] | select(.status == "warning")] | length')
    local failed_checks=$(echo "$RESULTS" | jq '[.checks[] | select(.status == "fail")] | length')
    
    if [ $failed_checks -eq 0 ] && [ $warning_checks -eq 0 ]; then
        print_success "All checks passed ($passed_checks/$total_checks)"
        echo ""
        print_status "Your domain is healthy and ready for production use!"
    elif [ $failed_checks -eq 0 ]; then
        print_warning "Some checks have warnings ($warning_checks warnings, $passed_checks passed)"
        echo ""
        print_status "Your domain is functional but may need attention."
    else
        print_error "Some checks failed ($failed_checks failed, $warning_checks warnings, $passed_checks passed)"
        echo ""
        print_status "Your domain needs attention before production use."
    fi
    
    if [ $failed_checks -gt 0 ] || [ $warning_checks -gt 0 ]; then
        echo ""
        echo "Recommendations:"
        echo "• Check DNS configuration and CNAME records"
        echo "• Verify SSL certificate is valid and properly configured"
        echo "• Ensure Cognito domain is in ACTIVE status"
        echo "• Test from different networks and DNS servers"
        echo "• Monitor CloudWatch metrics for ongoing issues"
    fi
}

# Main execution
main() {
    if [ "$JSON_OUTPUT" != true ]; then
        echo "Domain Health Check for: $DOMAIN_NAME"
        echo "=========================================="
        echo ""
    fi
    
    # Run all checks
    check_dns_resolution
    check_dns_propagation
    check_https_connectivity
    check_ssl_certificate
    check_cognito_domain_status
    check_cloudfront_health
    check_response_time
    
    # Generate summary
    generate_summary
}

# Check for required tools
if [ "$JSON_OUTPUT" = true ] && ! command -v jq &> /dev/null; then
    print_error "jq is required for JSON output but not installed"
    exit 1
fi

# Run main function
main