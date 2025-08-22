#!/bin/bash

# troubleshoot-dns.sh
# Advanced DNS troubleshooting for AWS Cognito custom domains

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
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

print_debug() {
    echo -e "${CYAN}[DEBUG]${NC} $1"
}

show_usage() {
    echo "Usage: $0 <domain_name> [options]"
    echo ""
    echo "Parameters:"
    echo "  domain_name     - Domain to troubleshoot (e.g., auth.gitstream.com)"
    echo ""
    echo "Options:"
    echo "  -d, --debug     - Show detailed debug information"
    echo "  -f, --fix       - Attempt automatic fixes where possible"
    echo "  -r, --report    - Generate detailed report file"
    echo "  -h, --help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 auth.gitstream.com"
    echo "  $0 auth-dev.gitstream.com --debug"
    echo "  $0 auth.gitstream.com --fix --report"
    echo ""
}

# Default options
DEBUG=false
AUTO_FIX=false
GENERATE_REPORT=false
REPORT_FILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--debug)
            DEBUG=true
            shift
            ;;
        -f|--fix)
            AUTO_FIX=true
            shift
            ;;
        -r|--report)
            GENERATE_REPORT=true
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

# Set up report file if requested
if [ "$GENERATE_REPORT" = true ]; then
    REPORT_FILE="dns-troubleshoot-$(echo "$DOMAIN_NAME" | tr '.' '-')-$(date +%Y%m%d-%H%M%S).txt"
    echo "DNS Troubleshooting Report for $DOMAIN_NAME" > "$REPORT_FILE"
    echo "Generated: $(date)" >> "$REPORT_FILE"
    echo "=========================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Function to log to report
log_to_report() {
    if [ "$GENERATE_REPORT" = true ]; then
        echo "$1" >> "$REPORT_FILE"
    fi
}

# Function to check if tools are available
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command -v dig &> /dev/null; then
        missing_tools+=("dig")
    fi
    
    if ! command -v nslookup &> /dev/null; then
        missing_tools+=("nslookup")
    fi
    
    if ! command -v host &> /dev/null; then
        missing_tools+=("host")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_warning "Missing DNS tools: ${missing_tools[*]}"
        echo "Install with: sudo apt-get install dnsutils (Ubuntu/Debian) or brew install bind (macOS)"
        log_to_report "Missing DNS tools: ${missing_tools[*]}"
    else
        print_success "All DNS tools available"
    fi
}

# Function to check basic DNS resolution
check_basic_dns() {
    print_info "1. Basic DNS Resolution Check"
    log_to_report "1. Basic DNS Resolution Check"
    log_to_report "================================"
    
    # Check A record
    local a_record=$(dig +short "$DOMAIN_NAME" A 2>/dev/null || echo "")
    if [ -n "$a_record" ]; then
        print_warning "Domain has A record(s): $a_record"
        print_warning "This may conflict with CNAME record for Cognito"
        log_to_report "A Record found: $a_record (WARNING: May conflict with CNAME)"
    else
        print_success "No conflicting A record found"
        log_to_report "No A record found (good for CNAME)"
    fi
    
    # Check CNAME record
    local cname_record=$(dig +short "$DOMAIN_NAME" CNAME 2>/dev/null || echo "")
    if [ -n "$cname_record" ]; then
        if [[ "$cname_record" == *"cloudfront.net"* ]]; then
            print_success "CNAME points to CloudFront: $cname_record"
            log_to_report "CNAME Record: $cname_record (CloudFront - CORRECT)"
        else
            print_error "CNAME does not point to CloudFront: $cname_record"
            log_to_report "CNAME Record: $cname_record (NOT CloudFront - INCORRECT)"
        fi
    else
        print_error "No CNAME record found"
        log_to_report "No CNAME record found (MISSING)"
    fi
    
    echo ""
}

