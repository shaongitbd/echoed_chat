import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appwriteService } from '../lib/appwrite';
import { toast } from 'sonner';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request', 'reset', 'success'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    // Check if we have userId and secret in the URL parameters
    const searchParams = new URLSearchParams(location.search);
    const userIdParam = searchParams.get('userId');
    const secretParam = searchParams.get('secret');
    
    if (userIdParam && secretParam) {
      setUserId(userIdParam);
      setSecret(secretParam);
      setStep('reset');
    }
  }, [location]);
  
  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Send password recovery email
      await appwriteService.sendPasswordRecovery(email);
      
      toast.success('Password reset link sent to your email');
      setStep('check-email');
    } catch (error) {
      console.error('Password recovery error:', error);
      toast.error('Failed to send password reset link');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    const newErrors = {};
    if (!password) newErrors.password = 'Password is required';
    if (password && password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Complete password recovery
      await appwriteService.completePasswordRecovery(userId, secret, password, confirmPassword);
      
      toast.success('Password reset successfully');
      setStep('success');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h1>
          {step === 'request' && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email and we'll send you a link to reset your password
            </p>
          )}
        </div>
        
        {step === 'request' && (
          <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm`}
                placeholder="Email address"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
        
        {step === 'check-email' && (
          <div className="mt-8 bg-white p-8 shadow rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 text-green-500 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-800">Check Your Email</h2>
              <p className="mt-2 text-gray-600">
                We've sent a password reset link to {email}. Please check your inbox.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
        
        {step === 'reset' && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="password" className="sr-only">New Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm`}
                placeholder="New password"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm`}
                placeholder="Confirm new password"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
            
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
        
        {step === 'success' && (
          <div className="mt-8 bg-white p-8 shadow rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 text-green-500 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-green-700">Password Reset!</h2>
              <p className="mt-2 text-gray-600">
                Your password has been successfully reset. Redirecting to login...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword; 