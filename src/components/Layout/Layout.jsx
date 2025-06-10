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
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar />
      </div>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
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