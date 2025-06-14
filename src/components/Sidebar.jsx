import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, User, LogIn, Sparkles, Trash2, Check, X as XIcon, Settings, LogOut, Home, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { toast } from 'sonner';

const Sidebar = ({ onCloseMobileMenu }) => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout, refreshAuth } = useAuth();
  const { threads, loadThreads, deleteChatThread, createChatThread } = useChat();
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Sidebar - Current user:', user);
    if (user) {
      loadThreads();
    }
  }, [user, loadThreads]);

  const handleLoginClick = () => {
    if (user) {
      console.log('Navigating to settings');
      navigate('/settings');
      if (onCloseMobileMenu) onCloseMobileMenu();
    } else {
      console.log('Navigating to login');
      navigate('/login');
      if (onCloseMobileMenu) onCloseMobileMenu();
    }
  };

  const handleLogoutClick = async (e) => {
    e.preventDefault(); // Prevent default action
    e.stopPropagation(); // Stop event propagation
    
    console.log('Logging out');
    try {
      await logout();
      console.log('Logout successful, navigating to login');
      navigate('/login');
      if (onCloseMobileMenu) onCloseMobileMenu();
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    }
  };

  const handleRefreshAuth = async (e) => {
    e.preventDefault(); // Prevent default action
    e.stopPropagation(); // Stop event propagation
    
    console.log('Refreshing auth');
    await refreshAuth();
    toast.success('Auth state refreshed');
  };

  const handleNewChat = (e) => {
    e.preventDefault(); // Prevent default action
    e.stopPropagation(); // Stop event propagation
    
    console.log('New chat clicked, navigating to home');
    
    if (user) {
      navigate('/');
      if (onCloseMobileMenu) onCloseMobileMenu();
    } else {
      console.log('No user found, navigating to login');
      navigate('/login');
      if (onCloseMobileMenu) onCloseMobileMenu();
    }
  };

  const handleDeleteThread = async (threadId) => {
    try {
      setIsLoading(true);
      await deleteChatThread(threadId);
      setDeleteConfirmation(null);
      toast.success('Chat deleted successfully');
      
      // Redirect to home after deleting thread
      navigate('/');
      if (onCloseMobileMenu) onCloseMobileMenu();
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThreadClick = (threadId) => {
    navigate(`/chat/${threadId}`);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleDebugUser = () => {
    console.log('Current user state:', user);
    console.log('Auth loading state:', authLoading);
    
    if (user) {
      console.log('User ID:', user.$id);
      console.log('User email:', user.email);
      console.log('User name:', user.name);
    } else {
      console.log('No user object found');
    }
    
    toast.info('User state logged to console');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Today
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Within the last 7 days
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    if (date > oneWeekAgo) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    
    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <aside
      className="h-full flex flex-col bg-gray-900 border-r border-gray-700 shadow-md w-full"
    >
      {/* Logo and header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Sparkles size={16} className="text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Echoed.Chat</h1>
        </div>
        
        {/* New chat button */}
        <button
          onClick={handleNewChat}
          className="w-full  flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Navigation links */}
      <div className="p-3 border-b border-gray-700">
        <button
          onClick={() => {
            navigate('/');
            if (onCloseMobileMenu) onCloseMobileMenu();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Home size={16} />
          Home
        </button>
        
        <button
          onClick={handleLoginClick}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors mt-1"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {user ? 'YOUR CHATS' : 'RECENT CHATS'}
          </h2>
        </div>
        
        {user && threads.length === 0 && !isLoading && (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 mx-auto bg-gray-700 rounded-full flex items-center justify-center mb-3">
              <MessageSquare size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-400 mb-2">No chats yet</p>
            <button 
              onClick={handleNewChat}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Start a new chat
            </button>
          </div>
        )}
        
        {user && isLoading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-12 bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-700 rounded-lg"></div>
          </div>
        )}
        
        {threads.length > 0 && (
          <div className="space-y-1">
            {threads.map(thread => (
              <div key={thread.$id} className="relative group">
                <button
                  onClick={() => handleThreadClick(thread.$id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-700 transition-colors flex items-start gap-2"
                >
                  <MessageSquare size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">
                      {thread.title || 'Untitled Chat'}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {formatDate(thread.$updatedAt)}
                    </div>
                  </div>
                </button>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmation(thread.$id);
                  }}
                  className="absolute right-2 top-2 p-1 rounded hover:bg-gray-600 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
                
                {/* Delete confirmation */}
                {deleteConfirmation === thread.$id && (
                  <div className="absolute top-0 left-0 w-full h-full bg-gray-800 bg-opacity-90 rounded-lg flex items-center justify-center z-10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteThread(thread.$id);
                        }}
                        disabled={isLoading}
                        className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmation(null);
                        }}
                        className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* User section */}
      <div className="p-3 border-t border-gray-700">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200 truncate flex items-center">
                  {user.name || user.email}
                  {(!user.email || (user.$createdAt && new Date(user.$createdAt).getTime() === new Date(user.$updatedAt).getTime())) && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded text-xs">Guest</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {user.email || 'Guest Account'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              navigate('/login');
              if (onCloseMobileMenu) onCloseMobileMenu();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <LogIn size={16} />
            Sign In
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar; 