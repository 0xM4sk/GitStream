/**
 * Password Validation Utility
 * 
 * Comprehensive password validation and policy enforcement
 * Supports configurable policies and detailed validation feedback
 */

/**
 * Default password policy configuration
 * Can be overridden by environment variables or user pool settings
 */
const DEFAULT_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialCharsPattern: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  allowCommonPasswords: false,
  allowSequentialChars: false,
  allowRepeatedChars: false,
  maxRepeatedChars: 2,
  allowUserInfoInPassword: false,
  requireUniqueCharacters: 4,
  preventPreviousPasswords: 0, // Number of previous passwords to check against
};

/**
 * Common weak passwords list (subset for client-side validation)
 */
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'password1', 'admin', 'letmein', 'welcome', 'monkey', '1234567890',
  'password!', 'Password1', 'password@123', 'admin123', 'root', 'user',
  'guest', 'test', 'demo', 'changeme', 'default', 'secret', 'temp',
  'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '111111',
  '000000', 'iloveyou', 'football', 'baseball', 'basketball', 'welcome123',
];

/**
 * Sequential character patterns to detect
 */
const SEQUENTIAL_PATTERNS = [
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiopasdfghjklzxcvbnm',
  '1234567890',
  'zyxwvutsrqponmlkjihgfedcba',
  '0987654321',
];

/**
 * Password validation result interface
 */
class ValidationResult {
  constructor() {
    this.isValid = false;
    this.score = 0; // 0-100
    this.feedback = [];
    this.requirements = [];
    this.strength = 'weak'; // weak, fair, good, strong
    this.estimatedCrackTime = '';
  }
}

/**
 * Password Validator Class
 */
class PasswordValidator {
  constructor(policy = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Main validation method
   */
  validate(password, userInfo = {}) {
    const result = new ValidationResult();
    
    if (!password) {
      result.feedback.push('Password is required');
      return result;
    }

    // Run all validation checks
    const checks = [
      this.validateLength.bind(this),
      this.validateCharacterRequirements.bind(this),
      this.validateCommonPasswords.bind(this),
      this.validateSequentialChars.bind(this),
      this.validateRepeatedChars.bind(this),
      this.validateUserInfo.bind(this),
      this.validateUniqueCharacters.bind(this),
    ];

    let passedChecks = 0;
    const totalChecks = checks.length;

    checks.forEach(check => {
      const checkResult = check(password, userInfo);
      if (checkResult.passed) {
        passedChecks++;
      } else {
        result.feedback.push(...checkResult.feedback);
        result.requirements.push(...checkResult.requirements);
      }
    });

    // Calculate score and strength
    result.score = Math.round((passedChecks / totalChecks) * 100);
    result.strength = this.calculateStrength(password, result.score);
    result.estimatedCrackTime = this.estimateCrackTime(password);
    result.isValid = result.feedback.length === 0;

    // Add positive feedback for strong passwords
    if (result.isValid && result.score >= 80) {
      result.feedback.unshift('Strong password! 💪');
    }

    return result;
  }

  /**
   * Quick validation for real-time feedback
   */
  quickValidate(password) {
    const result = {
      length: password ? password.length >= this.policy.minLength : false,
      uppercase: this.policy.requireUppercase ? /[A-Z]/.test(password) : true,
      lowercase: this.policy.requireLowercase ? /[a-z]/.test(password) : true,
      numbers: this.policy.requireNumbers ? /\d/.test(password) : true,
      special: this.policy.requireSpecialChars ? this.policy.specialCharsPattern.test(password) : true,
    };

    result.valid = Object.values(result).every(Boolean);
    return result;
  }

  /**
   * Validate password length
   */
  validateLength(password) {
    const feedback = [];
    const requirements = [];
    
    if (password.length < this.policy.minLength) {
      feedback.push(`Password must be at least ${this.policy.minLength} characters long`);
      requirements.push(`Minimum ${this.policy.minLength} characters`);
    }
    
    if (password.length > this.policy.maxLength) {
      feedback.push(`Password must be no more than ${this.policy.maxLength} characters long`);
      requirements.push(`Maximum ${this.policy.maxLength} characters`);
    }

    return {
      passed: feedback.length === 0,
      feedback,
      requirements,
    };
  }

  /**
   * Validate character requirements
   */
  validateCharacterRequirements(password) {
    const feedback = [];
    const requirements = [];

    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
      requirements.push('At least one uppercase letter (A-Z)');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
      requirements.push('At least one lowercase letter (a-z)');
    }

    if (this.policy.requireNumbers && !/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
      requirements.push('At least one number (0-9)');
    }

    if (this.policy.requireSpecialChars && !this.policy.specialCharsPattern.test(password)) {
      feedback.push('Password must contain at least one special character');
      requirements.push('At least one special character (!@#$%^&*...)');
    }

    return {
      passed: feedback.length === 0,
      feedback,
      requirements,
    };
  }

