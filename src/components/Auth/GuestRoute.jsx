import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const GuestRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Redirect to home if authenticated
  if (user) {
    return <Navigate to={from} replace />;
  }
  
  // Render children if not authenticated
  return children;
};

export default GuestRoute; 