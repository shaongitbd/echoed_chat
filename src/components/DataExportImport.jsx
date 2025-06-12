import React, { useState, useRef } from 'react';
import { Download, Upload, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import { appwriteService, databases } from '../lib/appwrite';

const DataExportImport = ({ user }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Function to export threads and messages
  const handleExport = async () => {
    if (!user) {
      toast.error('You must be logged in to export data');
      return;
    }

    setIsExporting(true);

    try {
      // Get the database and collection IDs
      const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'chatbot';
      const CHAT_THREADS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_THREADS_COLLECTION_ID || 'chat-threads';
      const MESSAGES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_MESSAGES_COLLECTION_ID || 'messages';
      
      // Get all threads for the current user
      const threadsResponse = await databases.listDocuments(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        [Query.equal('createdBy', user.$id)]
      );

      const threads = threadsResponse.documents;
      
      if (threads.length === 0) {
        toast.info('No conversations found to export');
        setIsExporting(false);
        return;
      }

      // For each thread, get all messages
      const exportData = {
        threads: [],
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      for (const thread of threads) {
        // Get messages for this thread
        const messagesResponse = await databases.listDocuments(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          [Query.equal('threadId', thread.$id)]
        );

        const messages = messagesResponse.documents;

        // Prepare thread data for export
        const threadData = {
          id: thread.$id,
          title: thread.title,
          createdBy: thread.createdBy,
          isShared: thread.isShared || false,
          shareSettings: typeof thread.shareSettings === 'string' 
            ? JSON.parse(thread.shareSettings) 
            : thread.shareSettings || {},
          lastMessageAt: thread.$updatedAt,
          defaultProvider: thread.defaultProvider,
          defaultModel: thread.defaultModel,
          branchedFromThread: thread.branchedFromThread || null,
          branchedFromMessage: thread.branchedFromMessage || null,
          messages: messages.map(msg => ({
            id: msg.$id,
            sender: msg.sender,
            content: msg.content,
            contentType: msg.contentType,
            model: msg.model,
            provider: msg.provider,
            parentMessageId: msg.parentMessageId || null,
            isEdited: msg.isEdited || false,
            searchMetadata: msg.searchMetadata || null,
            tokensUsed: msg.tokensUsed || 0,
            contextLength: msg.contextLength || 0,
            fileIds: typeof msg.fileIds === 'string' 
              ? JSON.parse(msg.fileIds) 
              : msg.fileIds || [],
            attachments: typeof msg.attachments === 'string' 
              ? JSON.parse(msg.attachments) 
              : msg.attachments || [],
            createdAt: msg.$createdAt
          }))
        };

        exportData.threads.push(threadData);
      }

      // Create and download the JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Conversations exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error(`Error exporting data: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Function to trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Function to import threads and messages
  const handleImport = async (e) => {
    if (!user) {
      toast.error('You must be logged in to import data');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast.error('Please upload a valid JSON file');
      return;
    }

    setIsImporting(true);

    try {
      // Read the file
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          // Validate the import data structure
          if (!importData.threads || !Array.isArray(importData.threads)) {
            throw new Error('Invalid import file format');
          }

          // Import each thread and its messages
          for (const threadData of importData.threads) {
            // Create a new thread
            const newThread = await appwriteService.createChatThread(
              user.$id,
              threadData.title || 'Imported Chat',
              threadData.defaultProvider || 'openai',
              threadData.defaultModel || 'gpt-4o',
              {
                isShared: false, // Reset sharing settings for safety
                shareSettings: JSON.stringify({
                  public: false,
                  invitedUsers: []
                }),
                // Don't preserve branch information as IDs will be different
              }
            );

            // Create messages for this thread
            if (threadData.messages && Array.isArray(threadData.messages)) {
              // Sort messages by creation date to maintain order
              const sortedMessages = [...threadData.messages].sort((a, b) => 
                new Date(a.createdAt) - new Date(b.createdAt)
              );

              // Create a map to track old message IDs to new message IDs for parent references
              const messageIdMap = {};

              for (const msgData of sortedMessages) {
                // Ensure the sender is preserved exactly as it was in the original message
                // This should be either "user" or "assistant" in most cases
                const sender = msgData.sender || (msgData.content.includes('user:') ? 'user' : 'assistant');
                
                // Create the message
                const messageOptions = {
                  contentType: msgData.contentType || 'text',
                  model: msgData.model || '',
                  provider: msgData.provider || '',
                  attachments: msgData.attachments || [],
                  // Map the old parent ID to the new one if it exists
                  parentMessageId: msgData.parentMessageId ? messageIdMap[msgData.parentMessageId] || null : null,
                  searchMetadata: msgData.searchMetadata || null,
                  contextLength: msgData.contextLength || 0,
                  tokensUsed: msgData.tokensUsed || 0
                };

                console.log(`Importing message with sender: ${sender}, content: ${msgData.content.substring(0, 50)}...`);

                const newMessage = await appwriteService.createMessage(
                  newThread.$id,
                  sender,
                  msgData.content,
                  messageOptions
                );

                // Store the mapping from old ID to new ID
                messageIdMap[msgData.id] = newMessage.$id;
              }
            }
          }

          toast.success(`Successfully imported ${importData.threads.length} conversations`);
        } catch (parseError) {
          console.error('Error parsing import file:', parseError);
          toast.error(`Failed to parse import file: ${parseError.message}`);
        } finally {
          setIsImporting(false);
          // Clear the file input
          e.target.value = null;
        }
      };

      reader.onerror = () => {
        toast.error('Error reading the file');
        setIsImporting(false);
        e.target.value = null;
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error(`Failed to import conversations: ${error.message}`);
      setIsImporting(false);
      e.target.value = null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Data Export & Import</h3>
        <p className="text-sm text-gray-600 mb-6">
          Export your conversations to backup or share, and import conversations from other users
        </p>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Export Section */}
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-2">Export Your Conversations</h4>
              <p className="text-sm text-gray-500 mb-4">
                Download all your conversations as a JSON file that you can backup or share with others
              </p>
              
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Conversations
                  </>
                )}
              </button>
            </div>
            
            {/* Import Section */}
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-base font-medium text-gray-900 mb-2">Import Conversations</h4>
              <p className="text-sm text-gray-500 mb-4">
                Import conversations from a JSON file that was previously exported
              </p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept="application/json"
                className="hidden"
              />
              
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isImporting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Conversations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Import/Export Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Exported files contain all your conversations and messages in JSON format.
                When importing, conversations will be recreated with new IDs while preserving the message structure.
                Note that file attachments are not included in exports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExportImport; 