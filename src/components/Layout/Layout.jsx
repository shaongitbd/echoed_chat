import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileMenuButton from './MobileMenuButton';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - hidden on mobile unless toggled */}
    
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile menu button - only visible on mobile */}
        <div className="lg:hidden">
          <MobileMenuButton onClick={toggleSidebar} isOpen={sidebarOpen} />
        </div>
        
        {/* Content area */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 