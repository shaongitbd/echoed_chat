import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, X, Send, Sparkles, Code, PenSquare, Image, MessageSquare, Github, Mail, Paperclip, FileText, Music, Film, GitFork, Share2, ArrowRightLeft, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { appwriteService } from '../lib/appwrite';
import { toast } from 'sonner';
import InlineModelSelector from '../components/Chat/InlineModelSelector';

const Home = () => {
  const navigate = useNavigate();
  const { user, isLoading, loginAsGuest } = useAuth();
  const { userSettings } = useSettings();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [input, setInput] = useState('');
  const [isCheckingPreferences, setIsCheckingPreferences] = useState(true);
  const [showPreferencesPrompt, setShowPreferencesPrompt] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [availableModels, setAvailableModels] = useState([]);
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false);
  const [files, setFiles] = useState([]);
  const [showFilesPreview, setShowFilesPreview] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-login as guest if no user is detected after auth check completes
  useEffect(() => {
    const handleAutoGuestLogin = async () => {
      // Only attempt auto-login once, and only after auth loading is complete
      if (!isLoading && !user && !autoLoginAttempted) {
        setAutoLoginAttempted(true);
        console.log('No authenticated user detected, attempting guest login');
        try {
          await loginAsGuest();
          console.log('Guest login successful');
          toast.info('We\'ve set up a guest account for you to test things out. Your data will be saved, but for full features, consider signing up.');
        } catch (error) {
          console.error('Auto guest login failed:', error);
          // Don't show a toast here to avoid confusing the user
        }
      }
    };

    handleAutoGuestLogin();
  }, [user, isLoading, loginAsGuest, autoLoginAttempted]);

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

      // Set default provider and model from user settings
      if (userSettings.defaultProvider) {
        setSelectedProvider(userSettings.defaultProvider);
      }
      if (userSettings.defaultModel) {
        setSelectedModel(userSettings.defaultModel);
      }
    }
  }, [userSettings]);

  const modelsForSelector = useMemo(() => {
    if (isImageGenerationMode) {
      // Filter for models that have the 'image' capability
      return availableModels.filter(m => m.capabilities.includes('image'));
    }
    // For text mode, filter for models that have 'text' capability
    return availableModels.filter(m => m.capabilities.includes('text'));
  }, [availableModels, isImageGenerationMode]);

  useEffect(() => {
    // When switching modes, if the current model is not capable, switch to the first available one.
    const currentModelIsValid = modelsForSelector.some(m => m.id === selectedModel && m.provider === selectedProvider);

    if (!currentModelIsValid && modelsForSelector.length > 0) {
      const firstValidModel = modelsForSelector[0];
      setSelectedProvider(firstValidModel.provider);
      setSelectedModel(firstValidModel.id);
    }
  }, [isImageGenerationMode, modelsForSelector, selectedModel, selectedProvider]);

  const currentModelInfo = useMemo(() => {
    return availableModels.find(m => m.id === selectedModel && m.provider === selectedProvider);
  }, [availableModels, selectedProvider, selectedModel]);

  // Handle model selection
  const handleModelSelect = (provider, model) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };

  // Check if the user has set their preferences
  useEffect(() => {
    const checkUserPreferences = async () => {
      if (user) {
        try {
          setIsCheckingPreferences(true);
          const userProfile = await appwriteService.getUserProfile(user.$id);
          
          // Check if user has preferences set
          if (!userProfile.preferences || 
              typeof userProfile.preferences === 'string' && userProfile.preferences === '{}' ||
              typeof userProfile.preferences === 'object' && 
              (!userProfile.preferences.providers || userProfile.preferences.providers.length === 0)) {
            
            console.log('User has no preferences set, showing setup prompt');
            setShowPreferencesPrompt(true);
          }
        } catch (error) {
          console.error('Error checking user preferences:', error);
          toast.error('Failed to load your preferences');
        } finally {
          setIsCheckingPreferences(false);
        }
      } else {
        setIsCheckingPreferences(false);
      }
    };
    
    checkUserPreferences();
  }, [user]);

  const handleInputFocus = () => {
    // Don't show login modal if user exists (including anonymous users)
    if (!user) {
      // This should never happen now due to auto guest login,
      // but keeping as a fallback
      setShowLoginModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
  };
  
  // --- File Handling Functions ---
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    
    if (newFiles.length > 0) {
      setShowFilesPreview(true);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    if (newFiles.length === 0) {
      setShowFilesPreview(false);
    }
  };
  
  const clearFiles = () => {
    setFiles([]);
    setShowFilesPreview(false);
  };
  
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image size={16} />;
    if (fileType.startsWith('video/')) return <Film size={16} />;
    if (fileType.startsWith('audio/')) return <Music size={16} />;
    return <FileText size={16} />;
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  // --- End File Handling ---

  const handleStartChat = async (e) => {
    e.preventDefault();

    if (!user) {
      // This should never happen now due to auto guest login,
      // but keeping as a fallback
      handleInputFocus();
      return;
    }

    if (!input.trim() && files.length === 0) return;
    
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select an AI model first.');
      return;
    }

    const intent = isImageGenerationMode ? 'image' : 'chat';
    const originalInput = input;
    const originalFiles = files;

    // Reset UI immediately
    setInput('');
    clearFiles();
    
    try {
      let title = '';
      if (intent === 'image') {
        title = `Image: ${originalInput.substring(0, 40)}...`;
      } else if (originalFiles.length > 0) {
        title = `Attachment: ${originalFiles[0].name}`;
      } else {
        title = originalInput.substring(0, 50);
      }

      toast.info('Creating new chat...');
      
      const newThread = await appwriteService.createChatThread(
        user.$id,
        title,
        selectedProvider,
        selectedModel
      );
      const currentThreadId = newThread.$id;

      if (intent === 'image') {
        // 1. Save the user's text prompt to the new thread.
        await appwriteService.createMessage(currentThreadId, user.$id, originalInput, {
            contentType: 'text', model: selectedModel, provider: selectedProvider,
        });

        // 2. Call the API to generate the image. This requires the same payload as in Chat.jsx
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: 'image',
            prompt: originalInput,
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
        
        if (!images || images.length === 0) throw new Error('AI did not return an image.');

        // 3. Save the generated image as the assistant's response.
        await appwriteService.createMessage(currentThreadId, 'assistant', images[0].base64, {
          contentType: 'image',
          mimeType: images[0].mimeType,
          imagePrompt: originalInput,
          model: selectedModel,
          provider: selectedProvider,
        });
        
        // 4. Navigate to the chat, which will now show the prompt and the image.
        navigate(`/chat/${currentThreadId}`);

      } else { // Handle text and file attachments
        let attachmentsForDb = [];
        if (originalFiles.length > 0) {
          toast.info(`Uploading ${originalFiles.length} file(s)...`);
          const uploadPromises = originalFiles.map(file => appwriteService.uploadFile(file));
          attachmentsForDb = await Promise.all(uploadPromises);
          toast.success('Upload complete!');
        }

        await appwriteService.createMessage(
          currentThreadId,
          user.$id,
          originalInput,
          {
            contentType: 'text',
            model: selectedModel,
            provider: selectedProvider,
            attachments: attachmentsForDb.map(att => JSON.stringify(att)),
            hasAttachments: attachmentsForDb.length > 0,
            attachmentCount: attachmentsForDb.length,
            attachmentTypes: attachmentsForDb.length > 0 ? attachmentsForDb.map(f => f.contentType).join(',') : undefined,
          }
        );

        navigate(`/chat/${currentThreadId}?autoResponse=true`, { replace: true });
      }

    } catch (error) {
      console.error('Failed to start new chat:', error);
      toast.error(error.message || 'Could not start a new chat. Please try again.');
      // Restore input if chat creation failed
      setInput(originalInput);
      setFiles(originalFiles);
    }
  };

  // Determine if we should show a loading state
  const showLoadingState = isLoading || isCheckingPreferences;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Show loading state or content based on auth status */}
        {showLoadingState ? (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
           
            
            {/* Hero section */}
            <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16 max-w-5xl mx-auto w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Chat with AI Assistants
              </h2>
              <p className="text-lg text-gray-600 text-center mb-8 max-w-2xl">
                Explore, create, and collaborate with multiple AI models in one place.
              </p>
              
              {/* Chat input */}
              <div className="w-full max-w-3xl mx-auto mb-8">
                <form onSubmit={handleStartChat} className="relative">
                  <div className="flex items-center mb-2">
                    <div className="flex-1 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsImageGenerationMode(false)}
                        className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                          !isImageGenerationMode
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <MessageSquare size={16} className="mr-1.5" />
                        Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsImageGenerationMode(true)}
                        className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                          isImageGenerationMode
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Image size={16} className="mr-1.5" />
                        Image
                      </button>
                    </div>
                    
                    <InlineModelSelector
                      models={modelsForSelector}
                      currentProvider={selectedProvider}
                      currentModel={selectedModel}
                      onSelect={handleModelSelect}
                    />
                  </div>
                  
                  {showFilesPreview && (
                    <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {files.length} {files.length === 1 ? 'file' : 'files'} attached
                        </span>
                        <button
                          type="button"
                          onClick={clearFiles}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center bg-white px-2 py-1 rounded border text-sm"
                          >
                            {getFileIcon(file.type)}
                            <span className="mx-1.5 truncate max-w-[120px]">{file.name}</span>
                            <span className="text-gray-400 text-xs mr-1">
                              {formatFileSize(file.size)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFocus={handleInputFocus}
                      placeholder={isImageGenerationMode ? "Describe the image you want to create..." : "Ask anything..."}
                      className="w-full px-4 py-3 pr-24 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    
                    {!isImageGenerationMode && (
                      <div className="absolute right-16">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          multiple
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-gray-400 hover:text-gray-600"
                          title="Attach files"
                        >
                          <Paperclip size={18} />
                        </button>
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      className="absolute right-3 p-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                      title={isImageGenerationMode ? "Generate image" : "Send message"}
                    >
                      {isImageGenerationMode ? <Sparkles size={18} /> : <Send size={18} />}
                    </button>
                  </div>
                </form>
              </div>
              
              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                <FeatureHighlight
                  icon={<Sparkles size={24} />}
                  title="Multiple AI Models"
                  description="Access GPT-4, Claude, and more - all in one place."
                />
                <FeatureHighlight
                  icon={<Code size={24} />}
                  title="Code Generation"
                  description="Generate and explain code in various programming languages."
                />
                <FeatureHighlight
                  icon={<PenSquare size={24} />}
                  title="Content Creation"
                  description="Create blog posts, stories, marketing copy, and more."
                />
                <FeatureHighlight
                  icon={<Image size={24} />}
                  title="Image Generation"
                  description="Create images from text descriptions with DALL-E and Stable Diffusion."
                />
                <FeatureHighlight
                  icon={<GitFork size={24} />}
                  title="Conversation Branches"
                  description="Explore different responses without starting over."
                />
                <FeatureHighlight
                  icon={<Share2 size={24} />}
                  title="Share Conversations"
                  description="Collaborate by sharing conversations with others."
                />
              </div>
            </section>
            
            {/* Footer */}
            <footer className="py-6 px-6 border-t">
              <div className="flex flex-col md:flex-row items-center justify-between max-w-5xl mx-auto">
                <div className="mb-4 md:mb-0">
                  <p className="text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Echoed.Chat. All rights reserved.
                  </p>
                </div>
                <div className="flex space-x-4">
                  <a href="https://github.com" className="text-gray-500 hover:text-gray-700">
                    <Github size={20} />
                  </a>
                  <a href="mailto:info@example.com" className="text-gray-500 hover:text-gray-700">
                    <Mail size={20} />
                  </a>
                </div>
              </div>
            </footer>
          </>
        )}
      </main>
      
      {/* Login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Sign in to continue</h2>
            <p className="mb-6 text-gray-600">
              Please sign in or create an account to start chatting with AI assistants.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  handleCloseModal();
                  navigate('/login');
                }}
                className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  handleCloseModal();
                  navigate('/register');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Create account
              </button>
            </div>
            <button
              onClick={handleCloseModal}
              className="mt-4 w-full text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Preferences prompt */}
      {showPreferencesPrompt && user && !isCheckingPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Set up your preferences</h2>
            <p className="mb-6 text-gray-600">
              To get the most out of Echoed.Chat, let's set up your AI model preferences.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowPreferencesPrompt(false);
                  navigate('/model-selection');
                }}
                className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Set up now
              </button>
              <button
                onClick={() => setShowPreferencesPrompt(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Feature highlight component
const FeatureHighlight = ({ icon, title, description }) => (
  <div className="bg-gray-900 p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mb-4 ">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
    <p className="text-white">{description}</p>
  </div>
);

export default Home; 