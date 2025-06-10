import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, GitBranch, Sparkles, Calendar, MessageCircle, ArrowRight } from 'lucide-react';
import { appwriteService } from '../../lib/appwrite';
import { useChat } from '../../contexts/ChatContext';

const ChatBranching = ({ threadId }) => {
  const navigate = useNavigate();
  const { createChatThread } = useChat();
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [originalThread, setOriginalThread] = useState(null);
  const [branchStats, setBranchStats] = useState({});
  
  // Load branches when component mounts
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setIsLoading(true);
        
        // Get original thread
        const thread = await appwriteService.getChatThread(threadId);
        setOriginalThread(thread);
        
        // Get all threads with the same parent (branches of the current thread)
        const threadsResponse = await appwriteService.getUserChatThreads(thread.createdBy);
        const relatedThreads = threadsResponse.documents.filter(t => 
          t.$id !== threadId && t.title.includes(thread.title)
        );
        
        setBranches(relatedThreads);
        
        // Load message counts for each branch
        const stats = {};
        await Promise.all(
          [...relatedThreads, thread].map(async (t) => {
            const messagesResponse = await appwriteService.getMessages(t.$id);
            stats[t.$id] = {
              messageCount: messagesResponse.documents.length,
              lastUpdated: t.updatedAt || t.createdAt
            };
          })
        );
        
        setBranchStats(stats);
      } catch (error) {
        console.error('Error loading branches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (threadId) {
      loadBranches();
    }
  }, [threadId]);
  
  // Create a new branch from the current thread
  const handleCreateBranch = async () => {
    try {
      // Get current thread
      const currentThread = await appwriteService.getChatThread(threadId);
      
      // Create new thread with reference to parent
      const newThread = await createChatThread(
        `${currentThread.title} (branch ${branches.length + 1})`
      );
      
      // Get messages from current thread
      const messages = await appwriteService.getMessages(threadId);
      
      // Copy messages to new thread
      for (const message of messages.documents) {
        await appwriteService.createMessage(
          newThread.$id,
          message.sender,
          message.content,
          {
            contentType: message.contentType,
            model: message.model,
            provider: message.provider,
            fileIds: message.fileIds,
            searchMetadata: message.searchMetadata
          }
        );
      }
      
      // Navigate to new thread
      navigate(`/chat/${newThread.$id}`);
      
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };
  
  // Navigate to a branch
  const handleSelectBranch = (branchId) => {
    navigate(`/chat/${branchId}`);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  if (isLoading) {
    return (
      <div className="p-4 border-b bg-gray-50">
        <div className="animate-pulse h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  return (
    <div className="p-4 border-b bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium flex items-center">
          <GitBranch size={16} className="mr-2" />
          Conversation Branches
        </h3>
        <button
          onClick={handleCreateBranch}
          className="text-sm px-3 py-1 bg-black text-white rounded-md flex items-center"
        >
          <Sparkles size={14} className="mr-1" />
          New Branch
        </button>
      </div>
      
      {/* Branch Visualization */}
      <div className="mb-4 overflow-x-auto pb-2">
        <div className="flex items-center min-w-max">
          {/* Original thread node */}
          <div 
            className="flex flex-col items-center"
            onClick={() => handleSelectBranch(threadId)}
          >
            <div className={`
              w-32 p-2 rounded-md border-2 cursor-pointer
              ${threadId === originalThread?.$id ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'}
            `}>
              <div className="text-xs font-medium truncate">Main Thread</div>
              <div className="text-xs opacity-75 flex items-center mt-1">
                <MessageCircle size={10} className="mr-1" />
                {branchStats[threadId]?.messageCount || 0}
              </div>
            </div>
          </div>
          
          {branches.length > 0 && (
            <>
              {/* Connector */}
              <div className="mx-2 text-gray-400">
                <ArrowRight size={20} />
              </div>
              
              {/* Branches */}
              <div className="flex flex-col space-y-2">
                {branches.map((branch, index) => (
                  <div
                    key={branch.$id}
                    onClick={() => handleSelectBranch(branch.$id)}
                    className={`
                      w-48 p-2 rounded-md border-2 cursor-pointer
                      ${threadId === branch.$id ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-400'}
                    `}
                  >
                    <div className="text-xs font-medium truncate">{branch.title}</div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs opacity-75 flex items-center">
                        <MessageCircle size={10} className="mr-1" />
                        {branchStats[branch.$id]?.messageCount || 0}
                      </div>
                      <div className="text-xs opacity-75 flex items-center">
                        <Calendar size={10} className="mr-1" />
                        {formatDate(branchStats[branch.$id]?.lastUpdated || branch.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      {branches.length === 0 ? (
        <div className="text-sm text-gray-500">
          No branches yet. Create one to explore different conversation paths.
        </div>
      ) : (
        <div className="space-y-2 mt-4 border-t pt-2">
          <h4 className="text-xs font-medium text-gray-500">All Branches</h4>
          {branches.map(branch => (
            <button
              key={branch.$id}
              onClick={() => handleSelectBranch(branch.$id)}
              className="w-full text-left p-2 rounded-md hover:bg-gray-100 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{branch.title}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-2">
                  <span className="flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {formatDate(branch.createdAt)}
                  </span>
                  <span className="flex items-center">
                    <MessageCircle size={12} className="mr-1" />
                    {branchStats[branch.$id]?.messageCount || 0} messages
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatBranching; 