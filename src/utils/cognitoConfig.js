/**
 * AWS Cognito Configuration
 * This file contains the configuration for AWS Cognito integration
 * Environment variables should be set for production deployment
 */

// Environment-based configuration
const getEnvironment = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  } else if (hostname.includes('staging')) {
    return 'staging';
  } else {
    return 'production';
  }
};

const environment = getEnvironment();

// Environment-specific configuration
const envConfig = {
  development: {
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    authDomain: process.env.REACT_APP_AUTH_DOMAIN || 'auth-dev.gitstream.com',
    redirectSignIn: 'http://localhost:3000/auth/callback',
    redirectSignOut: 'http://localhost:3000/auth/logout',
    responseType: 'code',
    scopes: ['openid', 'email', 'profile']
  },
  staging: {
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    authDomain: process.env.REACT_APP_AUTH_DOMAIN || 'auth-staging.gitstream.com',
    redirectSignIn: 'https://staging.gitstream.com/auth/callback',
    redirectSignOut: 'https://staging.gitstream.com/auth/logout',
    responseType: 'code',
    scopes: ['openid', 'email', 'profile']
  },
  production: {
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    authDomain: process.env.REACT_APP_AUTH_DOMAIN || 'auth.gitstream.com',
    redirectSignIn: 'https://gitstream.com/auth/callback',
    redirectSignOut: 'https://gitstream.com/auth/logout',
    responseType: 'code',
    scopes: ['openid', 'email', 'profile']
  }
};

// Current environment configuration
const config = envConfig[environment];

// AWS Amplify configuration object
export const amplifyConfig = {
  Auth: {
    region: 'us-east-1',
    userPoolId: config.userPoolId,
    userPoolWebClientId: config.userPoolWebClientId,
    oauth: {
      domain: config.authDomain,
      scope: config.scopes,
      redirectSignIn: config.redirectSignIn,
      redirectSignOut: config.redirectSignOut,
      responseType: config.responseType
    }
  }
};

// Cognito User Pool configuration for direct SDK usage
export const cognitoConfig = {
  UserPoolId: config.userPoolId,
  ClientId: config.userPoolWebClientId,
  Region: 'us-east-1'
};

// OAuth provider URLs and configuration
export const oauthProviders = {
  google: {
    name: 'Google',
    provider: 'Google',
    customProviderUrl: `https://${config.authDomain}/oauth2/authorize?identity_provider=Google&redirect_uri=${encodeURIComponent(config.redirectSignIn)}&response_type=code&client_id=${config.userPoolWebClientId}&scope=openid%20email%20profile`
  },
  microsoft: {
    name: 'Microsoft',
    provider: 'Microsoft', 
    customProviderUrl: `https://${config.authDomain}/oauth2/authorize?identity_provider=Microsoft&redirect_uri=${encodeURIComponent(config.redirectSignIn)}&response_type=code&client_id=${config.userPoolWebClientId}&scope=openid%20email%20profile`
  },
  linkedin: {
    name: 'LinkedIn',
    provider: 'LinkedIn',
    customProviderUrl: `https://${config.authDomain}/oauth2/authorize?identity_provider=LinkedIn&redirect_uri=${encodeURIComponent(config.redirectSignIn)}&response_type=code&client_id=${config.userPoolWebClientId}&scope=openid%20email%20profile`
  },
  cognito: {
    name: 'Email/Password',
    provider: 'COGNITO',
    customProviderUrl: `https://${config.authDomain}/login?client_id=${config.userPoolWebClientId}&response_type=code&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(config.redirectSignIn)}`
  }
};

// Helper functions
export const getHostedUIUrl = (provider = 'COGNITO') => {
  const baseUrl = `https://${config.authDomain}`;
  const params = new URLSearchParams({
    client_id: config.userPoolWebClientId,
    response_type: config.responseType,
    scope: config.scopes.join(' '),
    redirect_uri: config.redirectSignIn
  });

  if (provider !== 'COGNITO') {
    params.append('identity_provider', provider);
    return `${baseUrl}/oauth2/authorize?${params.toString()}`;
  }
  
  return `${baseUrl}/login?${params.toString()}`;
};

export const getLogoutUrl = () => {
  const baseUrl = `https://${config.authDomain}`;
  const params = new URLSearchParams({
    client_id: config.userPoolWebClientId,
    logout_uri: config.redirectSignOut
  });
  
  return `${baseUrl}/logout?${params.toString()}`;
};

// Token storage configuration
export const tokenStorage = {
  accessTokenKey: 'gitstream_access_token',
  idTokenKey: 'gitstream_id_token', 
  refreshTokenKey: 'gitstream_refresh_token',
  userDataKey: 'gitstream_user_data',
  expiryKey: 'gitstream_token_expiry',
  
  // Use sessionStorage for development, localStorage for production
  storage: environment === 'development' ? sessionStorage : localStorage
};

export default {
  amplifyConfig,
  cognitoConfig,
  oauthProviders,
  tokenStorage,
  environment,
  getHostedUIUrl,
  getLogoutUrl
};