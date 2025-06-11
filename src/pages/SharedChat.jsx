import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bot, User, Image as ImageIcon, Loader2, ExternalLink, Menu, X } from 'lucide-react';
import { appwriteService } from '../lib/appwrite';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

const SharedChat = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [threadOwner, setThreadOwner] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const [usersMap, setUsersMap] = useState({});
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Load thread and messages
  useEffect(() => {
    const loadSharedChat = async () => {
      if (!threadId) {
        setError('Invalid thread ID');
        setIsLoading(false);
        return;
      }
      
      try {
        // Load the thread
        const threadData = await appwriteService.getChatThread(threadId);
        setThread(threadData);
        
        // Check if thread is public or if the current user has access
        const isPublic = threadData.$permissions && threadData.$permissions.includes('read("any")');
        const shareSettings = JSON.parse(threadData.shareSettings || '{}');
        
        let hasAccess = isPublic;
        
        // If not public, check if the user has specific access
        if (!hasAccess && user) {
          const isOwner = threadData.createdBy === user.$id;
          const isInvited = shareSettings.invitedUsers && 
            shareSettings.invitedUsers.some(u => u.userId === user.$id || u.email === user.email);
          
          hasAccess = isOwner || isInvited;
        }
        
        if (!hasAccess) {
          setError('You do not have access to this chat');
          setIsLoading(false);
          return;
        }
        
        // Build a map of user IDs to names
        const userMap = {};
        
        // Try to load the owner's info
        try {
          const ownerData = await appwriteService.getUser(threadData.createdBy);
          setThreadOwner(ownerData);
          userMap[threadData.createdBy] = {
            name: ownerData.name || 'Thread Owner',
            email: ownerData.email || '',
            isOwner: true
          };
        } catch (ownerError) {
          console.error('Error fetching thread owner:', ownerError);
          userMap[threadData.createdBy] = { name: 'Thread Owner', isOwner: true };
        }
        
        // Add invited users to the map
        if (shareSettings.invitedUsers && shareSettings.invitedUsers.length > 0) {
          shareSettings.invitedUsers.forEach(invitedUser => {
            if (invitedUser.userId) {
              userMap[invitedUser.userId] = {
                name: invitedUser.name || invitedUser.email || 'Invited User',
                email: invitedUser.email || '',
                isOwner: false
              };
            }
          });
        }
        
        setUsersMap(userMap);
        
        // Load messages
        const messagesData = await appwriteService.getMessages(threadId);
        
        // Format messages for display
        const formattedMessages = messagesData.documents.map(msg => {
          // Check if this is an AI assistant message
          const isAssistant = msg.sender === 'assistant';
          
          // Get user info if this is a user message
          const userInfo = isAssistant ? null : userMap[msg.sender] || { name: 'Unknown User' };
          
          return {
            id: msg.$id,
            role: isAssistant ? 'assistant' : 'user',
            sender: isAssistant ? 'AI Assistant' : userInfo.name,
            senderId: msg.sender,
            isThreadOwner: !isAssistant && userInfo.isOwner,
            content: msg.content,
            contentType: msg.contentType,
            createdAt: msg.$createdAt,
            model: msg.model,
            provider: msg.provider,
            attachments: (msg.attachments || []).map(att => {
              try {
                return JSON.parse(att);
              } catch (e) {
                return { url: att };
              }
            })
          };
        });
        
        setMessages(formattedMessages);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading shared chat:', err);
        setError('Failed to load shared chat');
        setIsLoading(false);
      }
    };
    
    loadSharedChat();
  }, [threadId, user]);
  
  // Render message content
  const renderMessageContent = (message) => {
    // If the message from appwrite has contentType image, render it
    if (message.contentType === 'image') {
      return (
        <img 
          src={`data:image/png;base64,${message.content}`} 
          alt="Generated Image" 
          className="rounded-lg"
        />
      );
    }
    
    // Render a grid of user-uploaded images
    const userImageAttachments = (message.attachments || []).filter(
      att => att.contentType?.startsWith('image/')
    );
    
    return (
      <div>
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
        
        {message.content && (
          <ReactMarkdown
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const codeText = String(children).replace(/\n$/, '');
                
                return !inline && match ? (
                  <div className="relative bg-[#2e3440] rounded-md my-2">
                    <div className="flex items-center justify-between px-4 py-1 bg-[#3b4252] text-xs text-gray-300 rounded-t-md">
                      <span>{language}</span>
                    </div>
                    <SyntaxHighlighter style={nord} language={language} PreTag="div" {...props}>{codeText}</SyntaxHighlighter>
                  </div>
                ) : (
                  <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded-sm font-mono text-sm" {...props}>{children}</code>
                );
              },
              p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    );
  };
  
  // Render messages
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-2">No messages in this chat</h2>
          <p className="text-gray-500 max-w-sm">
            This shared conversation doesn't have any messages yet.
          </p>
        </div>
      );
    }
    
    return messages.map((message) => (
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
          
          <div className={`relative ${message.role === 'user' ? 'text-right' : ''}`}>
            <span className="absolute top-0 -mt-5 text-xs text-gray-500 font-medium px-1">
              {message.sender}
              {message.isThreadOwner && " (Owner)"}
            </span>
          
            <div className={`px-4 py-3 rounded-lg prose prose-sm max-w-none ${
              message.role === 'user'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {renderMessageContent(message)}
            </div>
          </div>
        </div>
      </div>
    ));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-gray-400 mb-4" />
          <p className="text-gray-600">Loading shared chat...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Access Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  if (!thread) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <h1 className="text-xl font-bold mb-2">Chat Not Found</h1>
          <p className="text-gray-600">This shared chat could not be found or has been deleted.</p>
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
      <Sidebar showMobileMenu={showMobileMenu} onCloseMobileMenu={() => setShowMobileMenu(false)} />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col bg-white">
        {/* Chat header */}
        <header className="border-b border-gray-200 py-3 px-4 sm:px-6 flex justify-between items-center bg-white shadow-sm">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-800">
              {thread.title}
            </h1>
            <div className="flex items-center text-xs text-gray-500">
              <span>
                Shared by {threadOwner ? threadOwner.name : 'Unknown'} • 
                {' '}{formatDistanceToNow(new Date(thread.$updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          {!user && (
            <a 
              href="/login" 
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Sign in <ExternalLink size={14} />
            </a>
          )}
        </header>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderMessages()}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Footer - Read-only notice */}
        <footer className="border-t border-gray-200 py-3 px-4 bg-white">
          <p className="text-center text-sm text-gray-500">
            This is a read-only view of a shared chat conversation.
            {!user && " Sign in to create your own conversations."}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default SharedChat; 