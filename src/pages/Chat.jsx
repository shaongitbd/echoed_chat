import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { Send, Loader2, Bot, User, Image as ImageIcon, Video, Menu, X, Settings, Copy, Edit, Trash2, RefreshCw, AlertTriangle, Check, GitFork, Paperclip, FileText, Music, Film, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { appwriteService } from '../lib/appwrite';
import Sidebar from '../components/Sidebar';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ModelRecommendation from '../components/Chat/ModelRecommendation';
import InlineModelSelector from '../components/Chat/InlineModelSelector';
import ShareModal from '../components/ShareModal';

const Chat = () => {
  const { threadId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { userSettings } = useSettings();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [thread, setThread] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [availableModels, setAvailableModels] = useState([]);
  const [showModelRecommendation, setShowModelRecommendation] = useState(true);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [branches, setBranches] = useState({});
  const textareaRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [showFilesPreview, setShowFilesPreview] = useState(false);
  const fileInputRef = useRef(null);
  const [hasTriggeredAutoResponse, setHasTriggeredAutoResponse] = useState(false);
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const currentModelInfo = useMemo(() => {
    return availableModels.find(m => m.id === selectedModel && m.provider === selectedProvider);
  }, [availableModels, selectedProvider, selectedModel]);
  
  const modelsForSelector = useMemo(() => {
    if (isImageGenerationMode) {
      // Filter for models that have the 'image' capability
      return availableModels.filter(m => m.capabilities.includes('image'));
    }
    return availableModels;
  }, [availableModels, isImageGenerationMode]);
  
  // Debug effect for auth state
  useEffect(() => {
    console.log('Chat - Current user:', user);
    console.log('Chat - Auth loading:', authLoading);
    
    // If we're not loading and there's no user, redirect to login
    if (!authLoading && !user) {
      console.log('No user found, redirecting to login');
      navigate('/login');
    }
  }, [user, authLoading, navigate]);
  
  // Create a list of available models from enabled providers in settings
  useEffect(() => {
    if (userSettings && userSettings.providers) {
            const models = [];
      userSettings.providers.forEach(provider => {
              if (provider.enabled) {
                provider.models.forEach(model => {
                  if (model.enabled) {
                    models.push({
                      provider: provider.name,
                      id: model.id,
                name: model.name,
                      capabilities: model.capabilities || ['text']
                    });
                  }
                });
              }
            });
            setAvailableModels(models);

      // Set default provider and model if not in a thread
      if (!threadId && userSettings) {
        if (userSettings.defaultProvider) {
          setSelectedProvider(userSettings.defaultProvider);
        }
        if (userSettings.defaultModel) {
          setSelectedModel(userSettings.defaultModel);
        }
      }
    }
  }, [userSettings, threadId]);
  
  // Load thread details when threadId changes
  useEffect(() => {
    if (threadId && user) {
      const loadThread = async () => {
        try {
          const threadData = await appwriteService.getChatThread(threadId);
          setThread(threadData);
          
          // Set selected provider and model from thread settings
          if (threadData.defaultProvider) {
            setSelectedProvider(threadData.defaultProvider);
          } else if (userSettings && userSettings.defaultProvider) {
            // Fall back to user settings if thread doesn't have defaults
            setSelectedProvider(userSettings.defaultProvider);
          }
          
          if (threadData.defaultModel) {
            setSelectedModel(threadData.defaultModel);
          } else if (userSettings && userSettings.defaultModel) {
            // Fall back to user settings if thread doesn't have defaults
            setSelectedModel(userSettings.defaultModel);
          }

          // If image generation mode is on, ensure the selected model is compatible
          if (isImageGenerationMode) {
            const currentModelIsImageCapable = availableModels
              .find(m => m.id === (threadData.defaultModel || userSettings.defaultModel))
              ?.capabilities.includes('image');

            if (!currentModelIsImageCapable) {
              const firstImageModel = availableModels.find(m => m.capabilities.includes('image'));
              if (firstImageModel) {
                setSelectedProvider(firstImageModel.provider);
                setSelectedModel(firstImageModel.id);
              }
            }
          }

          // Fetch threads that have branched from the current thread
          const branchData = await appwriteService.getBranchesForThread(threadId);
          if (branchData && branchData.documents) {
            const branchesByMessage = branchData.documents.reduce((acc, branch) => {
              const msgId = branch.branchedFromMessage;
              if (msgId) {
                if (!acc[msgId]) {
                  acc[msgId] = [];
                }
                acc[msgId].push(branch);
              }
              return acc;
            }, {});
            setBranches(branchesByMessage);
          } else {
            setBranches({});
          }
        } catch (error) {
          console.error('Error loading thread:', error);
          toast.error('Failed to load conversation');
        }
      };
      
      loadThread();
    } else {
      setThread(null);
      setBranches({});
    }
  }, [threadId, user, userSettings, isImageGenerationMode, availableModels]);
  
  // Use the AI SDK's useChat hook
  const {
    messages: aiMessages,
    input,
    handleInputChange,
    setInput,
    handleSubmit: handleAISubmit,
    status,
    isLoading,
    error,
    reload,
    stop,
    setMessages: setAiMessages,
  } = useChat({
    api: '/api/chat',
    id: threadId,
    body: {
      userId: user?.$id,
      threadId,
      provider: selectedProvider,
      model: selectedModel,
      // Send the model's capabilities to the backend
      modelCapabilities: currentModelInfo?.capabilities,
    },
    onFinish: (message) => {
      // We need to update the message in our state with model info for rendering.
      setAiMessages(currentMessages => currentMessages.map(m => {
        if (m.id === message.id) {
          return { ...m, model: selectedModel, provider: selectedProvider, saved: true };
        }
        return m;
      }));

      // Save the AI's message(s) to Appwrite.
      if (threadId && user && message.role === 'assistant') {
        // Find the user prompt that triggered this response.
        // It's not guaranteed to be the last message, so we find the last user message in the history.
        const lastUserMessage = aiMessages.filter(m => m.role === 'user').pop();
        const imagePrompt = lastUserMessage ? lastUserMessage.content : '';

        // If the response has multiple parts (e.g., text and image), save each one.
        if (message.parts && message.parts.length > 0) {
            const savePromises = message.parts.map(part => {
                if (part.type === 'text' && part.text.trim()) {
                    return appwriteService.createMessage(
                        threadId, 'assistant', part.text,
                        { contentType: 'text', model: selectedModel, provider: selectedProvider }
                    );
                } else if (part.type === 'file' && part.mimeType?.startsWith('image/')) {
                    return appwriteService.createMessage(
                        threadId, 'assistant', part.data, // base64 data
                        { contentType: 'image', model: selectedModel, provider: selectedProvider, imagePrompt }
                    );
                }
                return null;
            }).filter(Boolean); // Filter out any null promises

            Promise.all(savePromises).catch(error => {
                console.error('Error saving AI message parts to Appwrite:', error);
                toast.error('Failed to save all parts of the AI response.');
            });
        }
        // Fallback for simple text-only messages.
        else if (message.content) {
            appwriteService.createMessage(
                threadId, 'assistant', message.content,
                { contentType: 'text', model: selectedModel, provider: selectedProvider }
            ).catch(error => {
                console.error('Error saving simple AI message to Appwrite:', error);
                toast.error('Failed to save AI response.');
            });
        }
      }
    },
    onError: (error) => {
      console.error('AI chat error:', error);
      
      // Extract detailed error information if available
      let errorMessage = 'An error occurred with the AI response.';
      
      // Check if this is a rate limit error (429)
      if (error.cause && error.cause.status === 429) {
        errorMessage = "Too many requests. Please wait a moment before trying again.";
      } 
      // Check if there's an error message in the error object
      else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for structured error details from our middleware
      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
          
          // Add provider-specific details if available
          if (error.error.details) {
            const details = error.error.details;
            if (details.reason) {
              errorMessage += ` Reason: ${details.reason}`;
            } else if (details.code) {
              errorMessage += ` (Code: ${details.code})`;
            }
          }
        }
      }
      
      // Try to extract HTTP status code from error stack trace for common errors
      if (errorMessage === 'An error occurred.' || errorMessage === 'An error occurred with the AI response.') {
        const stack = error.stack || '';
        if (stack.includes('429')) {
          errorMessage = "Too many requests. The API rate limit has been exceeded. Please wait a moment before trying again.";
        } else if (stack.includes('401') || stack.includes('403')) {
          errorMessage = "Authentication error. Please check your API key.";
        } else if (stack.includes('500')) {
          errorMessage = "Server error from the AI provider. Please try again later.";
        }
      }
      
      toast.error(errorMessage);
    }
  });
  
  // Debug effect for useChat parameters
  useEffect(() => {
    console.log('useChat params updated:', {
      threadId,
      userId: user?.$id,
      provider: selectedProvider,
      model: selectedModel,
    });
  }, [threadId, user, selectedProvider, selectedModel]);
  
  // Load messages from Appwrite when threadId changes and sync with AI SDK state
  useEffect(() => {
    const loadAndSyncMessages = async () => {
      if (!threadId || !user) return;
      
      try {
        console.log(`Loading messages for thread: ${threadId}`);
        setIsLoadingMessages(true);
        
        const response = await appwriteService.getMessages(threadId);
        console.log(`Loaded ${response.documents.length} messages from Appwrite`);
        
        const formattedMessages = response.documents.map(msg => ({
  id: msg.$id,
  role: msg.sender === 'assistant' ? 'assistant' : 'user',
  content: msg.content,
  createdAt: msg.$createdAt,
  saved: true, 
  contentType: msg.contentType,
  imagePrompt: msg.imagePrompt,
  videoPrompt: msg.videoPrompt,
  model: msg.model,
  provider: msg.provider,
          // Parse the stringified attachment data from the DB back into objects
          attachments: (msg.attachments || []).map(att => {
            try {
              return JSON.parse(att);
            } catch (e) {
              console.warn('Could not parse attachment, treating as raw string:', att);
              // Handle case where it might be a plain URL string for older data
              return { url: att }; 
            }
          }),
        }));
        
        // Sync the loaded messages with both our initial state and the AI SDK's state
        setMessages(formattedMessages);
        setAiMessages(formattedMessages);

      } catch (error) {
        console.error('Error loading messages from Appwrite:', error);
        toast.error('Failed to load messages');
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    loadAndSyncMessages();
  }, [threadId, user, setAiMessages]);
  
  // The AI SDK's message list is now the single source of truth for rendering.
  const allMessages = aiMessages;
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages]);
  
  // Edit a message
  const handleEdit = (message) => {
    console.log('Edit request for message:', message);
    setEditingMessage(message);
    setInput(message.content);
    textareaRef.current?.focus();
  };

  const handleConfirmEdit = async () => {
    if (!editingMessage || !input.trim()) {
      // This should not happen if the button is correctly disabled, but it acts as a safeguard.
      return;
    }

    const originalInput = input;
    const originalEditingMessage = editingMessage;

    // --- UI & State Update (Immediate) ---
    // 1. Reset form and editing state to prevent re-submissions and update the UI
    setInput('');
    setEditingMessage(null);

    // 2. Find the index of the message being edited.
    const messageIndex = allMessages.findIndex(m => m.id === originalEditingMessage.id);
    if (messageIndex === -1) {
      toast.error('Error: Could not find the message to edit.');
      setInput(originalInput); // Restore user's input if something went wrong
      return;
    }

    // 3. Prepare the new, definitive message list for the UI.
    const messagesUpToEdit = allMessages.slice(0, messageIndex);
    const updatedUserMessage = {
        ...allMessages[messageIndex],
        content: originalInput,
        isEdited: true,
    };
    const finalMessagesForUi = [...messagesUpToEdit, updatedUserMessage];
    
    // 4. Update the AI SDK's state. This is the single source of truth for our UI.
    setAiMessages(finalMessagesForUi);
        
    // 5. Trigger the AI to regenerate the response based on the updated message history.
    reload();

    // --- Database Operations (Run in background, does not block UI) ---
    const dbOperations = async () => {
        // Delete all messages in the database that came after the edited message.
        const messagesToDeleteInDb = allMessages.slice(messageIndex + 1);
        for (const message of messagesToDeleteInDb) {
            if (message.saved) { // Only delete messages that have a DB entry.
                await appwriteService.deleteMessage(message.id);
      }
        }

        // Update the edited message in the database.
        if (originalEditingMessage.saved) {
            await appwriteService.updateMessage(originalEditingMessage.id, {
                content: originalInput,
                isEdited: true,
            });
        }
    };

    dbOperations().catch(error => {
        console.error("Error during background DB operations for edit:", error);
        toast.error("Changes were displayed, but failed to save to the database.");
    });
  };
  
  // Define supported file types
  const supportedFileTypes = {
    image: ['image/png', 'image/jpeg', 'image/webp'],
    document: ['application/pdf', 'text/plain'],
    video: ['video/x-flv', 'video/quicktime', 'video/mpeg', 'video/mpegs', 'video/mpg', 'video/mp4', 'video/webm', 'video/wmv', 'video/3gpp'],
    audio: ['audio/x-aac', 'audio/flac', 'audio/mp3', 'audio/m4a', 'audio/mpeg', 'audio/mpga', 'audio/mp4', 'audio/opus', 'audio/pcm', 'audio/wav', 'audio/webm']
  };
  
  // File size limits (in bytes)
  const fileSizeLimits = {
    image: 7 * 1024 * 1024, // 7 MB
    document: 50 * 1024 * 1024, // 50 MB
    video: 500 * 1024 * 1024, // 500 MB (approximation for 1hr video)
    audio: 200 * 1024 * 1024 // 200 MB (approximation for 8.4hr audio)
  };
  
  // File count limits
  const fileCountLimits = {
    image: 3000,
    document: 3000,
    video: 10,
    audio: 1
  };
  
  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    
    // Simple validation for now, can be expanded as before
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    
    if (newFiles.length > 0) {
      setShowFilesPreview(true);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove a file
  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    if (newFiles.length === 0) {
      setShowFilesPreview(false);
    }
  };
  
  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setShowFilesPreview(false);
  };
  
  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <ImageIcon size={16} />;
    if (fileType.startsWith('video/')) return <Film size={16} />;
    if (fileType.startsWith('audio/')) return <Music size={16} />;
    return <FileText size={16} />;
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Handle image generation submission
  const handleGenerateImage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    let currentThreadId = threadId;

    // Create a new thread if one doesn't exist
    if (!currentThreadId) {
      try {
        const newThread = await appwriteService.createChatThread(user.$id, `Image: ${input.substring(0, 40)}...`, selectedProvider, selectedModel);
        currentThreadId = newThread.$id;
        // Navigate and let the user resend to avoid complex state management
        navigate(`/chat/${currentThreadId}`);
        toast.info("New chat created. Please describe your image again.");
        return;
      } catch (error) {
        toast.error("Failed to create a new chat for the image.");
        return;
      }
    }

    setIsGeneratingImage(true);
    setInput('');

    // Optimistically add user's prompt to the UI
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
      saved: false,
    };
    const loadingMessage = {
      id: `assistant_loading_${Date.now()}`,
      role: 'assistant',
      content: 'loading',
      createdAt: new Date().toISOString(),
    }
    setAiMessages([...allMessages, userMessage, loadingMessage]);

    try {
      // Save user prompt to DB
      const savedUserMessage = await appwriteService.createMessage(currentThreadId, user.$id, userMessage.content, {
        contentType: 'text',
        model: selectedModel,
        provider: selectedProvider,
      });
      // Update the message in state with its real DB id
      setAiMessages(current => current.map(m => m.id === userMessage.id ? { ...m, id: savedUserMessage.$id, saved: true } : m));

      // Call the backend API for image generation
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'image',
          prompt: userMessage.content,
          provider: selectedProvider,
          model: selectedModel,
          userId: user.$id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image.');
      }

      const { images } = await response.json();

      if (!images || images.length === 0) {
        throw new Error('The AI did not return an image.');
      }

      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: images[0].base64, // The base64 content
        contentType: 'image',
        mimeType: images[0].mimeType,
        imagePrompt: userMessage.content,
        createdAt: new Date().toISOString(),
        model: selectedModel,
        provider: selectedProvider,
        saved: false,
      };

      // Save the AI's image message to the DB
      const savedAssistantMessage = await appwriteService.createMessage(currentThreadId, 'assistant', assistantMessage.content, {
        contentType: 'image',
        mimeType: assistantMessage.mimeType,
        imagePrompt: assistantMessage.imagePrompt,
        model: selectedModel,
        provider: selectedProvider,
      });

      // Replace loading message with the actual image message
      setAiMessages(current => current.map(m =>
        m.id === loadingMessage.id
          ? { ...assistantMessage, id: savedAssistantMessage.$id, saved: true }
          : m
      ));

    } catch (error) {
      console.error('Error generating image:', error);
      toast.error(error.message);
      // Remove the loading message on error
      setAiMessages(current => current.filter(m => m.id !== loadingMessage.id));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Modify handleSubmit to properly include files in the AI request
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isImageGenerationMode) {
      await handleGenerateImage(e);
      return;
    }

    // If we are in editing mode, call the dedicated edit handler and stop.
    if (editingMessage) {
      await handleConfirmEdit();
      return;
    }

    if (!input.trim() && files.length === 0) return;
    if (!user) {
      toast.error('Please sign in to send messages');
      navigate('/login');
      return;
    }

    let currentThreadId = threadId;

    try {
      // If there is no thread, create one first.
      if (!currentThreadId) {
        // This part remains the same as before
        const newThread = await appwriteService.createChatThread(user.$id, input.substring(0, 50) || 'New conversation', selectedProvider, selectedModel);
        currentThreadId = newThread.$id;
        navigate(`/chat/${currentThreadId}`);
        // To provide a better UX, we could store the input/files and resubmit, but for now we navigate and let the user resend.
        toast.info("New chat created. Please send your message again.");
        return;
      }
      
      let attachmentsForDb = [];
      if (files.length > 0) {
        toast.info(`Uploading ${files.length} file(s)...`);
        
        // Step 1: Upload all files to Appwrite Storage
        const uploadPromises = files.map(file => appwriteService.uploadFile(file));
        attachmentsForDb = await Promise.all(uploadPromises);
        
        toast.success('Upload complete!');
      }

      // Step 2: Save the user's message to Appwrite DB with the storage URLs
      await appwriteService.createMessage(
        currentThreadId,
        user.$id,
        input,
        {
          contentType: 'text',
          model: selectedModel,
          provider: selectedProvider,
          // Convert each attachment object to a JSON string to fit the DB schema
          attachments: attachmentsForDb.map(att => JSON.stringify(att)),
          hasAttachments: attachmentsForDb.length > 0,
          attachmentCount: attachmentsForDb.length,
          attachmentTypes: attachmentsForDb.length > 0 ? attachmentsForDb.map(file => file.contentType).join(',') : undefined
        }
      );
      
      // Step 3: Submit to the AI using the hook's handler
      handleAISubmit(e, {
        experimental_attachments: attachmentsForDb // Pass the same data to the AI hook
      });
  
      // Step 4: Clear the files from the UI state after submission
      clearFiles();

    } catch (error) {
      console.error('Error during message submission:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
    }
  };

  // Stop AI generation
  const handleStopGeneration = async () => {
    console.log('Stopping AI generation');
    
    try {
      // First, try to use the AI SDK's built-in stop function if available
      if (typeof stop === 'function') {
        stop();
      }
      
      // Get the last message (the one being generated)
      const lastMessage = aiMessages[aiMessages.length - 1];
      
      if (lastMessage && lastMessage.role === 'assistant') {
        console.log('Saving partial AI response to Appwrite');
        
        // Extract the content that's been generated so far
        let content = '';
        if (lastMessage.parts) {
          content = lastMessage.parts
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('');
        } else if (lastMessage.content) {
          content = lastMessage.content;
        }
        
        if (content) {
          // Save this partial response to Appwrite
          await appwriteService.createMessage(
            threadId,
            'assistant',
            content,
            {
              contentType: 'text',
              model: selectedModel,
              provider: selectedProvider,
              isPartial: true
            }
          );
          
          toast.success('Stopped generation and saved partial response');
        }
      }
    } catch (error) {
      console.error('Error stopping generation:', error);
      toast.error('Error stopping generation');
    }
  };
  
  // Handle model selection
  const handleModelSelect = async (provider, model) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    setShowModelSelector(false);
    
    try {
      // If in a specific thread, update the thread's default model
      if (threadId && user) {
        await appwriteService.updateChatThread(threadId, {
          defaultProvider: provider,
          defaultModel: model
        });
        toast.success(`Model updated to ${model} for this chat.`);
      }
    } catch (error) {
      console.error('Error updating thread model settings:', error);
      toast.error('Failed to update model for this chat.');
    }
  };
  
  const handleSelectRecommendation = (provider, model) => {
    handleModelSelect(provider, model);
    setShowModelRecommendation(false);
  };
  
  const handleBranch = async (messageId) => {
    if (!threadId || !user) {
      toast.error("Cannot branch from an unsaved conversation.");
      return;
    }

    const messageIndex = allMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      toast.error("Could not find the message to branch from.");
      return;
    }

    const messagesToCopy = allMessages.slice(0, messageIndex + 1);
    const lastMessage = messagesToCopy[messagesToCopy.length - 1];

    try {
      toast.info("Creating a new branch...");

      const newThread = await appwriteService.createChatThread(
        user.$id,
        `Branch: ${lastMessage.content.substring(0, 30)}...`,
        selectedProvider,
        selectedModel,
        {
          branchedFromThread: threadId,
          branchedFromMessage: messageId,
        }
      );

      const messageCreationPromises = messagesToCopy.map(messageToCopy => {
        const messageMetadata = {
          contentType: messageToCopy.contentType || 'text',
          model: messageToCopy.model,
          provider: messageToCopy.provider,
          attachments: (messageToCopy.attachments || []).map(att => JSON.stringify(att)),
          hasAttachments: !!messageToCopy.attachments?.length,
          attachmentCount: messageToCopy.attachments?.length,
          attachmentTypes: messageToCopy.attachments?.length > 0 ? messageToCopy.attachments.map(file => file.contentType).join(',') : undefined,
          imagePrompt: messageToCopy.imagePrompt,
          videoPrompt: messageToCopy.videoPrompt,
          isEdited: messageToCopy.isEdited,
        };

        return appwriteService.createMessage(
          newThread.$id,
          messageToCopy.role === 'user' ? user.$id : 'assistant',
          messageToCopy.content,
          messageMetadata
        );
      });

      await Promise.all(messageCreationPromises);

      toast.success("Successfully created a new branch!");
      navigate(`/chat/${newThread.$id}`);

    } catch (error) {
      console.error("Failed to create branch:", error);
      toast.error("An error occurred while creating the branch.");
    }
  };

  // Render message content
  const renderMessageContent = (message) => {
    // Text from `content` (for older messages) or joined from `parts` (for new messages)
    const textParts = message.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || (typeof message.content === 'string' ? message.content : '');
    
    // Images from AI response (type 'file')
    const imageParts = message.parts?.filter(p => p.type === 'file' && p.mimeType?.startsWith('image/')) || [];
    
    // Combine attachments from DB and optimistic UI for user messages
    const userImageAttachments = [
      ...(message.attachments || []),
      ...(message.experimental_attachments || [])
    ].filter(att => att.contentType?.startsWith('image/'));

    // If the message from appwrite has contentType image, render it
    if (message.contentType === 'image') {
      // Handle loading state for image generation
      if (message.content === 'loading') {
        return (
          <div className="flex items-center">
            <Loader2 size={14} className="animate-spin mr-2" />
            <span>Generating image...</span>
          </div>
        );
      }
      return (
        <img 
          src={`data:${message.mimeType || 'image/png'};base64,${message.content}`} 
          alt={message.imagePrompt || 'Generated Image'} 
          className="rounded-lg"
        />
      );
    }
    
    const messageBranches = branches[message.id];

    return (
      <div className="relative group">
        {/* Render a grid of user-uploaded images */}
        {userImageAttachments.length > 0 && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {userImageAttachments.map((attachment, index) => (
              <a href={attachment.url} key={`user-att-${index}`} target="_blank" rel="noopener noreferrer">
                <img
                  src={attachment.url}
                  alt={attachment.name || 'User-uploaded image'}
                  className="rounded-lg object-cover aspect-square hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        )}

        {/* Render images from AI response */}
        {imageParts.map((part, index) => (
            <img
                key={`ai-img-${index}`}
                src={`data:${part.mimeType};base64,${part.data}`}
                alt="Generated Image"
                className="rounded-lg my-2 max-w-full"
            />
        ))}

        {textParts && (
            <ReactMarkdown
            components={{
                code: ({ node, inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const codeText = String(children).replace(/\n$/, '');
                    const handleCopy = () => {
                        navigator.clipboard.writeText(codeText);
                        toast.success('Code copied to clipboard!');
                    };
                    return !inline && match ? (
                        <div className="relative bg-[#2e3440] rounded-md my-2">
                            <div className="flex items-center justify-between px-4 py-1 bg-[#3b4252] text-xs text-gray-300 rounded-t-md">
                                <span>{language}</span>
                                <button onClick={handleCopy} className="p-1 hover:bg-[#4c566a] rounded"><Copy size={14} /></button>
                            </div>
                            <SyntaxHighlighter style={nord} language={language} PreTag="div" {...props}>{codeText}</SyntaxHighlighter>
                        </div>
                    ) : (
                        <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded-sm font-mono text-sm" {...props}>{children}</code>
                    );
                },
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />
            }}
            >{textParts}</ReactMarkdown>
        )}
        
        {/* Hover action buttons below AI messages */}
        {message.role === 'assistant' && (
          <div className="absolute bottom-[-60px] left-0 flex flex-nowrap items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(textParts);
                toast.success('Message copied to clipboard');
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Copy text"
            >
              <Copy size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleBranch(message.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Branch conversation"
            >
              <GitFork size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleRegenerate(message.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Regenerate response"
            >
              <RefreshCw size={15} />
            </button>
            {message.model && (
              <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                {availableModels.find(m => m.id === message.model)?.name || message.model}
              </span>
            )}
          </div>
        )}
        {messageBranches && messageBranches.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-3 text-sm">
            <h4 className="font-semibold text-gray-600 mb-2 flex items-center">
              <GitFork size={14} className="mr-1.5" /> Branches from this message
            </h4>
            <ul className="space-y-1">
              {messageBranches.map(branch => (
                <li key={branch.$id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/chat/${branch.$id}`)}
                    className="w-full text-left p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <div className="flex items-center text-gray-800">
                      <span className="mr-2 text-gray-400">↳</span>
                      <span className="truncate flex-1">{branch.title}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 pl-5">
                      Created {formatDistanceToNow(new Date(branch.$createdAt), { addSuffix: true })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  const handleRegenerate = async (messageId) => {
    console.log('Regenerating message ID:', messageId);

    const messageIndex = allMessages.findIndex(m => m.id === messageId);
    console.log('Message index:', messageIndex);

    if (messageIndex <= 0) {
      toast.error("Cannot regenerate the first message or a user message.");
      return;
    }

    const previousUserMessage = allMessages[messageIndex - 1];
    if (previousUserMessage.role !== 'user') {
      toast.error("Could not find the user prompt for this response.");
      return;
    }

    // Set the input to the content of the user message that prompted the response
    setInput(previousUserMessage.content);

    // --- Optimistic UI Update ---
    // Immediately remove the AI message and subsequent ones from the UI.
    const finalMessagesForUi = allMessages.slice(0, messageIndex);
    setAiMessages(finalMessagesForUi);
    toast.info('Regenerating response...'); // Use info toast for process start

    // --- Database Deletion (Await this before regenerating) ---
    const messagesToDeleteInDb = allMessages.slice(messageIndex);
    console.log('Messages to delete from DB:', messagesToDeleteInDb);

    try {
        const deletePromises = messagesToDeleteInDb
            .map(message => {
                const messageDbId = message.id || message.$id;
                if (messageDbId && message.saved) { // only delete if it has an id and was saved
                    return appwriteService.deleteMessage(messageDbId);
                }
                return null;
            })
            .filter(Boolean); // Filter out any null promises

        await Promise.all(deletePromises);
        console.log('Successfully deleted messages from the database.');

        // --- Trigger AI Regeneration ---
        // Now that DB is clean, get a new response.
        reload();

    } catch (error) {
        console.error("Error during DB operations for regenerate:", error);
        toast.error("Failed to delete old response(s) from the database. Please refresh the page.");
        // Note: At this point, the UI is out of sync with the DB. A refresh is the safest recovery.
        // We don't restore the messages in the UI because the user's intent was to delete them.
    }
  };

  const handleDelete = async (messageId) => {
    console.log('Initiating delete for message ID:', messageId);

    // --- UI & State Update (Immediate) ---
    // 1. Find the index of the message to delete.
    const messageIndex = allMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
        toast.error('Error: Could not find the message to delete.');
        return;
    }

    // 2. Prepare the new, definitive message list for the UI.
    // This list will contain only the messages *before* the one that was deleted.
    const finalMessagesForUi = allMessages.slice(0, messageIndex);

    // 3. Update the AI SDK's state, which is our single source of truth for the UI.
    setAiMessages(finalMessagesForUi);

    // 4. Show immediate feedback to the user.
    toast.success('Message(s) deleted.');


    // --- Database Operations (Run in background, does not block UI) ---
    const dbOperations = async () => {
        // Identify all messages from the clicked one onwards that need to be deleted from the DB.
        const messagesToDeleteInDb = allMessages.slice(messageIndex);
        
        // Delete messages from the database in reverse order to avoid any potential FK issues.
        for (let i = messagesToDeleteInDb.length - 1; i >= 0; i--) {
            const message = messagesToDeleteInDb[i];
            if (message.saved) { // Only attempt to delete messages that have a DB entry.
                await appwriteService.deleteMessage(message.id);
            }
        }
    };

    dbOperations().catch(error => {
        console.error("Error during background DB operations for delete:", error);
        toast.error("UI was updated, but failed to delete messages from the database.");
    });
  };
  
  // Add effect to check for autoResponse parameter
  useEffect(() => {
    const checkForAutoResponse = async () => {
      const searchParams = new URLSearchParams(location.search);
      const shouldAutoRespond = searchParams.get('autoResponse') === 'true';
      
      // Only process if we haven't already triggered the auto-response
      // and all conditions are met
      if (shouldAutoRespond && threadId && messages.length > 0 && !hasTriggeredAutoResponse) {
        // Mark that we've triggered the auto-response to prevent multiple calls
        setHasTriggeredAutoResponse(true);
        
        // Remove the parameter from URL immediately to prevent reload issues
        navigate(`/chat/${threadId}`, { replace: true });
        
        // Give a small delay for UI to stabilize
        setTimeout(() => {
          // Trigger AI response
          reload();
        }, 800);
      }
    };
    
    checkForAutoResponse();
  }, [threadId, messages, location.search, navigate, reload, hasTriggeredAutoResponse]);
  
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 rounded-full bg-white text-gray-800 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
        >
          {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar showMobileMenu={showMobileMenu} onCloseMobileMenu={() => setShowMobileMenu(false)} />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col bg-white">
        {/* Chat header */}
        <header className="border-b border-gray-200 py-3 px-4 sm:px-6 flex justify-between items-center bg-white shadow-sm">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-800">
              {thread ? thread.title : 'New Chat'}
            </h1>
            {thread && (
              <p className="text-xs text-gray-500">
                Last updated {formatDistanceToNow(new Date(thread.$updatedAt), { addSuffix: true })}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Share button - only show if thread exists */}
            {thread && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1 text-sm"
                title="Share this chat"
              >
                <Share2 size={14} />
                Share
              </button>
            )}
            
            {/* Model selector button */}
            <button
              type="button"
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1 text-sm"
            >
              <Settings size={14} />
              {modelsForSelector.find(m => m.id === selectedModel)?.name || selectedModel}
            </button>
          </div>
          
          {/* Model selector dropdown */}
          {showModelSelector && (
            <div className="absolute right-4 top-16 bg-white shadow-lg rounded-lg border border-gray-200 p-3 z-50 w-64">
              <h3 className="font-medium mb-2 text-gray-700">Select Model</h3>
              <div className="max-h-64 overflow-y-auto">
                {modelsForSelector.map((model, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleModelSelect(model.provider, model.id)}
                    className={`w-full text-left p-2 rounded-md mb-1 hover:bg-gray-100 ${
                      selectedProvider === model.provider && selectedModel === model.id
                        ? 'bg-blue-500 text-white'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>
                        {model.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {model.capabilities.join(', ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 size={32} className="text-gray-400 animate-spin mb-4" />
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Bot size={28} className="text-gray-600" />
              </div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">Start a new conversation</h2>
              <p className="text-gray-500 max-w-sm">
                Ask a question or start a conversation with the AI assistant.
              </p>
            </div>
          ) : (
            allMessages.map((message) => (
              <div
                key={message.id}
                className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' ? 'bg-gray-900 text-white ml-2' : 'bg-gray-100 text-gray-600 mr-2'
                  }`}>
                    {message.role === 'user' ? (
                      <User size={16} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                  
                  <div className={`px-4 py-3 rounded-lg prose prose-sm max-w-none relative group ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {renderMessageContent(message)}
                    {message.role === 'user' && (
                      <div className="absolute top-1 right-1 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 p-1 rounded-md">
                        <button 
                          type="button"
                          onClick={() => handleEdit(message)}
                          className="p-1 hover:bg-gray-700 rounded text-white"
                          title="Edit message"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(message.id)}
                          className="p-1 hover:bg-gray-700 rounded text-white"
                          title="Delete message"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="mb-6 flex justify-start">
              <div className="flex max-w-3xl flex-row">
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 mr-2">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-lg bg-gray-100 text-gray-800 prose prose-sm max-w-none">
                  <div className="flex items-center">
                    <Loader2 size={14} className="animate-spin mr-2" />
                    <span>Thinking<span className="animate-pulse">...</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {isGeneratingImage && !allMessages.some(m => m.content === 'loading') && (
             <div className="mb-6 flex justify-start">
              <div className="flex max-w-3xl flex-row">
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 mr-2">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-lg bg-gray-100 text-gray-800 prose prose-sm max-w-none">
                  <div className="flex items-center">
                    <Loader2 size={14} className="animate-spin mr-2" />
                    <span>Generating image<span className="animate-pulse">...</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="mb-6 flex justify-start">
              <div className="flex max-w-3xl flex-row">
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-red-100 text-red-600 mr-2">
                  <AlertTriangle size={16} />
                </div>
                <div className="px-4 py-3 rounded-lg bg-red-50 text-red-900 prose prose-sm max-w-none">
                  <p className="font-bold">
                    {error?.name && error.name !== 'Error' ? error.name : 'AI Response Error'}
                  </p>
                  <p>{error?.message || 'Failed to get a response. Please check your connection or API key and try again.'}</p>
                  <button
                    type="button"
                    onClick={() => reload()}
                    className="mt-2 text-xs font-semibold text-red-700 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <footer className="border-t border-gray-200 bg-white p-4">
          {!user && !authLoading ? (
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-gray-600 mb-2">Please sign in to send messages</p>
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              {/* File preview section */}
              {showFilesPreview && files.length > 0 && (
                <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Attached Files ({files.length})</h3>
                    <button 
                      type="button"
                      onClick={clearFiles}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center bg-white p-1.5 rounded border border-gray-300 text-xs">
                        {file.type.startsWith('image/') ? (
                           <img src={URL.createObjectURL(file)} alt="preview" className="w-6 h-6 mr-2 rounded object-cover" />
                        ) : (
                           <span className="mr-1">{getFileIcon(file.type)}</span>
                        )}
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <span className="mx-1 text-gray-400">({formatFileSize(file.size)})</span>
                        <button 
                          type="button" 
                          onClick={() => removeFile(index)}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="relative">
                <ModelRecommendation
                  inputText={input}
                  onSelectRecommendation={handleSelectRecommendation}
                  currentProvider={selectedProvider}
                  currentModel={selectedModel}
                  showRecommendation={showModelRecommendation}
                  onClose={() => setShowModelRecommendation(false)}
                />
                
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setIsImageGenerationMode(!isImageGenerationMode)}
                    className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      isImageGenerationMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={isLoading || isGeneratingImage}
                  >
                    <Sparkles size={14} />
                    {isImageGenerationMode ? 'Image Mode' : 'Generate Image'}
                  </button>
                </div>

                <div className="relative flex items-center">
                  {/* File upload button - moved to the left side */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.flv,.mov,.mp4,.webm,.wmv,.3gp,.aac,.flac,.mp3,.m4a,.mpga,.opus,.pcm,.wav"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute left-2 p-2 text-gray-500 hover:text-gray-700 transition-colors z-10"
                    title="Attach files"
                    disabled={isLoading || isGeneratingImage}
                  >
                    <Paperclip size={18} />
                  </button>
                  
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    placeholder={editingMessage ? "Edit your message..." : isImageGenerationMode ? "Describe the image you want to generate..." : files.length > 0 ? "Add a message with your files..." : "Type your message..."}
                    className="w-full p-3 pl-10 pr-40 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() || files.length > 0) {
                          handleSubmit(e);
                        }
                      }
                    }}
                  />
                  
                  <div className="absolute right-14 bottom-2.5">
                    <InlineModelSelector
                      currentProvider={selectedProvider}
                      currentModel={selectedModel}
                      onSelect={handleModelSelect}
                      models={modelsForSelector}
                    />
                  </div>
                  
                  {/* Add Stop Generation button when AI is responding */}
                  {(isLoading || isGeneratingImage) && (
                    <button
                      type="button"
                      onClick={isLoading ? handleStopGeneration : () => { /* Add image cancel logic if needed */ }}
                      className="absolute right-14 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                      title="Stop generating"
                    >
                      <X size={18} />
                    </button>
                  )}
                  
                  <button
                    id="chat-form-submit-button"
                    type="submit"
                    disabled={(!input.trim() && files.length === 0 && !isImageGenerationMode) || isLoading || isGeneratingImage}
                    className="absolute right-2 p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading || isGeneratingImage ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : editingMessage ? (
                      <Check size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <div className="flex items-center">
                  {status === 'ready' && !isGeneratingImage ? 'Ready' : 'Processing...'}
                  {files.length > 0 && (
                    <span className="ml-2">• {files.length} file(s) attached</span>
                  )}
                </div>
                <div>
                  Model: {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
                </div>
              </div>
            </form>
          )}
        </footer>
        
        {/* Share Modal */}
        <ShareModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          threadId={threadId}
          currentUser={user}
        />
      </main>
    </div>
  );
};

export default Chat; 