  /**
   * Validate against common passwords
   */
  validateCommonPasswords(password) {
    const feedback = [];
    const requirements = [];

    if (!this.policy.allowCommonPasswords) {
      const lowercasePassword = password.toLowerCase();
      if (COMMON_PASSWORDS.includes(lowercasePassword)) {
        feedback.push('This password is too common. Please choose a more unique password');
        requirements.push('Must not be a common password');
      }
    }

    return {
      passed: feedback.length === 0,
      feedback,
      requirements,
    };
  }

  /**
   * Validate sequential characters
   */
  validateSequentialChars(password) {
    const feedback = [];
    const requirements = [];

    if (!this.policy.allowSequentialChars) {
      const lowercasePassword = password.toLowerCase();
      
      for (const pattern of SEQUENTIAL_PATTERNS) {
        for (let i = 0; i <= pattern.length - 4; i++) {
          const sequence = pattern.substring(i, i + 4);
          const reverseSequence = sequence.split('').reverse().join('');
          
          if (lowercasePassword.includes(sequence) || lowercasePassword.includes(reverseSequence)) {
            feedback.push('Password should not contain sequential characters (e.g., "1234", "abcd")');
            requirements.push('No sequential characters');
            break;
          }
        }
        if (feedback.length > 0) break;
      }
    }

    return {
      passed: feedback.length === 0,
      feedback,
      requirements,
    };
  }

  /**
   * Validate repeated characters
   */
  validateRepeatedChars(password) {
    const feedback = [];
    const requirements = [];

    if (!this.policy.allowRepeatedChars || this.policy.maxRepeatedChars > 0) {
      const maxAllowed = this.policy.maxRepeatedChars || 2;
      
      for (let i = 0; i < password.length - maxAllowed; i++) {
        const char = password[i];
        let consecutive = 1;
        
        for (let j = i + 1; j < password.length && password[j] === char; j++) {
          consecutive++;
        }
        
        if (consecutive > maxAllowed) {
          feedback.push(`Password should not contain more than ${maxAllowed} consecutive identical characters`);
          requirements.push(`No more than ${maxAllowed} repeated characters`);
          break;
        }
      }
    }

    return {
      passed: feedback.length === 0,
      feedback,
      requirements,
    };
  }

  /**
   * Validate user information in password
   */
  validateUserInfo(password, userInfo = {}) {
    const feedback = [];
    const requirements = [];

    if (!this.policy.allowUserInfoInPassword && Object.keys(userInfo).length > 0) {
      const lowercasePassword = password.toLowerCase();
      const checkFields = ['email', 'firstName', 'lastName', 'username', 'name'];
      
      for (const field of checkFields) {
        if (userInfo[field]) {
          const value = userInfo[field].toLowerCase();
          if (value.length > 2 && lowercasePassword.includes(value)) {
            feedback.push('Password should not contain your personal information');
            requirements.push('Must not contain personal information');
            break;
          }
        }
      }
    }

    return {
      passed: feedback.length === 0,
      feedback,
      requirements,
    };
  }

  /**
   * Validate unique characters
   */
  validateUniqueCharacters(password) {
    const feedback = [];
    const requirements = [];

    if (this.policy.requireUniqueCharacters > 0) {
      const uniqueChars = new Set(password.toLowerCase()).size;
      
      if (uniqueChars < this.policy.requireUniqueCharacters) {
        feedback.push(`Password must contain at least ${this.policy.requireUniqueCharacters} unique characters`);
        requirements.push(`At least ${this.policy.requireUniqueCharacters} unique characters`);
      }
    }

    return {
      passed: feedback.length === 0,
      feedback,
      requirements,
    };
  }

  /**
   * Calculate password strength
   */
  calculateStrength(password, score) {
    // Enhanced strength calculation based on multiple factors
    let strengthScore = score;
    
    // Bonus points for length
    if (password.length >= 12) strengthScore += 10;
    if (password.length >= 16) strengthScore += 10;
    
    // Bonus points for character variety
    const charTypes = [
      /[a-z]/.test(password), // lowercase
      /[A-Z]/.test(password), // uppercase
      /\d/.test(password),    // numbers
      /[^a-zA-Z0-9]/.test(password), // special chars
    ].filter(Boolean).length;
    
    strengthScore += charTypes * 5;
    
    // Bonus for entropy
    const entropy = this.calculateEntropy(password);
    if (entropy >= 60) strengthScore += 15;
    else if (entropy >= 40) strengthScore += 10;
    else if (entropy >= 25) strengthScore += 5;
    
    // Cap at 100
    strengthScore = Math.min(100, strengthScore);

    if (strengthScore >= 90) return 'very-strong';
    if (strengthScore >= 75) return 'strong';
    if (strengthScore >= 50) return 'good';
    if (strengthScore >= 25) return 'fair';
    return 'weak';
  }

