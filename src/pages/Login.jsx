import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowRight, Github, Loader2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const { login, loginWithOAuth, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  
  // Get provider from URL query params
  const searchParams = new URLSearchParams(location.search);
  const provider = searchParams.get('provider');
  
  // If provider is specified, trigger OAuth login
  React.useEffect(() => {
    if (provider) {
      handleOAuthLogin(provider);
    }
  }, [provider]);
  
  // Handle email validation and move to next step
  const handleNextStep = (e) => {
    e.preventDefault();
    
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    
    setErrors({});
    setStep(2);
  };
  
  // Handle email/password login
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        toast.error('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    }
  };
  
  // Handle OAuth login
  const handleOAuthLogin = async (provider) => {
    try {
      await loginWithOAuth(provider);
      // Note: The OAuth flow will redirect the user, so we don't need to navigate here
    } catch (error) {
      console.error(`${provider} login error:`, error);
      toast.error(`An error occurred during ${provider} login`);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            Welcome to AI Chat
          </h1>
          <h2 className="mt-2 text-center text-base text-gray-600">
            {step === 1 ? 'Sign in to your account' : 'Enter your password'}
          </h2>
        </div>
        
        <div className="px-8 pb-8">
          {step === 1 ? (
            <>
              {/* Step 1: Email input */}
              <form onSubmit={handleNextStep}>
                <div className="mb-5">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2.5 border ${
                      errors.email ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent sm:text-sm`}
                    placeholder="name@example.com"
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <button
                    type="submit"
                    className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin('github')}
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    disabled={isLoading}
                  >
                    <Github className="h-5 w-5 text-gray-900" />
                    <span className="ml-2">GitHub</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin('google')}
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                      <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                      <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                      <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
                    </svg>
                    <span className="ml-2">Google</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: Password input */}
              <form onSubmit={handleLogin}>
                <div className="mb-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </button>
                </div>
                
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-gray-100 rounded-full p-2">
                    <Mail className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-gray-700">{email}</p>
                </div>
                
                <div className="mb-5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2.5 border ${
                      errors.password ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent sm:text-sm`}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm">
                    <Link
                      to="/reset-password"
                      className="font-medium text-gray-700 hover:text-gray-900"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-gray-900 hover:text-gray-700"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 