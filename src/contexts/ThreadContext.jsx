import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { appwriteService, databases } from '../lib/appwrite';
import { useAuth } from './AuthContext';

// Create context
const ThreadContext = createContext();

// Provider component
export const ThreadProvider = ({ children }) => {
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Load threads when user changes
  useEffect(() => {
    if (user) {
      loadThreads();
    } else {
      setThreads([]);
      setCurrentThread(null);
    }
  }, [user]);
  
  // Load all threads for the current user
  const loadThreads = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const response = await appwriteService.getUserChatThreads(user.$id);
      setThreads(response.documents);
      return response.documents;
    } catch (error) {
      console.error('Error loading threads:', error);
      toast.error('Failed to load conversations');
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get a single thread by ID
  const getThread = async (threadId) => {
    if (!user) return null;
    
    setIsLoading(true);
    
    try {
      const thread = await appwriteService.getChatThread(threadId);
      const messagesResponse = await appwriteService.getMessages(threadId);
      thread.messages = messagesResponse.documents;
      setCurrentThread(thread);
      return thread;
    } catch (error) {
      console.error('Error getting thread:', error);
      toast.error('Failed to load conversation');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new thread
  const createThread = async (title = 'New Chat') => {
    if (!user) return null;
    
    setIsLoading(true);
    
    try {
      const newThread = await appwriteService.createChatThread(user.$id, title);
      
      // Update local state
      setThreads(prevThreads => [newThread, ...prevThreads]);
      setCurrentThread(newThread);
      
      // Navigate to the new thread
      navigate(`/chat/${newThread.$id}`);
      
      return newThread;
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to create new chat');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a thread
  const deleteThread = async (threadId) => {
    if (!user) return false;
    
    setIsLoading(true);
    
    try {
      await appwriteService.deleteChatThread(threadId);
      
      // Update local state
      setThreads(prevThreads => prevThreads.filter(thread => thread.$id !== threadId));
      
      // If the current thread is deleted, clear it
      if (currentThread && currentThread.$id === threadId) {
        setCurrentThread(null);
      }
      
      toast.success('Chat deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error('Failed to delete chat');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a message to a thread
  const addMessage = async (threadId, role, content) => {
    if (!user) return null;
    
    try {
      // Convert old role format to sender format expected by the new API
      const sender = role === 'user' ? user.$id : 'assistant';
      const message = await appwriteService.createMessage(threadId, sender, content);
      
      // Update current thread if it's the active one
      if (currentThread && currentThread.$id === threadId) {
        setCurrentThread(prevThread => ({
          ...prevThread,
          messages: [...(prevThread.messages || []), message]
        }));
      }
      
      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      toast.error('Failed to send message');
      return null;
    }
  };
  
  // Update thread title
  const updateThreadTitle = async (threadId, title) => {
    if (!user) return false;
    
    setIsLoading(true);
    
    try {
      await appwriteService.updateChatThread(threadId, { title });
      
      // Update local state
      setThreads(prevThreads => 
        prevThreads.map(thread => 
          thread.$id === threadId ? { ...thread, title } : thread
        )
      );
      
      // Update current thread if it's the active one
      if (currentThread && currentThread.$id === threadId) {
        setCurrentThread(prevThread => ({
          ...prevThread,
          title
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating thread title:', error);
      toast.error('Failed to update chat title');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Context value
  const value = {
    threads,
    currentThread,
    isLoading,
    loadThreads,
    getThread,
    createThread,
    deleteThread,
    addMessage,
    updateThreadTitle
  };
  
  return <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>;
};

// Custom hook to use the thread context
export const useThread = () => {
  const context = useContext(ThreadContext);
  
  if (!context) {
    throw new Error('useThread must be used within a ThreadProvider');
  }
  
  return context;
}; 