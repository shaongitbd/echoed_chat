import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, X, Send, Sparkles, Code, PenSquare, Image, MessageSquare, Github, Mail } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [input, setInput] = useState('');

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
                onClick={handleInputFocus}
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
                
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate('/login?provider=github')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 border border-gray-300 rounded-lg text-center font-medium hover:bg-gray-50 transition-all duration-200 text-gray-800 text-sm"
                  >
                    <Github size={16} />
                    <span>GitHub</span>
                  </button>
                  
                  <button
                    onClick={() => navigate('/login?provider=google')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 border border-gray-300 rounded-lg text-center font-medium hover:bg-gray-50 transition-all duration-200 text-gray-800 text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="mr-0.5">
                      <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                      <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                      <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                      <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
                    </svg>
                    <span>Google</span>
                  </button>
                </div>
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