# Function to check DNS propagation across multiple servers
check_dns_propagation() {
    print_info "2. DNS Propagation Check"
    log_to_report ""
    log_to_report "2. DNS Propagation Check"
    log_to_report "========================"
    
    local dns_servers=(
        "8.8.8.8:Google"
        "1.1.1.1:Cloudflare"
        "208.67.222.222:OpenDNS"
        "9.9.9.9:Quad9"
        "8.26.56.26:Comodo"
    )
    
    local propagation_issues=0
    
    for server_info in "${dns_servers[@]}"; do
        local server=$(echo "$server_info" | cut -d: -f1)
        local name=$(echo "$server_info" | cut -d: -f2)
        
        local result=$(dig @"$server" +short "$DOMAIN_NAME" CNAME 2>/dev/null || echo "TIMEOUT")
        
        if [ "$result" = "TIMEOUT" ]; then
            print_error "$name ($server): Query timeout"
            log_to_report "$name ($server): TIMEOUT"
            ((propagation_issues++))
        elif [ -z "$result" ]; then
            print_error "$name ($server): No CNAME record"
            log_to_report "$name ($server): No CNAME"
            ((propagation_issues++))
        elif [[ "$result" == *"cloudfront.net"* ]]; then
            print_success "$name ($server): $result"
            log_to_report "$name ($server): $result (OK)"
        else
            print_warning "$name ($server): $result (not CloudFront)"
            log_to_report "$name ($server): $result (WARNING)"
            ((propagation_issues++))
        fi
        
        if [ "$DEBUG" = true ]; then
            local full_query=$(dig @"$server" "$DOMAIN_NAME" CNAME 2>/dev/null)
            print_debug "Full query result for $name:"
            echo "$full_query" | head -20
        fi
    done
    
    if [ $propagation_issues -eq 0 ]; then
        print_success "DNS propagation complete across all tested servers"
    else
        print_warning "$propagation_issues server(s) showing propagation issues"
    fi
    
    echo ""
}

# Function to check DNS record types for conflicts
check_record_conflicts() {
    print_info "3. DNS Record Conflict Check"
    log_to_report ""
    log_to_report "3. DNS Record Conflict Check"
    log_to_report "============================"
    
    # Check all record types that might conflict
    local record_types=("A" "AAAA" "ALIAS" "TXT")
    local conflicts_found=false
    
    for record_type in "${record_types[@]}"; do
        local records=$(dig +short "$DOMAIN_NAME" "$record_type" 2>/dev/null || echo "")
        
        if [ -n "$records" ]; then
            case $record_type in
                "A"|"AAAA"|"ALIAS")
                    print_warning "$record_type record found: $records"
                    print_warning "This conflicts with CNAME record for Cognito"
                    log_to_report "$record_type Record: $records (CONFLICT WITH CNAME)"
                    conflicts_found=true
                    ;;
                "TXT")
                    print_info "$record_type record found: $records"
                    log_to_report "$record_type Record: $records (informational)"
                    ;;
            esac
        fi
    done
    
    if [ "$conflicts_found" = false ]; then
        print_success "No conflicting DNS records found"
        log_to_report "No conflicting DNS records found"
    fi
    
    echo ""
}

# Function to check TTL values
check_ttl_values() {
    print_info "4. TTL (Time To Live) Check"
    log_to_report ""
    log_to_report "4. TTL Check"
    log_to_report "============"
    
    local cname_ttl=$(dig "$DOMAIN_NAME" CNAME | grep -E "^$DOMAIN_NAME" | awk '{print $2}' | head -1)
    
    if [ -n "$cname_ttl" ] && [ "$cname_ttl" -gt 0 ]; then
        if [ "$cname_ttl" -le 300 ]; then
            print_success "CNAME TTL is $cname_ttl seconds (good for quick updates)"
            log_to_report "CNAME TTL: $cname_ttl seconds (optimal)"
        elif [ "$cname_ttl" -le 3600 ]; then
            print_info "CNAME TTL is $cname_ttl seconds (acceptable)"
            log_to_report "CNAME TTL: $cname_ttl seconds (acceptable)"
        else
            print_warning "CNAME TTL is $cname_ttl seconds (high - slow propagation)"
            log_to_report "CNAME TTL: $cname_ttl seconds (high)"
        fi
    else
        print_warning "Could not determine CNAME TTL"
        log_to_report "CNAME TTL: Unknown"
    fi
    
    echo ""
}

# Function to check reverse DNS
check_reverse_dns() {
    if [ "$DEBUG" != true ]; then
        return
    fi
    
    print_info "5. Reverse DNS Check (Debug Mode)"
    log_to_report ""
    log_to_report "5. Reverse DNS Check"
    log_to_report "==================="
    
    # Get the CloudFront distribution from CNAME
    local cloudfront_domain=$(dig +short "$DOMAIN_NAME" CNAME 2>/dev/null | head -1)
    
    if [[ "$cloudfront_domain" == *"cloudfront.net"* ]]; then
        print_debug "Testing reverse lookup for: $cloudfront_domain"
        
        # Get IP addresses of CloudFront distribution
        local cf_ips=$(dig +short "$cloudfront_domain" A 2>/dev/null)
        
        if [ -n "$cf_ips" ]; then
            echo "$cf_ips" | while read -r ip; do
                local reverse=$(dig +short -x "$ip" 2>/dev/null || echo "No reverse DNS")
                print_debug "IP $ip -> $reverse"
                log_to_report "CloudFront IP $ip -> $reverse"
            done
        else
            print_debug "Could not resolve CloudFront IPs"
            log_to_report "Could not resolve CloudFront IPs"
        fi
    else
        print_debug "No CloudFront domain found in CNAME"
        log_to_report "No CloudFront domain found for reverse lookup"
    fi
    
    echo ""
}

