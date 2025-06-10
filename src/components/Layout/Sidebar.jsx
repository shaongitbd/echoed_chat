import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Settings, LogOut, Trash, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { threads, createChatThread, deleteChatThread, isLoading } = useChat();
  const [showDropdown, setShowDropdown] = useState(null);
  
  // Handle creating a new chat
  const handleNewChat = async () => {
    try {
      const newThread = await createChatThread('New Chat');
      if (newThread) {
        navigate(`/chat/${newThread.$id}`);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };
  
  // Handle deleting a chat
  const handleDeleteChat = async (e, threadId) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await deleteChatThread(threadId);
      setShowDropdown(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  // Toggle thread dropdown menu
  const toggleDropdown = (e, threadId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setShowDropdown(current => current === threadId ? null : threadId);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">AI Chat UI</h1>
        {user && (
          <div className="mt-1 text-sm text-gray-500">
            {user.name || user.email}
          </div>
        )}
      </div>
      
      {/* New chat button */}
      <div className="p-4">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 p-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>
      
      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
          Recent Chats
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No chats yet. Create one to get started.
          </div>
        ) : (
          <ul className="space-y-1">
            {threads.map(thread => (
              <li key={thread.$id} className="relative">
                <Link
                  to={`/chat/${thread.$id}`}
                  className="block p-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="truncate flex-1 pr-6">
                      {thread.title}
                    </div>
                    <button
                      onClick={(e) => toggleDropdown(e, thread.$id)}
                      className="absolute right-2 top-2 p-1 rounded-full hover:bg-gray-200"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {thread.$updatedAt ? format(new Date(thread.$updatedAt), 'MMM d, h:mm a') : ''}
                  </div>
                </Link>
                
                {/* Dropdown menu */}
                {showDropdown === thread.$id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={(e) => handleDeleteChat(e, thread.$id)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Trash size={14} className="mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-auto p-4 border-t">
        <div className="flex justify-between">
          <Link
            to="/settings"
            className="flex items-center p-2 text-gray-600 rounded-md hover:bg-gray-100"
          >
            <Settings size={18} className="mr-2" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center p-2 text-gray-600 rounded-md hover:bg-gray-100"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 