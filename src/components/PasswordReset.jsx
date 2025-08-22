import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import authService from '../services/authService';

const PasswordReset = () => {
  const navigate = useNavigate();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'confirm' | 'success'
  const [resetEmail, setResetEmail] = useState('');

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors },
  } = useForm();

  const {
    register: registerConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: confirmErrors },
    watch,
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmitRequest = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.initiatePasswordReset(data.email);
      setResetEmail(data.email);
      setResetStep('confirm');
      setSuccess(result.message);
    } catch (error) {
      console.error('Password reset request error:', error);
      setError(error.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitConfirm = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await authService.confirmPasswordReset(
        resetEmail,
        data.verificationCode,
        data.newPassword
      );
      
      setResetStep('success');
      setSuccess('Password reset successfully! You can now sign in with your new password.');
      
      // Automatically redirect to login after a delay
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.initiatePasswordReset(resetEmail);
      setSuccess(result.message);
    } catch (error) {
      console.error('Resend reset code error:', error);
      setError(error.message || 'Failed to resend reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, text: '', color: '' };
    
    let score = 0;
    let feedback = [];

    if (password.length >= 12) score++;
    else feedback.push('at least 12 characters');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('lowercase letter');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('uppercase letter');

    if (/\d/.test(password)) score++;
    else feedback.push('number');

    if (/[@$!%*?&]/.test(password)) score++;
    else feedback.push('special character');

    const strength = {
      0: { text: 'Very Weak', color: 'text-red-600' },
      1: { text: 'Weak', color: 'text-red-500' },
      2: { text: 'Fair', color: 'text-yellow-500' },
      3: { text: 'Good', color: 'text-yellow-400' },
      4: { text: 'Strong', color: 'text-green-500' },
      5: { text: 'Very Strong', color: 'text-green-600' },
    };

    return {
      score,
      text: strength[score].text,
      color: strength[score].color,
      feedback,
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Success step
  if (resetStep === 'success') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Reset Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your password has been successfully reset. You will be redirected to the sign-in page shortly.
            </p>
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Continue to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Confirm step (enter code and new password)
  if (resetStep === 'confirm') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-8">
            <Link
              to="#"
              onClick={() => setResetStep('request')}
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to email entry
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Reset Your Password</h2>
            <p className="text-gray-600 mt-2">
              Enter the verification code sent to{' '}
              <span className="font-medium text-primary-600">{resetEmail}</span>{' '}
              and your new password.
            </p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmitConfirm(onSubmitConfirm)} className="space-y-6">
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                className={`block w-full py-3 px-4 border ${
                  confirmErrors.verificationCode ? 'border-red-300' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg tracking-widest`}
                placeholder="000000"
                maxLength={6}
                {...registerConfirm('verificationCode', {
                  required: 'Verification code is required',
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Please enter a valid 6-digit code',
                  },
                })}
              />
              {confirmErrors.verificationCode && (
                <p className="text-red-600 text-sm mt-1">{confirmErrors.verificationCode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  className={`block w-full pl-10 pr-12 py-3 border ${
                    confirmErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter your new password"
                  {...registerConfirm('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 12,
                      message: 'Password must be at least 12 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                      message: 'Password must contain uppercase, lowercase, number, and special character',
                    },
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-2 w-6 rounded ${
                            i <= passwordStrength.score
                              ? passwordStrength.score <= 2
                                ? 'bg-red-400'
                                : passwordStrength.score <= 3
                                ? 'bg-yellow-400'
                                : 'bg-green-400'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-sm font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Missing: {passwordStrength.feedback.join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {confirmErrors.newPassword && (
                <p className="text-red-600 text-sm mt-1">{confirmErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`block w-full pl-10 pr-12 py-3 border ${
                    confirmErrors.confirmNewPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Confirm your new password"
                  {...registerConfirm('confirmNewPassword', {
                    required: 'Please confirm your new password',
                    validate: (value) =>
                      value === newPassword || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {confirmErrors.confirmNewPassword && (
                <p className="text-red-600 text-sm mt-1">{confirmErrors.confirmNewPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Didn't receive the code?{' '}
              <button
                onClick={handleResendCode}
                disabled={isLoading}
                className="font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50"
              >
                Resend
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Request step (enter email)
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="mb-8">
          <Link
            to="/auth/login"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
          <p className="text-gray-600 mt-2">
            No worries! Enter your email address and we'll send you a reset code.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`block w-full pl-10 py-3 border ${
                  requestErrors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                placeholder="Enter your email address"
                {...registerRequest('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
            </div>
            {requestErrors.email && (
              <p className="text-red-600 text-sm mt-1">{requestErrors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Sending Reset Code...
              </>
            ) : (
              'Send Reset Code'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-600">
            Remember your password?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;