# Function to check DNS path resolution
check_dns_path() {
    print_info "6. DNS Resolution Path Analysis"
    log_to_report ""
    log_to_report "6. DNS Resolution Path"
    log_to_report "====================="
    
    # Trace DNS resolution path
    print_info "Tracing DNS resolution path for $DOMAIN_NAME"
    
    # Use dig with +trace for detailed path (if available)
    if command -v dig &> /dev/null; then
        local trace_output=$(timeout 30 dig +trace "$DOMAIN_NAME" CNAME 2>/dev/null || echo "TIMEOUT")
        
        if [ "$trace_output" != "TIMEOUT" ]; then
            if [ "$DEBUG" = true ]; then
                print_debug "Full DNS trace:"
                echo "$trace_output"
            fi
            
            # Extract key information
            local root_servers=$(echo "$trace_output" | grep -E "\..*IN.*NS" | head -3)
            local tld_servers=$(echo "$trace_output" | grep -E "\.com.*IN.*NS" | head -3)
            
            if [ -n "$root_servers" ]; then
                print_success "Root servers responding"
                log_to_report "Root servers: OK"
            fi
            
            if [ -n "$tld_servers" ]; then
                print_success "TLD servers responding"
                log_to_report "TLD servers: OK"
            fi
        else
            print_warning "DNS trace timeout (network or DNS issues)"
            log_to_report "DNS trace: TIMEOUT"
        fi
    fi
    
    echo ""
}

# Function to suggest fixes
suggest_fixes() {
    print_info "7. Troubleshooting Recommendations"
    log_to_report ""
    log_to_report "7. Recommendations"
    log_to_report "=================="
    
    local cname_record=$(dig +short "$DOMAIN_NAME" CNAME 2>/dev/null || echo "")
    local a_record=$(dig +short "$DOMAIN_NAME" A 2>/dev/null || echo "")
    
    echo "Based on the analysis, here are recommended actions:"
    log_to_report "Recommendations based on DNS analysis:"
    
    if [ -z "$cname_record" ]; then
        print_error "Missing CNAME Record"
        echo "  Action: Create CNAME record pointing to your CloudFront distribution"
        echo "  Example: $DOMAIN_NAME CNAME d1234567890.cloudfront.net"
        log_to_report "- Create missing CNAME record"
        
        # Try to get CloudFront domain from Cognito
        if command -v aws &> /dev/null; then
            local cognito_cf=$(aws cognito-idp describe-user-pool-domain \
                --domain "$DOMAIN_NAME" \
                --query 'DomainDescription.CloudFrontDistribution' \
                --output text 2>/dev/null || echo "")
            
            if [ -n "$cognito_cf" ] && [ "$cognito_cf" != "None" ]; then
                echo "  CloudFront target: $cognito_cf"
                log_to_report "  CloudFront target: $cognito_cf"
            fi
        fi
    fi
    
    if [ -n "$a_record" ]; then
        print_error "Conflicting A Record"
        echo "  Action: Remove A record for $DOMAIN_NAME (conflicts with CNAME)"
        echo "  Current A record: $a_record"
        log_to_report "- Remove conflicting A record: $a_record"
    fi
    
    if [[ "$cname_record" != *"cloudfront.net"* ]] && [ -n "$cname_record" ]; then
        print_error "Incorrect CNAME Target"
        echo "  Action: Update CNAME to point to CloudFront distribution"
        echo "  Current target: $cname_record"
        echo "  Should point to: *.cloudfront.net domain"
        log_to_report "- Update CNAME target from $cname_record to CloudFront"
    fi
    
    # DNS propagation recommendations
    local propagation_issues=$(dig +short "$DOMAIN_NAME" CNAME @8.8.8.8 2>/dev/null || echo "")
    if [ -z "$propagation_issues" ]; then
        print_warning "DNS Propagation Issues"
        echo "  Action: Wait for DNS propagation (up to 48 hours)"
        echo "  Action: Check DNS configuration at your provider"
        echo "  Action: Consider lowering TTL values for faster updates"
        log_to_report "- Wait for DNS propagation or check DNS provider"
    fi
    
    # General recommendations
    echo ""
    echo "General recommendations:"
    echo "• Set CNAME TTL to 300 seconds for faster updates"
    echo "• Use only CNAME record (no A, AAAA, or ALIAS records)"
    echo "• Verify domain configuration in AWS Cognito console"
    echo "• Test from multiple networks and DNS servers"
    echo "• Monitor DNS changes with online DNS checking tools"
    
    log_to_report ""
    log_to_report "General recommendations:"
    log_to_report "- Set CNAME TTL to 300 seconds"
    log_to_report "- Use only CNAME record"
    log_to_report "- Verify Cognito configuration"
    log_to_report "- Test from multiple networks"
    
    echo ""
}

