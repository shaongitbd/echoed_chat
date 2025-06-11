import React, { useState, useEffect } from 'react';
import { X, Copy, Globe, Users, Mail, Check, AlertTriangle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { appwriteService } from '../lib/appwrite';

const ShareModal = ({ isOpen, onClose, threadId, currentUser }) => {
  const [shareType, setShareType] = useState('private'); // 'private', 'public', 'specific'
  const [email, setEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [publicLink, setPublicLink] = useState('');
  
  // Fetch existing shared users when modal opens
  useEffect(() => {
    if (isOpen && threadId) {
      fetchSharedUsers();
    }
  }, [isOpen, threadId]);
  
  const fetchSharedUsers = async () => {
    setIsLoading(true);
    try {
      // Get the thread to check if it's public
      const thread = await appwriteService.getChatThread(threadId);
      
      // Check if thread is public
      if (thread.$permissions && thread.$permissions.includes('read("any")')) {
        setShareType('public');
        const baseUrl = window.location.origin;
        setPublicLink(`${baseUrl}/shared/${threadId}`);
      }
      
      // Get users with access
      const users = await appwriteService.getSharedUsers(threadId);
      setSharedUsers(users);
    } catch (error) {
      console.error('Error fetching shared users:', error);
      toast.error('Failed to load sharing information');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSharePublic = async () => {
    setIsLoading(true);
    try {
      await appwriteService.shareThreadPublic(threadId);
      setShareType('public');
      
      // Generate public link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared/${threadId}`;
      setPublicLink(link);
      
      toast.success('Thread is now publicly accessible');
    } catch (error) {
      console.error('Error sharing thread publicly:', error);
      toast.error('Failed to share thread publicly');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSharePrivate = async () => {
    setIsLoading(true);
    try {
      await appwriteService.makeThreadPrivate(threadId);
      setShareType('private');
      setPublicLink('');
      
      toast.success('Thread is now private');
    } catch (error) {
      console.error('Error making thread private:', error);
      toast.error('Failed to update thread privacy');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleShareWithUser = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    try {
      await appwriteService.shareThreadWithUser(threadId, email);
      
      // Refresh the shared users list
      fetchSharedUsers();
      
      setEmail('');
      toast.success(`Thread shared with ${email}`);
    } catch (error) {
      console.error('Error sharing thread with user:', error);
      
      if (error.message === 'User not found') {
        toast.error(`No user found with email ${email}`);
      } else {
        toast.error('Failed to share thread');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveAccess = async (userId) => {
    setIsLoading(true);
    try {
      await appwriteService.removeThreadAccess(threadId, userId);
      
      // Update the UI by removing the user from the list
      setSharedUsers(sharedUsers.filter(user => user.userId !== userId));
      
      toast.success('Access removed successfully');
    } catch (error) {
      console.error('Error removing access:', error);
      toast.error('Failed to remove access');
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-5 py-4">
          <h3 className="text-lg font-medium text-gray-900">Share Chat</h3>
          <button 
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5">
          {/* Sharing Options */}
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={handleSharePrivate}
              className={`py-2 px-4 rounded-md flex items-center text-sm ${
                shareType === 'private' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users size={16} className="mr-2" />
              Private
            </button>
            <button
              onClick={handleSharePublic}
              className={`py-2 px-4 rounded-md flex items-center text-sm ${
                shareType === 'public' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Globe size={16} className="mr-2" />
              Public
            </button>
          </div>
          
          {/* Public Sharing Section */}
          {shareType === 'public' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Public Link
              </label>
              <div className="flex">
                <input 
                  type="text" 
                  readOnly
                  value={publicLink}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button 
                  onClick={() => copyToClipboard(publicLink)}
                  className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-md px-3 hover:bg-gray-200"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Anyone with this link can view this chat.
              </p>
            </div>
          )}
          
          {/* Share with specific users section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share with people
            </label>
            <form onSubmit={handleShareWithUser} className="flex mb-2">
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md"
              />
              <button 
                type="submit"
                disabled={isLoading || !email.trim()}
                className="bg-gray-900 text-white px-4 rounded-r-md hover:bg-gray-800 disabled:opacity-50"
              >
                <UserPlus size={16} />
              </button>
            </form>
            <p className="text-sm text-gray-500">
              Only people with access can view this chat.
            </p>
          </div>
          
          {/* Shared users list */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              People with access
            </h4>
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Loading...</p>
              </div>
            ) : sharedUsers.length > 0 ? (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {sharedUsers.map((user) => (
                  <li key={user.userId} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-2">
                        {user.name ? user.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    {/* Don't show remove button for thread owner */}
                    {user.userId !== currentUser.$id && (
                      <button 
                        onClick={() => handleRemoveAccess(user.userId)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Remove access"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-4 text-sm text-gray-500">
                No users have been shared with yet.
              </p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-4 flex justify-end">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 