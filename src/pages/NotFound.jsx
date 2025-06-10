import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-6xl font-bold">404</h1>
        <h2 className="mb-8 text-2xl font-semibold">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <button
            className="group relative flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-sm"
          >
            Go Home
          </button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 