# Function to attempt automatic fixes
attempt_fixes() {
    if [ "$AUTO_FIX" != true ]; then
        return
    fi
    
    print_info "8. Attempting Automatic Fixes"
    log_to_report ""
    log_to_report "8. Automatic Fix Attempts"
    log_to_report "========================="
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLI not available - cannot attempt automatic fixes"
        log_to_report "AWS CLI not available for automatic fixes"
        return
    fi
    
    # Try to get correct CloudFront domain from Cognito
    local cognito_cf=$(aws cognito-idp describe-user-pool-domain \
        --domain "$DOMAIN_NAME" \
        --query 'DomainDescription.CloudFrontDistribution' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$cognito_cf" ] && [ "$cognito_cf" != "None" ]; then
        print_info "Found CloudFront distribution: $cognito_cf"
        log_to_report "CloudFront distribution found: $cognito_cf"
        
        # Check if Route 53 hosted zone exists
        local hosted_zones=$(aws route53 list-hosted-zones-by-name \
            --dns-name "$DOMAIN_NAME" \
            --query 'HostedZones[0].Id' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$hosted_zones" ] && [ "$hosted_zones" != "None" ]; then
            print_info "Route 53 hosted zone found - automatic fix possible"
            print_warning "Automatic DNS fixes require manual confirmation"
            echo "To create the correct CNAME record, run:"
            echo "aws route53 change-resource-record-sets --hosted-zone-id $hosted_zones --change-batch '{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$DOMAIN_NAME\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$cognito_cf\"}]}}]}'"
            log_to_report "Route 53 fix command provided"
        else
            print_info "No Route 53 hosted zone found - manual DNS configuration required"
            log_to_report "Manual DNS configuration required"
        fi
    else
        print_warning "Could not determine correct CloudFront distribution"
        log_to_report "Could not determine CloudFront target"
    fi
}

# Function to generate final summary
generate_summary() {
    print_info "DNS Troubleshooting Complete"
    log_to_report ""
    log_to_report "Summary"
    log_to_report "======="
    
    # Quick recheck of final status
    local final_cname=$(dig +short "$DOMAIN_NAME" CNAME 2>/dev/null || echo "")
    local final_a=$(dig +short "$DOMAIN_NAME" A 2>/dev/null || echo "")
    
    if [[ "$final_cname" == *"cloudfront.net"* ]] && [ -z "$final_a" ]; then
        print_success "Domain appears correctly configured"
        log_to_report "Final status: CORRECTLY CONFIGURED"
    elif [ -n "$final_cname" ]; then
        print_warning "Domain has CNAME but may not point to CloudFront"
        log_to_report "Final status: PARTIALLY CONFIGURED"
    else
        print_error "Domain DNS configuration needs attention"
        log_to_report "Final status: NEEDS CONFIGURATION"
    fi
    
    if [ "$GENERATE_REPORT" = true ]; then
        echo ""
        print_success "Detailed report saved to: $REPORT_FILE"
        log_to_report ""
        log_to_report "Report generated: $(date)"
    fi
}

# Main execution
main() {
    echo "DNS Troubleshooting for: $DOMAIN_NAME"
    echo "========================================"
    echo ""
    
    log_to_report "Domain: $DOMAIN_NAME"
    log_to_report "Debug Mode: $DEBUG"
    log_to_report "Auto Fix: $AUTO_FIX"
    log_to_report ""
    
    check_prerequisites
    check_basic_dns
    check_dns_propagation
    check_record_conflicts
    check_ttl_values
    check_reverse_dns
    check_dns_path
    suggest_fixes
    attempt_fixes
    generate_summary
}

# Run main function
main