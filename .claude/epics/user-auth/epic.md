---
name: user-auth
status: backlog
created: 2025-08-22T12:04:16Z
progress: 0%
prd: .claude/prds/user-auth.md
github: https://github.com/0xM4sk/GitStream/issues/1
---

# Epic: user-auth

## Overview

Build a lightweight OAuth authentication system for AWS-hosted RAG knowledge portal using AWS Cognito User Pools as the primary identity provider. The implementation leverages AWS managed services to minimize custom code while supporting Microsoft, Google, and LinkedIn OAuth providers with email/password fallback. Focus on simplicity and rapid deployment for small user base (<10 users) with viewer-only access.

## Architecture Decisions

### Core Technology Stack
- **Identity Provider**: AWS Cognito User Pools for unified user management
- **OAuth Integration**: Cognito federated identity providers for Microsoft, Google, LinkedIn
- **Session Management**: Cognito JWT tokens with configurable expiration
- **Frontend**: Simple login UI with Cognito SDK integration
- **Backend**: Minimal custom Lambda functions for user profile management
- **Storage**: Cognito user pool for profiles, DynamoDB for session metadata if needed

### Key Technical Decisions
- **Leverage AWS Cognito**: Reduces custom authentication code by 80%
- **Federated Identity Providers**: Use Cognito's built-in OAuth provider support
- **JWT Token Strategy**: Cognito-managed tokens eliminate custom session storage
- **Progressive OAuth Implementation**: Start with Google, add providers iteratively
- **Minimal Custom Backend**: Focus on configuration over custom development

## Technical Approach

### Frontend Components
**Login Interface**
- Simple login page with provider selection (Google, Microsoft, LinkedIn, Email/Password)
- Cognito SDK integration for OAuth redirects and token handling
- User profile display component showing name, email, provider
- Logout functionality with token invalidation

**Authentication Flow**
- Cognito-hosted UI for OAuth flows (reduces custom frontend code)
- Custom domain configuration for branded login experience
- Automatic redirection to portal dashboard post-authentication
- Error handling for failed authentication attempts

### Backend Services
**AWS Cognito Configuration**
- User Pool with federated identity providers
- OAuth provider integration (Google, Microsoft, LinkedIn)
- Custom attributes for provider tracking
- Password policy configuration for email/password users

**Minimal Lambda Functions** (if needed)
- User onboarding post-authentication trigger
- Custom claims injection for portal access
- Admin functions for user management

**API Integration**
- Portal backend integration with Cognito JWT validation
- Middleware for session validation on protected routes
- User context injection for portal features

### Infrastructure
**AWS Services**
- Cognito User Pool with App Client configuration
- CloudFormation/CDK for infrastructure as code
- CloudWatch for authentication event logging
- SES for password reset emails (if not using OAuth)

**Domain and SSL**
- Custom domain for Cognito hosted UI
- SSL certificate through AWS Certificate Manager
- OAuth callback URL configuration

**Security Configuration**
- HTTPS-only communication
- Secure token storage (httpOnly cookies)
- CSRF protection through Cognito
- Rate limiting via AWS WAF if needed

## Implementation Strategy

### Phase 1: AWS Cognito Setup (Week 1)
- Create Cognito User Pool with basic configuration
- Configure Google OAuth as proof of concept
- Set up custom domain and SSL certificate
- Deploy basic infrastructure

### Phase 2: Frontend Integration (Week 2)
- Implement Cognito SDK integration
- Create simple login UI with OAuth flow
- Add user profile display and logout
- Test end-to-end authentication flow

### Phase 3: Additional Providers (Week 3)
- Add Microsoft and LinkedIn OAuth providers
- Configure email/password fallback option
- Implement password reset functionality
- Add error handling and user feedback

### Phase 4: Portal Integration (Week 4)
- Integrate authentication with existing RAG portal
- Add JWT validation middleware
- Test session management and refresh
- Deploy to production environment

### Risk Mitigation
- **OAuth Provider Limits**: Configure multiple providers to avoid single point of failure
- **Cognito Limitations**: Test all required features before full implementation
- **Session Management**: Use Cognito's built-in token refresh to avoid custom session logic
- **Deployment Issues**: Use infrastructure as code for repeatable deployments

