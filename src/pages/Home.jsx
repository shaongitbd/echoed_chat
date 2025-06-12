import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, X, Send, Sparkles, Code, PenSquare, Image, MessageSquare, Github, Mail, Paperclip, FileText, Music, Film } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { appwriteService } from '../lib/appwrite';
import { toast } from 'sonner';
import InlineModelSelector from '../components/Chat/InlineModelSelector';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userSettings } = useSettings();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [input, setInput] = useState('');
  const [isCheckingPreferences, setIsCheckingPreferences] = useState(true);
  const [showPreferencesPrompt, setShowPreferencesPrompt] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [availableModels, setAvailableModels] = useState([]);
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false);
  const [files, setFiles] = useState([]);
  const [showFilesPreview, setShowFilesPreview] = useState(false);
  const fileInputRef = useRef(null);

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
    if (!user) {
      setShowLoginModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
  };
  
  const handleCloseMobileMenu = () => {
    setShowMobileMenu(false);
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

  const ExamplePrompt = ({ icon, text }) => (
    <button
      onClick={handleInputFocus}
      className="bg-white p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 w-full text-left"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-gray-700">{text}</span>
      </div>
    </button>
  );

  // Show loading state while checking preferences
  if (isCheckingPreferences && user) {
    return (
      <div className="flex h-screen bg-gray-50 font-sans items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <Sparkles size={32} className="text-white" />
          </div>
          <p className="mt-4 text-gray-600">Loading your preferences...</p>
        </div>
      </div>
    );
  }

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
      <Sidebar showMobileMenu={showMobileMenu} onCloseMobileMenu={handleCloseMobileMenu} />

      {/* Main content */}
      <main className="flex-1 flex flex-col bg-gray-50">
        {/* Header */}
        <header className="border-b border-gray-200 py-3 px-8 flex justify-between items-center bg-white shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-gray-800">AI Chat Interface</h1>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
            title="Settings"
          >
            <Settings size={15} className="text-gray-600" />
          </button>
        </header>

        {/* Welcome screen / Chat area */}
        <section className="flex-1 flex flex-col justify-center items-center p-8 overflow-y-auto">
          {showPreferencesPrompt && (
            <div className="w-full max-w-lg mb-8 bg-white p-6 rounded-lg border border-yellow-200 shadow-md">
              <div className="flex items-center justify-center mb-4">
                <Settings size={24} className="text-yellow-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Set Up AI Models</h3>
              </div>
              <p className="text-gray-600 mb-4 text-center">
                To start using the chat, you need to set up your AI model preferences first.
              </p>
              <button
                onClick={() => navigate('/model-selection')}
                className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Set Up Now
              </button>
            </div>
          )}
          
          <div className="w-full max-w-lg text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center mx-auto shadow-lg">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-6">
              How can I help you today?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <ExamplePrompt 
                icon={<MessageSquare size={18} className="text-gray-500" />}
                text="Explain quantum computing"
              />
              <ExamplePrompt 
                icon={<Code size={18} className="text-gray-500" />}
                text="Write a Python script for a task"
              />
              <ExamplePrompt 
                icon={<PenSquare size={18} className="text-gray-500" />}
                text="Draft an email for a job application"
              />
              <ExamplePrompt 
                icon={<Image size={18} className="text-gray-500" />}
                text="Create an image of a futuristic city"
              />
            </div>
          </div>
        </section>

        {/* Input area */}
        <footer className="px-8 py-4 bg-gray-50 border-t border-gray-200">
          <form onSubmit={handleStartChat} className="w-full max-w-3xl mx-auto">
            {showFilesPreview && files.length > 0 && (
              <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-white">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Attached Files ({files.length})</h3>
                  <button type="button" onClick={clearFiles} className="text-xs text-gray-500 hover:text-gray-700">Clear all</button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center bg-gray-50 p-1.5 rounded border border-gray-300 text-xs">
                      {file.type.startsWith('image/') ? (
                         <img src={URL.createObjectURL(file)} alt="preview" className="w-6 h-6 mr-2 rounded object-cover" />
                      ) : (
                         <span className="mr-1">{getFileIcon(file.type)}</span>
                      )}
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <span className="mx-1 text-gray-400">({formatFileSize(file.size)})</span>
                      <button type="button" onClick={() => removeFile(index)} className="ml-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setIsImageGenerationMode(!isImageGenerationMode)}
                className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  isImageGenerationMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Sparkles size={14} />
                {isImageGenerationMode ? 'Image Mode' : 'Generate Image'}
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200/80 flex items-center p-2 gap-2 relative">
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
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={handleInputFocus}
                placeholder={isImageGenerationMode ? "Describe the image you want to generate..." : "Message AI Chat..."}
                className="flex-1 min-h-[40px] max-h-40 px-3 py-2 border-none focus:outline-none bg-transparent text-base placeholder:text-gray-500 resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() || files.length > 0) {
                      handleStartChat(e);
                    }
                  }
                }}
              />
              <div className="mr-2">
                <InlineModelSelector
                  currentProvider={selectedProvider}
                  currentModel={selectedModel}
                  onSelect={handleModelSelect}
                  models={modelsForSelector}
                />
              </div>
              <button
                type="submit"
                className={`p-2.5 rounded-lg text-white transition-all duration-200 ${input.trim() || files.length > 0 ? 'bg-gradient-to-r from-gray-900 to-gray-800 shadow-sm' : 'bg-gray-300'}`}
                onClick={handleStartChat}
                disabled={!input.trim() && files.length === 0}
              >
                <Send size={16} />
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                AI Chat can make mistakes. Consider checking important information.
              </p>
              <div className="text-xs text-gray-500">
                Model: {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
              </div>
            </div>
          </form>
        </footer>
      </main>

      {/* Login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200 animate-fadeIn overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Welcome to AI Chat</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                >
                  <X size={15} className="text-gray-500" />
                </button>
              </div>
              <p className="mb-6 text-gray-600 text-sm leading-relaxed">
                Sign in or create an account to start chatting with our AI assistant.
              </p>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg text-center font-medium hover:from-gray-800 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all duration-200 shadow-sm text-sm"
                >
                  Sign in with Email
                </button>
                
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-center font-medium hover:bg-gray-50 transition-all duration-200 text-gray-800 text-sm"
                >
                  Create an account
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 