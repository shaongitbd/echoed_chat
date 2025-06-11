import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, X, Send, Sparkles, Code, PenSquare, Image, MessageSquare, Github, Mail } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { appwriteService } from '../lib/appwrite';
import { toast } from 'sonner';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userSettings } = useSettings();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [input, setInput] = useState('');
  const [isCheckingPreferences, setIsCheckingPreferences] = useState(true);
  const [showPreferencesPrompt, setShowPreferencesPrompt] = useState(false);

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
  
  const handleStartChat = async () => {
    if (!input.trim()) return;

    if (!user) {
      handleInputFocus();
      return;
    }

    if (!userSettings?.defaultProvider || !userSettings?.defaultModel) {
      toast.error('Please set up your default AI model in settings first.');
      navigate('/model-selection');
      return;
    }

    try {
      // Store input locally before clearing it, so we still have a reference to it
      const messageContent = input.trim();
      
      // Reset input field immediately for better UX
      setInput('');
      
      toast.info('Creating new chat...');
      
      // Create thread with user's message as the title
      const newThread = await appwriteService.createChatThread(
        user.$id,
        messageContent.substring(0, 50),
        userSettings.defaultProvider,
        userSettings.defaultModel
      );

      // Add the first message to the thread
      await appwriteService.createMessage(
        newThread.$id,
        user.$id,
        messageContent,
        {
          contentType: 'text',
          model: userSettings.defaultModel,
          provider: userSettings.defaultProvider,
        }
      );

      // Navigate to the new chat with a parameter that signals 
      // we need to auto-generate a response
      navigate(`/chat/${newThread.$id}?autoResponse=true`, { replace: true });
    } catch (error) {
      console.error('Failed to start new chat:', error);
      toast.error('Could not start a new chat. Please try again.');
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
          <div className="w-full max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-md border border-gray-200/80 flex items-center p-2 gap-2 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="Message AI Chat..."
                className="flex-1 min-h-[40px] max-h-40 px-3 py-2 border-none focus:outline-none bg-transparent text-base placeholder:text-gray-500 resize-none"
                rows={1}
              />
              <button
                className={`p-2.5 rounded-lg text-white transition-all duration-200 ${input.trim() ? 'bg-gradient-to-r from-gray-900 to-gray-800 shadow-sm' : 'bg-gray-300'}`}
                onClick={handleStartChat}
                disabled={!input.trim()}
              >
                <Send size={16} />
              </button>
            </div>
            <div className="text-center mt-2">
              <p className="text-xs text-gray-500">
                AI Chat can make mistakes. Consider checking important information.
              </p>
            </div>
          </div>
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