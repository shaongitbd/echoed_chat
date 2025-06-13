import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Loader2, ChevronLeft, Mail } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoading } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  
  // Handle email validation and move to next step
  const handleNextStep = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    
    // Basic email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setStep(2);
  };
  
  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!name) newErrors.name = 'Name is required';
    if (!password) newErrors.password = 'Password is required';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (password && password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      const result = await register(email, password, name);
      
      if (result.success) {
        toast.success('Registration successful! Welcome to Echoed.');
        navigate('/');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('already exists')) {
        setErrors({ email: 'An account with this email already exists' });
        toast.error('An account with this email already exists');
      } else {
        toast.error('An error occurred during registration');
      }
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            Create an Account
          </h1>
          <h2 className="mt-2 text-center text-base text-gray-600">
            {step === 1 ? 'Enter your email to get started' : 'Complete your account setup'}
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
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-gray-900 hover:text-gray-700">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: Account details */}
              <form onSubmit={handleRegister}>
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2.5 border ${
                      errors.name ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent sm:text-sm`}
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>
                
                <div className="mb-5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2.5 border ${
                      errors.password ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent sm:text-sm`}
                    placeholder="Create a password"
                    disabled={isLoading}
                    minLength={8}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
                
                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2.5 border ${
                      errors.confirmPassword ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent sm:text-sm`}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                    minLength={8}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
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
                      'Create account'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            By signing up, you agree to our{' '}
            <a href="#" className="underline">Terms of Service</a> and{' '}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 