### Testing Approach
- **Unit Tests**: Minimal custom code reduces test surface area
- **Integration Tests**: Test OAuth flows with each provider
- **End-to-End Tests**: Complete user journey from login to portal access
- **Security Tests**: Token validation, session expiration, logout functionality

## Task Breakdown Preview

High-level task categories that will be created:
- [ ] **AWS Cognito Infrastructure**: User Pool setup, federated identity providers, domain configuration
- [ ] **OAuth Provider Configuration**: Google, Microsoft, LinkedIn app registration and integration
- [ ] **Frontend Authentication UI**: Login interface, OAuth flows, user profile components
- [ ] **Backend Integration**: Portal authentication middleware, JWT validation, session management
- [ ] **Email/Password System**: Cognito email verification, password reset, account recovery
- [ ] **Security Configuration**: HTTPS setup, token security, CSRF protection
- [ ] **Testing & Validation**: End-to-end testing, security testing, provider testing
- [ ] **Documentation & Deployment**: Configuration guides, deployment scripts, monitoring setup

## Dependencies

### External Service Dependencies
- **OAuth Provider Setup**: Google Cloud Console, Microsoft Azure AD, LinkedIn Developer Portal apps
- **AWS Services**: Cognito, SES, Certificate Manager, CloudWatch
- **Domain Configuration**: DNS setup for callback URLs and custom domain

### Internal Team Dependencies
- **AWS Account Access**: Permissions to create Cognito resources and configure services
- **Domain Control**: Ability to configure DNS records for custom domain
- **Portal Backend**: Coordination with existing RAG portal for JWT integration

### Prerequisite Work
- **OAuth Application Registration**: Create apps in each provider console
- **AWS Infrastructure Access**: Ensure deployment permissions and service limits
- **SSL Certificate**: Valid certificate for production domain

## Success Criteria (Technical)

### Performance Benchmarks
- **Authentication Response**: <1 second for token validation
- **OAuth Flow Completion**: <3 seconds end-to-end
- **Session Validation**: <500ms for protected resource access
- **Concurrent Users**: Support 10 simultaneous users without degradation

### Quality Gates
- **Security Testing**: No vulnerabilities in authentication flow
- **Cross-Provider Testing**: All OAuth providers function correctly
- **Session Management**: Tokens expire and refresh properly
- **Error Handling**: Graceful failure handling for all edge cases

### Acceptance Criteria
- **User Registration**: Self-service registration through any supported provider
- **Login Success**: >95% success rate for valid credentials
- **Session Persistence**: 7-day session duration with automatic refresh
- **Portal Integration**: Seamless transition from authentication to portal access

## Estimated Effort

### Overall Timeline: 3-4 weeks
- **Week 1**: AWS Cognito infrastructure and Google OAuth
- **Week 2**: Frontend integration and testing
- **Week 3**: Additional OAuth providers and email/password
- **Week 4**: Portal integration and production deployment

### Resource Requirements
- **Single Developer**: Full-stack capable with AWS experience
- **AWS Services**: Cognito, SES, CloudWatch (minimal cost for <10 users)
- **OAuth Applications**: Free tier sufficient for all providers

### Critical Path Items
1. **OAuth Provider Setup**: Required before any authentication testing
2. **Cognito Configuration**: Foundation for all authentication flows
3. **Custom Domain Setup**: Required for production OAuth callbacks
4. **Portal Integration**: Final step before user access

### Complexity Assessment
- **Low Complexity**: Leveraging AWS managed services reduces custom code by 80%
- **Well-Documented**: Cognito OAuth integration has extensive AWS documentation
- **Proven Patterns**: Standard OAuth 2.0 flows with established libraries
- **Minimal Maintenance**: AWS manages infrastructure and security updates

## Tasks Created

- [ ] #2 - AWS Cognito Infrastructure Setup (parallel: false)
- [ ] #4 - OAuth Provider Configuration (parallel: true)
- [ ] #6 - Frontend Authentication UI (parallel: true)
- [ ] #3 - Email/Password Authentication System (parallel: true)
- [ ] #5 - Backend Portal Integration (parallel: false)
- [ ] #7 - Security Configuration & Testing (parallel: false)
- [ ] #8 - Testing, Documentation & Production Deployment (parallel: false)

Total tasks: 7
Parallel tasks: 3
Sequential tasks: 4
