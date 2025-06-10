import React from 'react';
import { Spinner } from './ui/spinner';

const LoadingScreen = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 