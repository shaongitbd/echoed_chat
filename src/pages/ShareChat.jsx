import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appwriteService } from '../lib/appwrite';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import ChatInterface from '../components/Chat/ChatInterface';

const ShareChat = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [thread, setThread] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadThread = async () => {
      if (!threadId) {
        setError('Invalid thread ID');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Get thread details
        const threadData = await appwriteService.getChatThread(threadId);
        
        if (!threadData) {
          setError('Thread not found');
          return;
        }
        
        // Check if the thread is shared
        if (!threadData.isShared && (!user || !threadData.participants.includes(user.$id))) {
          setError('You do not have access to this thread');
          return;
        }
        
        setThread(threadData);
        
        // If the user is authenticated, try to add them as a participant
        if (user && !threadData.participants.includes(user.$id)) {
          await appwriteService.updateChatThread(threadId, {
            participants: [...threadData.participants, user.$id]
          });
        }
      } catch (error) {
        console.error('Error loading shared thread:', error);
        setError('Error loading shared thread. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThread();
  }, [threadId, user]);
  
  const handleLogin = () => {
    navigate('/login', { state: { from: `/share/${threadId}` } });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg">Loading shared chat...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          
          {!user && (
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Sign in to access
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      {thread && (
        <>
          <div className="bg-black text-white p-4">
            <div className="container mx-auto">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">AI Chat UI - Shared Thread</h1>
                {!user && (
                  <button
                    onClick={handleLogin}
                    className="px-3 py-1 bg-white text-black rounded-md text-sm"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ChatInterface threadId={threadId} isSharedView={true} />
          </div>
        </>
      )}
    </div>
  );
};

export default ShareChat; 