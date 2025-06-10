import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Send, Search, Settings, Paperclip, X, ChevronDown, ChevronUp, Edit, Trash, Share, Copy, Image, Video, Book } from 'lucide-react';
import { toast } from 'sonner';

import { appwriteService } from '../../lib/appwrite';
import modelService from '../../lib/modelService';
import searchService from '../../lib/searchService';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useSettings } from '../../contexts/SettingsContext';

import MessageItem from './MessageItem';
import ModelSelector from './ModelSelector';
import InlineModelSelector from './InlineModelSelector';
import ContextLengthIndicator from './ContextLengthIndicator';
import SearchResults from './SearchResults';
import ThinkingPanel from './ThinkingPanel';
import FileUploadButton from './FileUploadButton';
import ChatBranching from './ChatBranching';
import MediaGenerationModal from './MediaGenerationModal';
import ModelRecommendation from './ModelRecommendation';
import MemoryManager from './MemoryManager';
import CollaboratorIndicator from './CollaboratorIndicator';

const ChatInterface = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { threads, messages, loadMessages, sendMessage, editMessage, deleteMessage, updateCursorPosition } = useChat();
  const { userSettings } = useSettings();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(userSettings?.defaultProvider || '');
  const [selectedModel, setSelectedModel] = useState(userSettings?.defaultModel || '');
  const [providerDisplayName, setProviderDisplayName] = useState('');
  const [modelDisplayName, setModelDisplayName] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [thinking, setThinking] = useState('');
  const [files, setFiles] = useState([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [contextMessages, setContextMessages] = useState([]);
  const [showBranching, setShowBranching] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const [showModelRecommendation, setShowModelRecommendation] = useState(true);
  const [lastRecommendedProvider, setLastRecommendedProvider] = useState(null);
  const [lastRecommendedModel, setLastRecommendedModel] = useState(null);
  const [showMemoryManager, setShowMemoryManager] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState([]);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Load thread details and messages when threadId changes
  useEffect(() => {
    if (threadId) {
      loadMessages(threadId);
    }
  }, [threadId, loadMessages]);
  
  // Set default provider and model from thread settings or user settings
  useEffect(() => {
    if (threads && threadId) {
      console.log('Setting provider/model based on thread or user settings');
      const currentThread = threads.find(t => t.$id === threadId);
      
      if (currentThread) {
        console.log('Current thread:', currentThread);
        
        // If thread has default provider and model, use those
        if (currentThread.defaultProvider && currentThread.defaultModel) {
          console.log(`Using thread settings: ${currentThread.defaultProvider}/${currentThread.defaultModel}`);
          setSelectedProvider(currentThread.defaultProvider);
          setSelectedModel(currentThread.defaultModel);
        } 
        // Otherwise, fall back to user settings
        else if (userSettings) {
          // Try to get defaults from preferences
          let defaultProvider = null;
          let defaultModel = null;
          
          // Check if preferences is a string that needs to be parsed
          if (userSettings.preferences && typeof userSettings.preferences === 'string') {
            try {
              const preferences = JSON.parse(userSettings.preferences);
              defaultProvider = preferences.defaultProvider;
              defaultModel = preferences.defaultModel;
            } catch (e) {
              console.error('Error parsing preferences:', e);
            }
          } 
          // Check if preferences is already an object
          else if (userSettings.preferences && typeof userSettings.preferences === 'object') {
            defaultProvider = userSettings.preferences.defaultProvider;
            defaultModel = userSettings.preferences.defaultModel;
          }
          // Fall back to direct properties
          else {
            defaultProvider = userSettings.defaultProvider;
            defaultModel = userSettings.defaultModel;
          }
          
          if (defaultProvider && defaultModel) {
            console.log(`Using user settings: ${defaultProvider}/${defaultModel}`);
            setSelectedProvider(defaultProvider);
            setSelectedModel(defaultModel);
          }
        }
      }
    } 
    // No thread ID, use user settings if available
    else if (userSettings) {
      // Try to get defaults from preferences
      let defaultProvider = null;
      let defaultModel = null;
      
      // Check if preferences is a string that needs to be parsed
      if (userSettings.preferences && typeof userSettings.preferences === 'string') {
        try {
          const preferences = JSON.parse(userSettings.preferences);
          defaultProvider = preferences.defaultProvider;
          defaultModel = preferences.defaultModel;
        } catch (e) {
          console.error('Error parsing preferences:', e);
        }
      } 
      // Check if preferences is already an object
      else if (userSettings.preferences && typeof userSettings.preferences === 'object') {
        defaultProvider = userSettings.preferences.defaultProvider;
        defaultModel = userSettings.preferences.defaultModel;
      }
      // Fall back to direct properties
      else {
        defaultProvider = userSettings.defaultProvider;
        defaultModel = userSettings.defaultModel;
      }
      
      if (defaultProvider && defaultModel) {
        console.log(`Using user settings (no thread): ${defaultProvider}/${defaultModel}`);
        setSelectedProvider(defaultProvider);
        setSelectedModel(defaultModel);
      }
    }
  }, [threads, threadId, userSettings]);
  
  useEffect(() => {
    if (userSettings && selectedProvider && selectedModel) {
      // Get providers from preferences
      let providers = [];
      
      // Check if preferences is a string that needs to be parsed
      if (userSettings.preferences && typeof userSettings.preferences === 'string') {
        try {
          const preferences = JSON.parse(userSettings.preferences);
          providers = preferences.providers || [];
        } catch (e) {
          console.error('Error parsing preferences:', e);
        }
      } 
      // Check if preferences is already an object
      else if (userSettings.preferences && typeof userSettings.preferences === 'object') {
        providers = userSettings.preferences.providers || [];
      }
      // Fall back to direct properties
      else if (userSettings.providers) {
        providers = userSettings.providers;
      }
      
      // Try to find the provider in user settings
      const provider = providers.find(p => p.name === selectedProvider);
      
      if (provider) {
        // Try to find the model in the provider's models
        const model = provider.models?.find(m => m.id === selectedModel);
        
        // Set display names with fallbacks
        setProviderDisplayName(provider.name || selectedProvider);
        setModelDisplayName(model?.name || selectedModel);
      } else {
        // Provider not found, use raw values
        setProviderDisplayName(selectedProvider);
        setModelDisplayName(selectedModel);
        
        console.log('Provider not found in user settings:', selectedProvider);
      }
    }
  }, [userSettings, selectedProvider, selectedModel]);
  
  // Set web search enabled based on user plan
  useEffect(() => {
    const checkWebSearchEnabled = async () => {
      if (user) {
        try {
          const usage = await appwriteService.checkUserUsage(user.$id);
          setWebSearchEnabled(usage.webSearchEnabled);
        } catch (error) {
          console.error('Error checking web search enabled:', error);
          setWebSearchEnabled(false);
        }
      }
    };
    
    checkWebSearchEnabled();
  }, [user]);
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchResults, thinking]);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);
  
  // Handle file uploads
  const handleFileUpload = (uploadedFiles) => {
    const newFiles = [...files];
    
    Array.from(uploadedFiles).forEach(file => {
      // Check file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File ${file.name} exceeds the 10MB limit`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        newFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result
        });
        setFiles(newFiles);
      };
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };
  
  // Remove a file from the list
  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() && files.length === 0) return;
    
    try {
      setIsLoading(true);
      setThinking('');
      
      const messageContent = input.trim();
      setInput('');
      
      // Check if we should perform a web search
      let searchData = null;
      if (webSearchEnabled && searchService.shouldPerformWebSearch(messageContent)) {
        try {
          const query = searchService.extractSearchQuery(messageContent);
          const results = await searchService.performWebSearch(query);
          setSearchResults(searchService.formatSearchResultsForDisplay(results));
          searchData = results;
        } catch (error) {
          console.error('Error performing web search:', error);
          toast.error('Failed to perform web search');
        }
      }
      
      // Get the API key for the selected provider
      const providerSettings = userSettings?.providers?.find(p => p.name === selectedProvider);
      const apiKey = providerSettings?.apiKey || '';
      
      if (!apiKey) {
        toast.error(`No API key found for ${selectedProvider}. Please add one in settings.`);
        setIsLoading(false);
        return;
      }
      
      // Prepare messages for the model
      const messagesToSend = [
        ...contextMessages,
        { role: 'user', content: messageContent }
      ];
      
      // Add search results as context if available
      if (searchData) {
        messagesToSend.unshift(searchService.createSearchResultsSystemMessage(searchData));
      }
      
      // Add selected memories to context
      if (selectedMemories.length > 0) {
        // Add each memory as a system message at the beginning
        selectedMemories.forEach(memory => {
          messagesToSend.unshift({
            role: 'system',
            content: `Memory - ${memory.name}:\n${memory.content}`
          });
        });
      }
      
      // Send user message to UI first
      const userMessageId = await sendMessage(threadId, user.$id, messageContent, {
        contentType: 'text',
        fileIds: [],
        model: selectedModel,
        provider: selectedProvider,
        searchMetadata: searchData ? {
          query: searchData.query,
          sources: searchData.results.map(r => ({
            url: r.url,
            title: r.title,
            summary: r.summary
          }))
        } : null
      });
      
      // Stream thinking output if enabled
      let thinkingInterval;
      if (showThinking) {
        let dots = 0;
        thinkingInterval = setInterval(() => {
          dots = (dots + 1) % 4;
          setThinking(`Thinking${'.'.repeat(dots)}`);
        }, 500);
      }
      
      // Send message to model
      const modelResponse = await modelService.sendChatRequest(
        selectedProvider,
        selectedModel,
        apiKey,
        messagesToSend,
        {
          temperature: 0.7,
          searchResults: searchData,
          files
        }
      );
      
      // Clear thinking interval
      if (thinkingInterval) {
        clearInterval(thinkingInterval);
      }
      
      // Extract assistant message from model response
      let assistantContent = '';
      if (modelResponse.choices && modelResponse.choices.length > 0) {
        assistantContent = modelResponse.choices[0].message.content;
      }
      
      // Send assistant message to UI
      await sendMessage(threadId, 'assistant', assistantContent, {
        contentType: 'text',
        fileIds: [],
        model: selectedModel,
        provider: selectedProvider,
        parentMessageId: null,
        contextLength: messagesToSend.reduce((acc, msg) => acc + msg.content.length, 0),
        tokensUsed: modelResponse.usage?.total_tokens || 0
      });
      
      // Clear files and search results
      setFiles([]);
      setSearchResults(null);
      setThinking('');
      
      // Update usage statistics
      if (user) {
        try {
          await appwriteService.incrementUsage(user.$id, 'textQueries');
        } catch (error) {
          console.error('Error incrementing usage:', error);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle key press events
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Edit a message
  const handleEditMessage = async (messageId, newContent) => {
    try {
      await editMessage(messageId, newContent);
      toast.success('Message updated');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };
  
  // Delete a message
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };
  
  // Regenerate an AI message
  const handleRegenerateMessage = async (messageId) => {
    try {
      // Find the message in the list
      const messageIndex = messages.findIndex(msg => msg.$id === messageId);
      
      if (messageIndex > 0) {
        // Find the user message that prompted this AI response
        const previousMessage = messages[messageIndex - 1];
        
        if (previousMessage && previousMessage.sender === 'user') {
          // Delete the current AI response and any subsequent messages
          const messagesToDelete = messages.slice(messageIndex);
          for (const msg of messagesToDelete) {
            await deleteMessage(msg.$id);
          }
          
          // Resend the user's message to generate a new response
          await sendMessage(
            threadId,
            previousMessage.sender,
            previousMessage.content,
            {
              contentType: previousMessage.contentType || 'text',
              model: selectedModel,
              provider: selectedProvider
            }
          );
          
          toast.success('Regenerating response...');
        } else {
          toast.error('Cannot find the user message for this response.');
        }
      } else {
        toast.error('Cannot regenerate the first message.');
      }
    } catch (error) {
      console.error('Error regenerating message:', error);
      toast.error('Failed to regenerate response');
    }
  };
  
  // Select a model
  const handleModelSelect = (provider, model) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    setShowModelSelector(false);
    
    // Update thread default provider and model
    if (threadId) {
      console.log(`Updating thread ${threadId} with provider: ${provider}, model: ${model}`);
      
      appwriteService.updateChatThread(threadId, {
        defaultProvider: provider,
        defaultModel: model
      })
      .then(() => {
        console.log('Thread settings updated successfully');
        
        // Get providers from preferences
        let providers = [];
        
        // Check if preferences is a string that needs to be parsed
        if (userSettings && userSettings.preferences && typeof userSettings.preferences === 'string') {
          try {
            const preferences = JSON.parse(userSettings.preferences);
            providers = preferences.providers || [];
          } catch (e) {
            console.error('Error parsing preferences:', e);
          }
        } 
        // Check if preferences is already an object
        else if (userSettings && userSettings.preferences && typeof userSettings.preferences === 'object') {
          providers = userSettings.preferences.providers || [];
        }
        // Fall back to direct properties
        else if (userSettings && userSettings.providers) {
          providers = userSettings.providers;
        }
        
        // Also update display names
        const providerInfo = providers.find(p => p.name === provider);
        if (providerInfo) {
          const modelInfo = providerInfo.models?.find(m => m.id === model);
          setProviderDisplayName(providerInfo.name || provider);
          setModelDisplayName(modelInfo?.name || model);
        } else {
          setProviderDisplayName(provider);
          setModelDisplayName(model);
        }
      })
      .catch(error => {
        console.error('Error updating thread settings:', error);
        toast.error('Failed to update thread settings');
      });
    }
  };
  
  // Copy thread to clipboard
  const handleCopyThread = () => {
    const threadText = messages
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(threadText)
      .then(() => toast.success('Thread copied to clipboard'))
      .catch(() => toast.error('Failed to copy thread'));
  };
  
  // Share thread with other users
  const handleShareThread = () => {
    navigate(`/share/${threadId}`);
  };
  
  // Toggle which messages to include in context
  const toggleMessageInContext = (messageId) => {
    setContextMessages(prev => {
      const exists = prev.some(msg => msg.id === messageId);
      if (exists) {
        return prev.filter(msg => msg.id !== messageId);
      } else {
        const message = messages.find(msg => msg.$id === messageId);
        if (message) {
          return [...prev, { id: message.$id, role: message.sender === 'user' ? 'user' : 'assistant', content: message.content }];
        }
        return prev;
      }
    });
  };
  
  // Handle media generation
  const handleMediaGenerate = (mediaData) => {
    if (!threadId) {
      toast.error('Please select a thread first');
      return;
    }
    
    // Send the media message
    sendMessage(
      threadId,
      user.$id,
      mediaData.content,
      {
        contentType: mediaData.contentType,
        model: mediaData.model,
        provider: mediaData.provider,
        imagePrompt: mediaData.imagePrompt,
        videoPrompt: mediaData.videoPrompt
      }
    );
    
    // Close the modal
    setShowMediaModal(false);
  };
  
  // Add this useEffect to reset the recommendation flag when the input changes significantly
  useEffect(() => {
    // Only show recommendations again if input changes significantly
    if (input.length > 10 && !showModelRecommendation) {
      setShowModelRecommendation(true);
    }
  }, [input]);
  
  // Add this function to handle model recommendation selection
  const handleSelectRecommendation = (provider, model) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    setLastRecommendedProvider(provider);
    setLastRecommendedModel(model);
    setShowModelRecommendation(false);
    
    toast.success(`Switched to ${provider}/${model}`);
  };
  
  // Add this function to handle memory selection
  const handleMemorySelect = (memory) => {
    if (!memory) return;
    
    const memoryExists = selectedMemories.some(m => m.$id === memory.$id);
    
    if (memoryExists) {
      toast.info(`Memory "${memory.name}" is already selected`);
      return;
    }
    
    setSelectedMemories([...selectedMemories, memory]);
    setShowMemoryManager(false);
    
    toast.success(`Memory "${memory.name}" added to context`);
  };
  
  // Add this function to handle memory removal
  const handleRemoveMemory = (memoryId) => {
    setSelectedMemories(selectedMemories.filter(memory => memory.$id !== memoryId));
    toast.info('Memory removed from context');
  };
  
  // Add this function to track mouse movement
  const handleMouseMove = (e) => {
    // Only track mouse position if we're in a thread
    if (threadId) {
      updateCursorPosition({
        x: e.clientX,
        y: e.clientY
      });
    }
  };
  
  // Add this useEffect to set up mouse movement tracking
  useEffect(() => {
    // Throttle the mouse movement event to reduce overhead
    let timeout;
    
    const throttledMouseMove = (e) => {
      if (!timeout) {
        timeout = setTimeout(() => {
          handleMouseMove(e);
          timeout = null;
        }, 100); // Throttle to once every 100ms
      }
    };
    
    window.addEventListener('mousemove', throttledMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
      clearTimeout(timeout);
    };
  }, [threadId]);
  
  // Add a debug effect to monitor messages and thread ID
  useEffect(() => {
    if (threadId) {
      console.log(`Current thread ID: ${threadId}`);
      console.log(`Current messages count: ${messages.length}`);
      
      // Check if this thread exists in the threads list
      const threadExists = threads?.some(t => t.$id === threadId);
      console.log(`Thread exists in threads list: ${threadExists}`);
      
      if (!threadExists && threads?.length > 0) {
        console.warn('Thread ID not found in threads list. This might be an invalid thread ID.');
      }
      
      // If no messages are loaded, try to load them again after a short delay
      if (messages.length === 0 && !isLoading) {
        const timer = setTimeout(() => {
          console.log('No messages found, trying to reload...');
          loadMessages(threadId);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [threadId, messages, threads, isLoading, loadMessages]);
  
  // Verify thread ID validity
  useEffect(() => {
    if (threadId) {
      // Directly check if the thread exists in Appwrite
      const verifyThreadExists = async () => {
        try {
          console.log(`Directly verifying thread ID: ${threadId}`);
          await appwriteService.getChatThread(threadId);
          console.log('Thread verification successful');
        } catch (error) {
          console.error('Thread verification failed:', error);
          toast.error('This chat thread does not exist or you do not have permission to access it');
          navigate('/chat'); // Redirect to chat list
        }
      };
      
      verifyThreadExists();
    }
  }, [threadId, navigate]);
  
  return (
    <div className="chat-container">
      {/* Chat header */}
      <div className="border-b p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            {threads?.find(t => t.$id === threadId)?.title || 'New Chat'}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyThread}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Copy thread"
          >
            <Copy size={18} />
          </button>
          <button
            onClick={handleShareThread}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Share thread"
          >
            <Share size={18} />
          </button>
          <button
            onClick={() => setShowBranching(!showBranching)}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Show branches"
          >
            {showBranching ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      {/* Branching UI */}
      {showBranching && (
        <ChatBranching threadId={threadId} />
      )}
      
      {/* Messages area */}
      <div className="chat-messages">
        {messages.map(message => (
          <MessageItem
            key={message.$id}
            message={message}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onRegenerate={handleRegenerateMessage}
            toggleInContext={toggleMessageInContext}
            isInContext={contextMessages.some(msg => msg.id === message.$id)}
            showThinking={showThinking && message.sender === 'assistant' && message === messages[messages.length - 1]}
          />
        ))}
        
        {/* Search results */}
        {searchResults && searchResults.results.length > 0 && (
          <SearchResults results={searchResults} />
        )}
        
        {/* Thinking panel */}
        {thinking && (
          <ThinkingPanel content={thinking} />
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Selected memories */}
      {selectedMemories.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="text-xs font-medium text-gray-500 mb-2">Selected Memories:</div>
          <div className="space-y-1">
            {selectedMemories.map(memory => (
              <div key={memory.$id} className="flex items-center justify-between bg-white p-2 rounded-md border text-sm">
                <div className="truncate mr-2">
                  <span className="font-medium">{memory.name}</span>
                  {memory.tags && memory.tags.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      {memory.tags.map(tag => `#${tag}`).join(' ')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveMemory(memory.$id)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Remove memory"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Input area */}
      <div className="border-t p-4">
        {/* Context length indicator */}
        <ContextLengthIndicator
          contextLength={contextMessages.reduce((acc, msg) => acc + msg.content.length, 0) + input.length}
          maxLength={8192} // Default max length, adjust based on model
        />
        
        {/* Files preview */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center bg-gray-100 rounded-lg p-2">
                <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-2">
          {/* Full model selector button */}
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="model-selector-button flex-shrink-0 hidden md:flex"
          >
            {providerDisplayName}/{modelDisplayName}
            <ChevronDown size={16} />
          </button>
          
          {/* Model recommendation */}
          <ModelRecommendation
            inputText={input}
            onSelectRecommendation={handleSelectRecommendation}
            currentProvider={selectedProvider}
            currentModel={selectedModel}
            showRecommendation={showModelRecommendation}
            onClose={() => setShowModelRecommendation(false)}
          />
          
          {/* Message input */}
          <div className="message-input-container flex-grow relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="message-input pr-32" /* Added padding to make room for the model selector */
              disabled={isLoading}
              style={{ paddingRight: '120px' }} /* Ensure enough space for the model selector */
            />
            
            {/* Inline model selector - positioned at the bottom right of the textarea */}
            <div className="absolute bottom-2 right-2 z-10">
              <InlineModelSelector 
                currentProvider={selectedProvider}
                currentModel={selectedModel}
                onSelect={handleModelSelect}
            />
            </div>
          </div>
          
          {/* File upload button */}
          <FileUploadButton 
            onUpload={handleFileUpload}
            disabled={isLoading || !threadId}
          />
          
          {/* Collaborator indicator */}
          <CollaboratorIndicator />
          
          {/* Web search toggle */}
          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`p-2 rounded-full ${webSearchEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title={webSearchEnabled ? 'Web search enabled' : 'Web search disabled'}
            disabled={!webSearchEnabled}
          >
            <Search size={20} />
          </button>
          
          {/* Thinking toggle */}
          <button
            onClick={() => setShowThinking(!showThinking)}
            className={`p-2 rounded-full ${showThinking ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}
            title={showThinking ? 'Thinking display enabled' : 'Thinking display disabled'}
          >
            <span className="font-mono">...</span>
          </button>
          
          {/* Generate image button */}
          <button
            onClick={() => {
              setMediaType('image');
              setShowMediaModal(true);
            }}
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Generate image"
          >
            <Image size={20} />
          </button>
          
          {/* Generate video button */}
          <button
            onClick={() => {
              setMediaType('video');
              setShowMediaModal(true);
            }}
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Generate video"
          >
            <Video size={20} />
          </button>
          
          {/* Memory manager button */}
          <button
            onClick={() => setShowMemoryManager(true)}
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Manage memories"
          >
            <Book size={20} />
          </button>
          
          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!input.trim() && files.length === 0)}
            className="p-2 rounded-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
      
      {/* Model selector popup */}
      {showModelSelector && (
        <ModelSelector
          onClose={() => setShowModelSelector(false)}
          onSelect={handleModelSelect}
          currentProvider={selectedProvider}
          currentModel={selectedModel}
        />
      )}
      
      {/* Media generation modal */}
      {showMediaModal && (
        <MediaGenerationModal
          onClose={() => setShowMediaModal(false)}
          onGenerate={handleMediaGenerate}
          mediaType={mediaType}
        />
      )}
      
      {/* Memory manager modal */}
      {showMemoryManager && (
        <MemoryManager
          onClose={() => setShowMemoryManager(false)}
          onMemorySelect={handleMemorySelect}
          threadId={threadId}
        />
      )}
    </div>
  );
};

export default ChatInterface; 