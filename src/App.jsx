import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Context providers
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThreadProvider } from './contexts/ThreadContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import SharedChat from './pages/SharedChat';
import ResetPassword from './pages/ResetPassword';
import ModelSelection from './pages/ModelSelection';
import NotFound from './pages/NotFound';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import GuestRoute from './components/Auth/GuestRoute';

// API middleware
import { setupApiMiddleware, removeApiMiddleware } from './api/middleware';

const App = () => {
  // Initialize API middleware
  useEffect(() => {
    setupApiMiddleware();
    
    // Clean up middleware on unmount
    return () => {
      removeApiMiddleware();
    };
  }, []);
  
  return (
    <Router>
      <AuthProvider>
        <ThreadProvider>
          <SettingsProvider>
            <ChatProvider>
              <Routes>
                {/* Home route - now using Layout */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                </Route>

                {/* Auth routes */}
                <Route element={<GuestRoute><Layout /></GuestRoute>}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>
                
                <Route path="/reset-password" element={<Layout />}>
                  <Route index element={<ResetPassword />} />
                </Route>
                
                {/* Model selection after signup */}
                <Route path="/model-selection" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<ModelSelection />} />
                </Route>
                
                {/* Settings standalone route */}
                <Route path="/settings" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Settings />} />
                </Route>
                
                {/* App routes */}
                <Route path="/chat" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Chat />} />
                  <Route path=":threadId" element={<Chat />} />
                </Route>
                
                {/* Shared Chat route - accessible to everyone */}
                <Route path="/shared/:threadId" element={<SharedChat />} />
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* Toast notifications */}
              <Toaster position="top-right" richColors />
            </ChatProvider>
          </SettingsProvider>
        </ThreadProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 