  /**
   * Calculate password entropy
   */
  calculateEntropy(password) {
    let charset = 0;
    
    if (/[a-z]/.test(password)) charset += 26;
    if (/[A-Z]/.test(password)) charset += 26;
    if (/\d/.test(password)) charset += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charset += 32; // Approximation
    
    return password.length * Math.log2(charset);
  }

  /**
   * Estimate crack time (simplified)
   */
  estimateCrackTime(password) {
    const entropy = this.calculateEntropy(password);
    const guessesPerSecond = 1000000000; // 1 billion guesses per second
    const secondsToCrack = Math.pow(2, entropy) / (2 * guessesPerSecond);
    
    if (secondsToCrack < 1) return 'Instantly';
    if (secondsToCrack < 60) return 'Less than a minute';
    if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} minutes`;
    if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} hours`;
    if (secondsToCrack < 2592000) return `${Math.round(secondsToCrack / 86400)} days`;
    if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 2592000)} months`;
    if (secondsToCrack < 3153600000) return `${Math.round(secondsToCrack / 31536000)} years`;
    return 'Centuries';
  }

  /**
   * Generate password suggestions
   */
  generateSuggestions() {
    const suggestions = [
      'Use a mix of uppercase and lowercase letters',
      'Include numbers and special characters',
      'Make it at least 12 characters long',
      'Avoid common words and personal information',
      'Consider using a passphrase with random words',
      'Use a password manager to generate and store strong passwords',
    ];

    return suggestions;
  }

  /**
   * Update policy configuration
   */
  updatePolicy(newPolicy) {
    this.policy = { ...this.policy, ...newPolicy };
  }

  /**
   * Get current policy requirements as human-readable text
   */
  getPolicyRequirements() {
    const requirements = [];
    
    requirements.push(`Between ${this.policy.minLength} and ${this.policy.maxLength} characters`);
    
    if (this.policy.requireUppercase) {
      requirements.push('At least one uppercase letter');
    }
    
    if (this.policy.requireLowercase) {
      requirements.push('At least one lowercase letter');
    }
    
    if (this.policy.requireNumbers) {
      requirements.push('At least one number');
    }
    
    if (this.policy.requireSpecialChars) {
      requirements.push('At least one special character');
    }
    
    if (!this.policy.allowCommonPasswords) {
      requirements.push('Must not be a common password');
    }
    
    if (!this.policy.allowSequentialChars) {
      requirements.push('No sequential characters');
    }
    
    if (this.policy.requireUniqueCharacters > 0) {
      requirements.push(`At least ${this.policy.requireUniqueCharacters} unique characters`);
    }

    return requirements;
  }
}

/**
 * Utility functions
 */

/**
 * Create validator with Cognito-compatible policy
 */
export function createCognitoValidator(cognitoPolicy = {}) {
  const policy = {
    minLength: cognitoPolicy.MinimumLength || 8,
    maxLength: 128,
    requireUppercase: cognitoPolicy.RequireUppercase !== false,
    requireLowercase: cognitoPolicy.RequireLowercase !== false,
    requireNumbers: cognitoPolicy.RequireNumbers !== false,
    requireSpecialChars: cognitoPolicy.RequireSymbols !== false,
    ...cognitoPolicy,
  };
  
  return new PasswordValidator(policy);
}

/**
 * Validate password with default policy
 */
export function validatePassword(password, userInfo = {}, policy = {}) {
  const validator = new PasswordValidator(policy);
  return validator.validate(password, userInfo);
}

/**
 * Quick validation for real-time feedback
 */
export function quickValidatePassword(password, policy = {}) {
  const validator = new PasswordValidator(policy);
  return validator.quickValidate(password);
}

/**
 * Check if password meets minimum requirements
 */
export function meetsMinimumRequirements(password, policy = {}) {
  const result = validatePassword(password, {}, policy);
  return result.isValid;
}

/**
 * Get password strength
 */
export function getPasswordStrength(password) {
  const validator = new PasswordValidator();
  const result = validator.validate(password);
  return {
    strength: result.strength,
    score: result.score,
    estimatedCrackTime: result.estimatedCrackTime,
  };
}

// Export the main class and default policy
export { PasswordValidator, DEFAULT_POLICY };

// Export singleton validator with default policy
const defaultValidator = new PasswordValidator();
export default defaultValidator;