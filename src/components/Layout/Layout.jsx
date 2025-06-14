import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import MobileMenuButton from './MobileMenuButton';
import Sidebar from '../Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out w-64 lg:w-72 lg:flex-shrink-0`}>
        <Sidebar onCloseMobileMenu={() => setSidebarOpen(false)} />
      </div>
      
      {/* Backdrop - only visible on mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden w-full h-full">
        {/* Mobile menu button - only visible on mobile */}
        <div className="lg:hidden p-2">
          <MobileMenuButton onClick={toggleSidebar} isOpen={sidebarOpen} />
        </div>
        
        {/* Content area */}
        <main className="flex-1 overflow-auto h-full flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 