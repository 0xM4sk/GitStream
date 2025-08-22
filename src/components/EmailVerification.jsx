import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, CheckCircle, AlertCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import authService from '../services/authService';

const EmailVerification = ({ email: propEmail, onSuccess, onResend }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationStep, setVerificationStep] = useState('verify'); // 'verify' | 'success'
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm();

  // Initialize email from props, URL params, or localStorage
  useEffect(() => {
    const emailFromProps = propEmail;
    const emailFromParams = searchParams.get('email');
    const emailFromStorage = localStorage.getItem('verification_email');
    
    const userEmail = emailFromProps || emailFromParams || emailFromStorage;
    
    if (userEmail) {
      setEmail(userEmail);
      setValue('email', userEmail);
    }
  }, [propEmail, searchParams, setValue]);

  // Handle resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-fill verification code from URL if present
  useEffect(() => {
    const codeFromParams = searchParams.get('code') || searchParams.get('confirmation_code');
    if (codeFromParams) {
      setValue('verificationCode', codeFromParams);
      // Auto-submit if both email and code are available
      if (email) {
        handleSubmit(onSubmit)();
      }
    }
  }, [searchParams, email, setValue, handleSubmit]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const emailToUse = data.email || email;
      
      if (!emailToUse) {
        throw new Error('Email address is required');
      }

      const result = await authService.confirmEmailVerification(
        emailToUse,
        data.verificationCode
      );

      // Store success state
      setVerificationStep('success');
      setSuccess('Email verified successfully! You can now sign in to your account.');
      
      // Clear stored email
      localStorage.removeItem('verification_email');
      
      if (onSuccess) {
        onSuccess(result);
      } else {
        // Auto-redirect to login after a delay
        setTimeout(() => {
          navigate('/auth/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setError(error.message || 'Failed to verify email. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      const emailToUse = email;
      
      if (!emailToUse) {
        throw new Error('Email address is required');
      }

      const result = await authService.resendEmailVerification(emailToUse);
      setSuccess(`Verification code sent to ${result.destination}`);
      setResendCooldown(60); // 60 second cooldown
      
      if (onResend) {
        onResend(result);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setError(error.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    localStorage.setItem('verification_email', newEmail);
  };

  // Success step
  if (verificationStep === 'success') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h2>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now access all features of your account.
            </p>
            <div className="space-y-3">
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Continue to Sign In
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verification step
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
          <div className="text-center">
            <Mail className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-gray-600 mt-2">
              We've sent a verification code to your email address. Please enter the code below to verify your account.
            </p>
          </div>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                value={email}
                onChange={handleEmailChange}
                className={`block w-full pl-10 py-3 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                placeholder="Enter your email address"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              id="verificationCode"
              type="text"
              className={`block w-full py-3 px-4 border ${
                errors.verificationCode ? 'border-red-300' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg tracking-widest`}
              placeholder="000000"
              maxLength={6}
              {...register('verificationCode', {
                required: 'Verification code is required',
                pattern: {
                  value: /^\d{6}$/,
                  message: 'Please enter a valid 6-digit code',
                },
              })}
            />
            {errors.verificationCode && (
              <p className="text-red-600 text-sm mt-1">{errors.verificationCode.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-3">
            Didn't receive the code? Check your spam folder or{' '}
          </p>
          <button
            onClick={handleResendCode}
            disabled={isResending || resendCooldown > 0}
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isResending ? 'animate-spin' : ''}`} />
            {isResending
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend Code'
            }
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Having trouble?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Check your spam/junk email folder</li>
            <li>• Make sure you entered the correct email address</li>
            <li>• The verification code expires in 15 minutes</li>
            <li>• Contact support if you continue having issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;