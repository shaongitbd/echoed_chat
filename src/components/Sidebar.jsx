import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, User, LogIn, Sparkles, Trash2, Check, X as XIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { toast } from 'sonner';

const Sidebar = ({ showMobileMenu = false, onCloseMobileMenu }) => {
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
    } else {
      console.log('Navigating to login');
      navigate('/login');
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
    } else {
      console.log('No user found, navigating to login');
      navigate('/login');
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
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    } finally {
      setIsLoading(false);
    }
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
      className={`${
        showMobileMenu ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out z-40 shadow-[5px_0_30px_-15px_rgba(0,0,0,0.2)]`}
    >
      <div className="flex flex-col h-full">
        {/* Logo area */}
        <div className="px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white select-none">AI Chat</span>
          </div>
        </div>

        {/* New chat button */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200 shadow-sm"
            type="button"
          >
            <Plus size={14} className="text-gray-700" />
            New Chat
          </button>
          
        
        </div>

        {/* Chat history */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="text-[11px] font-semibold text-gray-400 mb-3 tracking-wider uppercase">
            {user ? 'Your Chats' : 'Recent Chats'}
          </div>
          
          {user && threads.length === 0 && !isLoading && (
            <div className="text-center py-6">
              <p className="text-xs text-gray-400">No chats yet</p>
              <button 
                onClick={handleNewChat}
                className="mt-2 text-xs text-white hover:underline"
              >
                Start a new chat
              </button>
            </div>
          )}
          
          {user && isLoading && (
            <div className="space-y-2 px-1 animate-pulse">
              <div className="h-10 bg-gray-800 rounded-md"></div>
              <div className="h-10 bg-gray-800 rounded-md"></div>
              <div className="h-10 bg-gray-800 rounded-md"></div>
            </div>
          )}
          
          <ul className="space-y-1.5">
            {user ? (
              threads.map(thread => (
                <li 
                  key={thread.$id}
                  className="relative group"
                >
                  <div 
                    onClick={() => navigate(`/chat/${thread.$id}`)}
                    className="px-3 py-2 rounded-md hover:bg-gray-800 text-xs cursor-pointer transition-all duration-200 flex items-center gap-2"
                  >
                    <MessageSquare size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate text-gray-300">{thread.title || 'Untitled chat'}</span>
                    
                    {thread.$updatedAt && (
                      <span className="text-[10px] text-gray-500 ml-auto whitespace-nowrap">
                        {formatDate(thread.$updatedAt)}
                      </span>
                    )}
                  </div>
                  
                  {/* Delete button (visible on hover) */}
                  {deleteConfirmation !== thread.$id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmation(thread.$id);
                      }}
                      className="absolute right-2 top-2 p-1 rounded-md bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity duration-200"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  
                  {/* Delete confirmation */}
                  {deleteConfirmation === thread.$id && (
                    <div className="absolute inset-0 bg-gray-800 rounded-md flex items-center justify-between px-2">
                      <span className="text-[10px] text-gray-300">Delete chat?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteThread(thread.$id);
                          }}
                          disabled={isLoading}
                          className="p-1 rounded-md hover:bg-gray-700 text-green-400"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation(null);
                          }}
                          className="p-1 rounded-md hover:bg-gray-700 text-red-400"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))
            ) : (
              <>
                <li className="px-3 py-2 rounded-md bg-gray-800 text-xs cursor-pointer hover:bg-gray-700 transition-all duration-200 flex items-center gap-2 group shadow-sm">
                  <MessageSquare size={13} className="text-gray-300" />
                  <span className="truncate font-medium text-white">Welcome to AI Chat Interface</span>
                </li>
                <li className="px-3 py-2 rounded-md hover:bg-gray-800 text-xs cursor-pointer transition-all duration-200 flex items-center gap-2 group">
                  <MessageSquare size={13} className="text-gray-400" />
                  <span className="truncate text-gray-300">How to use advanced features</span>
                </li>
                <li className="px-3 py-2 rounded-md hover:bg-gray-800 text-xs cursor-pointer transition-all duration-200 flex items-center gap-2 group">
                  <MessageSquare size={13} className="text-gray-400" />
                  <span className="truncate text-gray-300">Image generation examples</span>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-800 bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shadow-inner">
                <User size={15} className="text-gray-300" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">
                  {user ? (user.name || user.email) : 'Guest User'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {user ? 'Signed in' : 'Sign in to save chats'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {user && (
                <button
                  onClick={handleLogoutClick}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 shadow-sm hover:shadow transition-all duration-200"
                  title="Sign out"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-200">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              )}
              <button
                onClick={handleLoginClick}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 shadow-sm hover:shadow transition-all duration-200"
                title={user ? "Settings" : "Sign in"}
                type="button"
              >
                {user ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-200">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <LogIn size={15} className="text-gray-200" />
                )}
              </button>
              {/* Debug refresh button */}
              <button
                onClick={handleRefreshAuth}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 shadow-sm hover:shadow transition-all duration-200"
                title="Refresh Auth"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-200">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 