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
import ShareChat from './pages/ShareChat';
import VerifyEmail from './pages/VerifyEmail';
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
                {/* Home route */}
                <Route path="/" element={<Home />} />

                {/* Auth routes */}
                <Route
                  path="/login"
                  element={
                    <GuestRoute>
                      <Login />
                    </GuestRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <GuestRoute>
                      <Register />
                    </GuestRoute>
                  }
                />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Model selection after signup */}
                <Route
                  path="/model-selection"
                  element={
                    <ProtectedRoute>
                      <ModelSelection />
                    </ProtectedRoute>
                  }
                />
                
                {/* Settings standalone route */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                
                {/* App routes */}
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Chat />} />
                  <Route path=":threadId" element={<Chat />} />
                  <Route path="share/:threadId" element={<ShareChat />} />
                </Route>
                
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