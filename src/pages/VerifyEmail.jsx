import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appwriteService } from '../lib/appwrite';
import { toast } from 'sonner';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const verifyEmail = async () => {
      // Extract userId and secret from the URL parameters
      const searchParams = new URLSearchParams(location.search);
      const userId = searchParams.get('userId');
      const secret = searchParams.get('secret');
      
      if (!userId || !secret) {
        setError('Invalid verification link. Please check your email and try again.');
        return;
      }
      
      try {
        setIsVerifying(true);
        
        // Call the Appwrite verification API
        await appwriteService.completeEmailVerification(userId, secret);
        
        setIsSuccess(true);
        toast.success('Email verified successfully!');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        console.error('Email verification error:', error);
        setError('Failed to verify email. The link may have expired.');
        toast.error('Email verification failed');
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyEmail();
  }, [location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h1>
        </div>
        
        <div className="mt-8 bg-white p-8 shadow rounded-lg">
          {isVerifying && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-lg">Verifying your email...</p>
            </div>
          )}
          
          {isSuccess && (
            <div className="text-center">
              <div className="w-16 h-16 text-green-500 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-green-700">Email Verified!</h2>
              <p className="mt-2 text-gray-600">
                Your email has been successfully verified. Redirecting to login...
              </p>
            </div>
          )}
          
          {error && (
            <div className="text-center">
              <div className="w-16 h-16 text-red-500 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-red-700">Verification Failed</h2>
              <p className="mt-2 text-gray-600">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;