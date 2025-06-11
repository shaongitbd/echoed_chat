import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { appwriteService } from '../lib/appwrite';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

// Create context
const ChatContext = createContext({
  threads: [],
  messages: [],
  loadThreads: () => {},
  loadMessages: () => {},
  createChatThread: () => {},
  deleteChatThread: () => {},
  sendMessage: () => {},
  editMessage: () => {},
  deleteMessage: () => {},
  isLoading: false,
  activeCollaborators: {},
  userCursors: {},
  updateCursorPosition: () => {}
});

// Chat provider component
export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { userSettings } = useSettings();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState({});
  const [userCursors, setUserCursors] = useState({});
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const errorCountRef = useRef(0);
  
  // Load threads when user changes
  useEffect(() => {
    if (user) {
      console.log('User changed, loading threads for:', user.$id);
      loadThreads();
    } else {
      console.log('No user, clearing threads');
      setThreads([]);
      setMessages([]);
    }
  }, [user]);
  
  // Load threads with debounce and error handling
  const loadThreads = async () => {
    if (!user) {
      console.log('No user, skipping loadThreads');
      return;
    }
    
    // Prevent concurrent calls
    if (loadingRef.current) {
      console.log('Already loading threads, skipping');
      return;
    }
    
    // Debounce: prevent calling too frequently (at least 5 seconds between calls)
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 5000) {
      console.log('Called too frequently, debouncing');
      return;
    }
    
    try {
      console.log('Loading threads for user:', user.$id);
      loadingRef.current = true;
      setIsLoading(true);
      lastLoadTimeRef.current = now;
      
      const response = await appwriteService.getUserChatThreads(user.$id);
      console.log('Threads loaded successfully:', response.documents.length);
      setThreads(response.documents);
      errorCountRef.current = 0; // Reset error count on success
    } catch (error) {
      console.error('Error loading threads:', error);
      errorCountRef.current += 1;
      
      // If we've had too many errors, stop trying
      if (errorCountRef.current > 3) {
        console.log('Too many errors, giving up on loading threads');
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };
  
  // Load messages for a thread
  const loadMessages = async (threadId) => {
    if (!threadId) return;
    
    try {
      console.log(`Loading messages for thread: ${threadId}`);
      setIsLoading(true);
      setCurrentThreadId(threadId);
      
      const response = await appwriteService.getMessages(threadId);
      console.log(`Messages loaded: ${response.documents.length}`, response.documents);
      setMessages(response.documents);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new chat thread
  const createChatThread = async (title = 'New Chat') => {
    console.log('createChatThread called with title:', title);
    
    if (!user) {
      console.error('createChatThread: No user found');
      throw new Error('You must be logged in to create a chat thread');
    }
    
    try {
      setIsLoading(true);
      
      // Extract default provider and model from user settings
      let defaultProvider = 'openai';
      let defaultModel = 'gpt-4o';
      console.log('User settings:', userSettings);
      
      if (userSettings) {
        // Check if preferences is a string that needs to be parsed
        if (userSettings.preferences && typeof userSettings.preferences === 'string') {
          try {
            const preferences = JSON.parse(userSettings.preferences);
            console.log('Parsed preferences:', preferences);
            
            if (preferences.defaultProvider) {
              defaultProvider = preferences.defaultProvider;
            }
            
            if (preferences.defaultModel) {
              defaultModel = preferences.defaultModel;
            }
            
            console.log(`Using preferences from JSON: ${defaultProvider}/${defaultModel}`);
          } catch (e) {
            console.error('Error parsing preferences:', e);
          }
        } 
        // Check if preferences is already an object
        else if (userSettings.preferences && typeof userSettings.preferences === 'object') {
          const preferences = userSettings.preferences;
          
          if (preferences.defaultProvider) {
            defaultProvider = preferences.defaultProvider;
          }
          
          if (preferences.defaultModel) {
            defaultModel = preferences.defaultModel;
          }
          
          console.log(`Using preferences from object: ${defaultProvider}/${defaultModel}`);
        }
        // Fall back to direct properties if they exist
        else if (userSettings.defaultProvider && userSettings.defaultModel) {
          defaultProvider = userSettings.defaultProvider;
          defaultModel = userSettings.defaultModel;
          console.log(`Using direct properties: ${defaultProvider}/${defaultModel}`);
        }
      } else {
        console.log('No user settings found, using fallback defaults');
      }
      
      const newThread = await appwriteService.createChatThread(
        user.$id, 
        title, 
        defaultProvider, 
        defaultModel
      );
      
      setThreads(prev => [newThread, ...prev]);
      return newThread;
    } catch (error) {
      console.error('Error in createChatThread:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a chat thread
  const deleteChatThread = async (threadId) => {
    try {
      setIsLoading(true);
      
      // Show toast notification
      toast.loading('Deleting chat thread and all messages...');
      
      // First clear messages if the current thread was deleted
      if (currentThreadId === threadId) {
        setMessages([]);
        setCurrentThreadId(null);
      }
      
      // Update threads list immediately for better UX
      setThreads(prev => prev.filter(thread => thread.$id !== threadId));
      
      // Delete thread and all its messages from database
      const result = await appwriteService.deleteChatThread(threadId);
      
      toast.success('Chat thread deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting chat thread:', error);
      toast.error('Failed to delete chat thread: ' + (error.message || 'Unknown error'));
      
      // Reload threads to restore state in case of error
      loadThreads();
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send a message
  const sendMessage = async (threadId, sender, content, options = {}) => {
    if (!threadId) return null;
    
    try {
      const message = await appwriteService.createMessage(
        threadId,
        sender,
        content,
        options
      );
      
      // Update messages list
      setMessages(prev => [...prev, message]);
      
      // Update thread's lastMessageAt
      if (currentThreadId === threadId) {
        const updatedThreads = threads.map(thread => {
          if (thread.$id === threadId) {
            return {
              ...thread,
              // Appwrite will automatically update $updatedAt
            };
          }
          return thread;
        });
        
        setThreads(updatedThreads);
      }
      
      return message.$id;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };
  
  // Edit a message
  const editMessage = async (messageId, content) => {
    try {
      const updatedMessage = await appwriteService.updateMessage(messageId, { content });
      
      // Update messages list
      setMessages(prev => prev.map(msg => 
        msg.$id === messageId ? { ...msg, content, isEdited: true } : msg
      ));
      
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  };
  
  // Delete a message
  const deleteMessage = async (messageId) => {
    try {
      // Find message index
      const messageIndex = messages.findIndex(msg => msg.$id === messageId);
      
      // Get all messages that need to be deleted (the current one and all that follow)
      if (messageIndex !== -1) {
        const messagesToDelete = messages.slice(messageIndex);
        
        // Update messages list immediately
        setMessages(prev => prev.filter(msg => !messagesToDelete.some(m => m.$id === msg.$id)));
        
        // Delete from database - start from the end to avoid reference issues
        for (let i = messagesToDelete.length - 1; i >= 0; i--) {
          await appwriteService.deleteMessage(messagesToDelete[i].$id);
        }
      } else {
        // If message not found in local state, just delete the one message
        await appwriteService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.$id !== messageId));
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  };
  
  // Add this useEffect to handle collaborator tracking
  useEffect(() => {
    if (!currentThreadId || !user) return;
    
    // Subscribe to real-time user presence updates
    const unsubscribe = appwriteService.client.subscribe(
      `threads.${currentThreadId}.presence`,
      (response) => {
        if (response.event === 'user.join') {
          // A user joined the thread
          const { userId, userName, timestamp } = response.payload;
          
          if (userId !== user.$id) {
            setActiveCollaborators(prev => ({
              ...prev,
              [userId]: {
                userId,
                userName,
                joinedAt: timestamp,
                lastActive: timestamp
              }
            }));
          }
        } else if (response.event === 'user.leave') {
          // A user left the thread
          const { userId } = response.payload;
          
          setActiveCollaborators(prev => {
            const newCollaborators = { ...prev };
            delete newCollaborators[userId];
            return newCollaborators;
          });
          
          // Also remove their cursor
          setUserCursors(prev => {
            const newCursors = { ...prev };
            delete newCursors[userId];
            return newCursors;
          });
        } else if (response.event === 'cursor.move') {
          // A user moved their cursor
          const { userId, position } = response.payload;
          
          if (userId !== user.$id) {
            setUserCursors(prev => ({
              ...prev,
              [userId]: position
            }));
            
            // Update last active timestamp
            setActiveCollaborators(prev => {
              if (prev[userId]) {
                return {
                  ...prev,
                  [userId]: {
                    ...prev[userId],
                    lastActive: new Date().toISOString()
                  }
                };
              }
              return prev;
            });
          }
        }
      }
    );
    
    // Announce that this user joined the thread
    const announcePresence = async () => {
      try {
        await appwriteService.announceUserPresence(currentThreadId, user.$id, user.name || 'User');
      } catch (error) {
        console.error('Error announcing presence:', error);
      }
    };
    
    announcePresence();
    
    // Set up interval to update presence regularly
    const presenceInterval = setInterval(announcePresence, 30000); // Every 30 seconds
    
    return () => {
      unsubscribe();
      clearInterval(presenceInterval);
      
      // Announce that this user left the thread
      appwriteService.announceUserLeft(currentThreadId, user.$id).catch(err => {
        console.error('Error announcing user left:', err);
      });
    };
  }, [currentThreadId, user]);

  // Add this function to update cursor position
  const updateCursorPosition = (position) => {
    if (!currentThreadId || !user) return;
    
    appwriteService.updateCursorPosition(currentThreadId, user.$id, position).catch(err => {
      console.error('Error updating cursor position:', err);
    });
  };
  
  // Context value
  const value = {
    threads,
    messages,
    loadThreads,
    loadMessages,
    createChatThread,
    deleteChatThread,
    sendMessage,
    editMessage,
    deleteMessage,
    isLoading,
    activeCollaborators,
    userCursors,
    updateCursorPosition
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use chat context
export const useChat = () => {
  return useContext(ChatContext);
}; 