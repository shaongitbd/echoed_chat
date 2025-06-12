import { Client, Account, Databases, Storage, Query, ID, Permission, Role } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.REACT_APP_APPWRITE_PROJECT_ID || '');

// Initialize Appwrite services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Database and collection IDs
const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'chatbot';
const USERS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_USERS_COLLECTION_ID || 'users';
const CHAT_THREADS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_THREADS_COLLECTION_ID || 'chat-threads';
const MESSAGES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_MESSAGES_COLLECTION_ID || 'messages';
const FILES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_FILES_COLLECTION_ID || 'files';
const attachmentsBucketId = process.env.REACT_APP_APPWRITE_ATTACHMENTS_BUCKET_ID;

// Service class to handle all Appwrite operations
class AppwriteService {
  // Authentication methods
  async createAccount(email, password, name) {
    try {
      const response = await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      
      if (response.$id) {
        // Create user profile
        await this.createUserProfile( name, email);
        
      }
      
      return response;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      return await account.createEmailSession(email, password);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async logout() {
    try {
      return await account.deleteSession('current');
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }

  async updateUserName(name) {
    try {
      // First update the Appwrite account name
      const user = await account.updateName(name);
      
      // Then update the user profile in our database through the backend
      const jwt = await this.getJWT();
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          name
        })
      });
      
      const data = await response.json();
      
      // Throw error even for 2xx status codes if the response indicates an error
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to update user name');
      }
      
      return {
        ...user,
        profile: data
      };
    } catch (error) {
      console.error('Error updating user name:', error);
      throw new Error(`Failed to update user name: ${error.message}`);
    }
  }

  async updateUserPassword(newPassword, oldPassword) {
    try {
      return await account.updatePassword(newPassword, oldPassword);
    } catch (error) {
      console.error('Error updating user password:', error);
      // Appwrite often returns a helpful message
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async updatePassword(password, oldPassword) {
    try {
      return await account.updatePassword(password, oldPassword);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  async sendPasswordRecovery(email) {
    try {
      return await account.createRecovery(email, `${window.location.origin}/reset-password`);
    } catch (error) {
      console.error('Error sending password recovery:', error);
      throw error;
    }
  }

  async completePasswordRecovery(userId, secret, password, passwordAgain) {
    try {
      return await account.updateRecovery(userId, secret, password, passwordAgain);
    } catch (error) {
      console.error('Error completing password recovery:', error);
      throw error;
    }
  }

  // Helper method to get JWT token
  async getJWT() {
    try {
      const jwt = await account.createJWT();
      if (!jwt || !jwt.jwt) {
        throw new Error('Failed to create JWT token');
      }
      return jwt.jwt; // Return the actual JWT string, not the whole object
    } catch (error) {
      console.error('Error getting JWT token:', error);
      throw new Error('Authentication failed. Please log in again.');
    }
  }

  // User profile methods
  async createUserProfile( name, email) {
    try {
      // Get the JWT token from the current session
      const jwt = await this.getJWT();
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          name,
          email
        })
      });
      
      const data = await response.json();
      
      // Throw error even for 2xx status codes if the response indicates an error
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create user profile');
      }
      
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, data) {
    try {
      // Only allow updating preferences through the backend
      if (data.preferences) {
        return await this.updateUserPreferences(userId, data.preferences);
      }
      
      console.warn('Direct profile updates are not allowed. Use updateUserPreferences instead.');
      throw new Error('Direct profile updates are not allowed. Use updateUserPreferences instead.');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getUserSettings(userId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(userId, data) {
    try {
      // Only allow updating preferences through the backend
      if (data.preferences) {
        return await this.updateUserPreferences(userId, data.preferences);
      }
      
      console.warn('Direct settings updates are not allowed. Use updateUserPreferences instead.');
      throw new Error('Direct settings updates are not allowed. Use updateUserPreferences instead.');
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      // Get the JWT token from the current session
      const jwt = await this.getJWT();
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          preferences
        })
      });
      
      const data = await response.json();
      
      // Throw error even for 2xx status codes if the response indicates an error
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to update user preferences');
      }
      
      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Chat thread methods
  async createChatThread(userId, title = 'New Chat', defaultProvider = 'openai', defaultModel = 'gpt-4o', branchData = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required to create a chat thread');
      }
      
      const threadData = {
        title,
        createdBy: userId,
        participants: [userId], // Initialize participants array with the creator
        isShared: false,
        shareSettings: JSON.stringify({
          public: false,
          invitedUsers: []
        }),
        defaultProvider,
        defaultModel,
        ...branchData
      };
      
      const permissions = [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId))
      ];

      const response = await databases.createDocument(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        ID.unique(),
        threadData,
        permissions
      );
      
      console.log('Thread created successfully:', response);
      return response;
      
    } catch (error) {
      console.error('Error in createChatThread:', error);
      throw new Error(`Failed to create chat thread: ${error.message}`);
    }
  }

  async getChatThread(threadId) {
    try {
      console.log(`AppwriteService.getChatThread called for thread: ${threadId}`);
      
      const thread = await databases.getDocument(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        threadId
      );
      
      console.log('Thread found:', thread);
      return thread;
    } catch (error) {
      console.error(`Error getting chat thread ${threadId}:`, error);
      throw error;
    }
  }

  async updateChatThread(threadId, data) {
    try {
      if (!threadId) {
        throw new Error('Thread ID is required');
      }
      
      // Get the current thread to preserve its permissions
      const thread = await this.getChatThread(threadId);
      const permissions = thread.$permissions || [];
      
      // Update the thread document
      const response = await databases.updateDocument(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        threadId,
        data,
        permissions
      );
      
      return response;
    } catch (error) {
      console.error('Error updating chat thread:', error);
      throw error;
    }
  }

  async deleteChatThread(threadId) {
    try {
      console.log(`Starting deletion of thread: ${threadId}`);
      
      // Get all messages in this thread with a large limit to avoid pagination issues
      const messages = await this.getMessages(threadId, null, 5000); // Increased limit
      console.log(`Found ${messages.documents.length} messages to delete in thread ${threadId}`);
      
      // Handle message deletion in batches to avoid overwhelming the server
      const batchSize = 50;
      for (let i = 0; i < messages.documents.length; i += batchSize) {
        const batch = messages.documents.slice(i, i + batchSize);
        const deletePromises = batch.map(async (message) => {
          try {
            await this.deleteMessage(message.$id);
            return { success: true, id: message.$id };
          } catch (err) {
            console.error(`Failed to delete message ${message.$id}:`, err);
            return { success: false, id: message.$id, error: err };
          }
        });
        
        const results = await Promise.all(deletePromises);
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          console.warn(`Failed to delete ${failures.length} messages`, failures);
        }
        
        console.log(`Deleted batch ${i/batchSize + 1}/${Math.ceil(messages.documents.length/batchSize)}`);
      }
      
      // Now delete the thread
      console.log(`Deleting thread document: ${threadId}`);
      const result = await databases.deleteDocument(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        threadId
      );
      
      console.log(`Thread ${threadId} deletion completed`);
      return result;
    } catch (error) {
      console.error('Error deleting chat thread:', error);
      throw error;
    }
  }

  async getUserChatThreads(userId) {
    if (!userId) {
      console.log('No user ID provided, returning empty array.');
      return { documents: [], total: 0 };
    }
    
    try {
      const cleanUserId = Array.isArray(userId) ? userId[0] : userId;
      
      // First, get threads created by the user
      const ownedThreads = await databases.listDocuments(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        [
          Query.equal('createdBy', cleanUserId),
          Query.orderDesc('$updatedAt'),
        ]
      );
      
      // Get all threads that are shared (we'll filter for the current user later)
      const sharedThreads = await databases.listDocuments(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        [
          Query.equal('isShared', true),
          Query.notEqual('createdBy', cleanUserId), // Exclude threads they created (already in ownedThreads)
          Query.orderDesc('$updatedAt'),
        ]
      );
      
      // Filter shared threads to only include those where the user is a participant
      const userSharedThreads = sharedThreads.documents.filter(thread => {
        // Check if user is in participants
        if (thread.participants) {
          // Handle array format
          if (Array.isArray(thread.participants)) {
            return thread.participants.includes(cleanUserId);
          }
          
          // Handle string format (JSON array)
          if (typeof thread.participants === 'string') {
            try {
              const parsedParticipants = JSON.parse(thread.participants);
              return Array.isArray(parsedParticipants) && parsedParticipants.includes(cleanUserId);
            } catch (e) {
              console.error('Error parsing participants:', e);
              return false;
            }
          }
        }
        
        // Also check shareSettings as a fallback
        if (thread.shareSettings) {
          try {
            const settings = JSON.parse(thread.shareSettings);
            if (settings.invitedUsers && Array.isArray(settings.invitedUsers)) {
              return settings.invitedUsers.some(user => user.userId === cleanUserId);
            }
          } catch (e) {
            console.error('Error parsing shareSettings:', e);
          }
        }
        
        return false;
      });
      
      // Combine the results
      const allThreads = {
        documents: [...ownedThreads.documents, ...userSharedThreads],
        total: ownedThreads.total + userSharedThreads.length
      };
      
      // Sort combined results by updatedAt (newest first)
      allThreads.documents.sort((a, b) => {
        return new Date(b.$updatedAt) - new Date(a.$updatedAt);
      });
      
      console.log(`Found ${ownedThreads.total} owned threads and ${userSharedThreads.length} shared threads`);
      return allThreads;
    } catch (error) {
      console.error('Error getting user chat threads:', error);
      // Return empty result instead of throwing error to prevent infinite loops
      return { documents: [] };
    }
  }

  async getBranchesForThread(parentThreadId) {
    if (!parentThreadId) return { documents: [], total: 0 };
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        [
          Query.equal('branchedFromThread', parentThreadId),
          Query.orderDesc('$createdAt')
        ]
      );
    } catch (error) {
      console.error(`Error getting branches for thread ${parentThreadId}:`, error);
      throw error;
    }
  }

  async shareChatThread(threadId, users = [], isPublic = false) {
    try {
      const thread = await this.getChatThread(threadId);
      
      // Parse existing participants
      let participants = [];
      if (thread.participants) {
        // Handle both string and array formats
        if (typeof thread.participants === 'string') {
          try {
            participants = JSON.parse(thread.participants);
          } catch (e) {
            console.error('Error parsing participants string:', e);
            participants = [];
          }
        } else if (Array.isArray(thread.participants)) {
          participants = thread.participants;
        }
      }
      
      // Add the thread creator if not already in participants
      if (thread.createdBy && !participants.includes(thread.createdBy)) {
        participants.push(thread.createdBy);
      }
      
      // Create new shareSettings object
      const shareSettings = {
        public: isPublic,
        invitedUsers: users.map(user => ({
          userId: user.userId,
          email: user.email,
          name: user.name || '',
          role: user.role || 'viewer'
        }))
      };
      
      // Add new users to participants
      const newUserIds = users.map(u => u.userId).filter(Boolean);
      const updatedParticipants = [...new Set([...participants, ...newUserIds])];
      
      // Prepare permissions
      const permissions = [
        ...(thread.$permissions || []),
        ...newUserIds.map(userId => Permission.read(Role.user(userId)))
      ];
      
      // Update the thread
      return await databases.updateDocument(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        threadId,
        {
          isShared: true,
          shareSettings: JSON.stringify(shareSettings),
          participants: updatedParticipants
        },
        permissions
      );
    } catch (error) {
      console.error('Error sharing chat thread:', error);
      throw error;
    }
  }

  // Message methods
  async createMessage(threadId, sender, content, options = {}) {
    try {
      const {
        contentType = 'text',
        model = '',
        provider = '',
        attachments = [],
        parentMessageId = '',
        searchMetadata = null,
        contextLength = 0,
        tokensUsed = 0
      } = options;
      
      // Get the thread to copy its permissions
      const thread = await this.getChatThread(threadId);
      
      // Apply the same permissions as the thread
      const permissions = thread.$permissions || [];
      
      const message = await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(),
        {
          threadId,
          sender,
          content,
          contentType,
          model,
          provider,
          attachments,
          parentMessageId: parentMessageId || null,
          isEdited: false,
          searchMetadata,
          contextLength,
          tokensUsed
        },
        permissions // Apply thread permissions to message
      );
      
      // Update the thread to trigger Appwrite's automatic $updatedAt refresh
      await this.updateChatThread(threadId, {
        // Empty update to trigger $updatedAt refresh
      });
      
      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async getMessages(threadId, parentMessageId = null, limit = 100) {
    try {
      console.log(`AppwriteService.getMessages called for thread: ${threadId}, parentMessageId: ${parentMessageId}, limit: ${limit}`);
      
      const queries = [
        Query.equal('threadId', threadId),
        Query.orderAsc('$createdAt'),
        Query.limit(limit)
      ];
      
      if (parentMessageId !== null) {
        queries.push(Query.equal('parentMessageId', parentMessageId));
      } else {
        queries.push(Query.isNull('parentMessageId'));
      }
      
      console.log('Executing query with:', queries);
      
      const result = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        queries
      );
      
      console.log(`AppwriteService.getMessages found ${result.documents.length} messages`);
      
      if (result.documents.length === 0) {
        console.log('No messages found. Checking if thread exists...');
        try {
          const thread = await this.getChatThread(threadId);
          console.log('Thread exists:', thread);
        } catch (threadError) {
          console.error('Error checking thread:', threadError);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  async getMessage(messageId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        messageId
      );
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  async updateMessage(messageId, data) {
    try {
      return await databases.updateDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        messageId,
        {
          ...data,
          isEdited: true
        }
      );
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId) {
    try {
      const message = await this.getMessage(messageId);
      
      // Delete all child messages first
      const childMessages = await this.getMessages(message.threadId, messageId);
      const deletePromises = childMessages.documents.map(childMessage => 
        this.deleteMessage(childMessage.$id)
      );
      
      await Promise.all(deletePromises);
      
      return await databases.deleteDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        messageId
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // File methods
  async uploadFile(file) {
    if (!attachmentsBucketId) {
      throw new Error('Appwrite attachments bucket ID is not configured. Please set REACT_APP_APPWRITE_ATTACHMENTS_BUCKET_ID in your .env file.');
    }
    try {
      const response = await storage.createFile(attachmentsBucketId, ID.unique(), file);
      const fileUrl = storage.getFileView(response.bucketId, response.$id);
      
      return {
        name: file.name,
        contentType: file.type,
        url: fileUrl.href, // Use the public URL of the file
        fileId: response.$id,
        bucketId: response.bucketId,
      };
    } catch (error) {
      console.error('Error uploading file to Appwrite:', error);
      throw error;
    }
  }

  async getFile(fileId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        FILES_COLLECTION_ID,
        fileId
      );
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async getFilePreview(bucketId, fileId) {
    try {
      return storage.getFilePreview(bucketId, fileId);
    } catch (error) {
      console.error('Error getting file preview:', error);
      throw error;
    }
  }

  async getFileDownload(bucketId, fileId) {
    try {
      return storage.getFileDownload(bucketId, fileId);
    } catch (error) {
      console.error('Error getting file download:', error);
      throw error;
    }
  }

  async deleteFile(fileId, bucketId) {
    try {
      // Delete file from storage
      await storage.deleteFile(bucketId, fileId);
      
      // Delete file document
      return await databases.deleteDocument(
        DATABASE_ID,
        FILES_COLLECTION_ID,
        fileId
      );
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async shareThreadPublic(threadId) {
    try {
      // Get the current thread
      const thread = await this.getChatThread(threadId);
      
      // Add a public read permission to the thread document
      const permissions = [
        ...thread.$permissions || [],
        Permission.read(Role.any())  // Allow any user to read
      ];
      
      // Ensure we don't have duplicate permissions
      const uniquePermissions = [...new Set(permissions)];
      
      // Update the thread with public permissions
      const response = await databases.updateDocument(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        threadId,
        {
          isShared: true,
          shareSettings: JSON.stringify({
            public: true,
            invitedUsers: JSON.parse(thread.shareSettings || '{"invitedUsers":[]}').invitedUsers || []
          })
        },
        uniquePermissions
      );
      
      // Update all messages to have public read access
      await this.updateMessagePermissions(threadId, [...uniquePermissions]);
      
      return response;
    } catch (error) {
      console.error('Error sharing thread publicly:', error);
      throw error;
    }
  }
  
  async makeThreadPrivate(threadId) {
    try {
      // Get the current thread
      const thread = await this.getChatThread(threadId);
      const createdBy = thread.createdBy;
      
      // Filter out the public read permission
      const filteredPermissions = (thread.$permissions || []).filter(
        permission => permission !== `read("any")`
      );
      
      // Ensure the owner still has full permissions
      const permissions = [
        ...filteredPermissions,
        Permission.read(Role.user(createdBy)),
        Permission.update(Role.user(createdBy)),
        Permission.delete(Role.user(createdBy))
      ];
      
      // Update thread with private permissions
      const response = await databases.updateDocument(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        threadId,
        {
          isShared: false,
          shareSettings: JSON.stringify({
            public: false,
            invitedUsers: JSON.parse(thread.shareSettings || '{"invitedUsers":[]}').invitedUsers || []
          })
        },
        permissions
      );
      
      // Update all messages to have the same permissions
      await this.updateMessagePermissions(threadId, permissions);
      
      return response;
    } catch (error) {
      console.error('Error making thread private:', error);
      throw error;
    }
  }
  
  async shareThreadWithUser(threadId, emailToShare) {
    try {
      // Try to find the user by email
      const usersList = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('email', emailToShare)]
      );
      
      if (usersList.documents.length === 0) {
        throw new Error('User not found');
      }
      
      const userToShare = usersList.documents[0];
      
      // Get the current thread
      const thread = await this.getChatThread(threadId);
      
      // Parse existing share settings
      let shareSettings = { public: false, invitedUsers: [] };
      try {
        shareSettings = JSON.parse(thread.shareSettings || '{}');
        if (!shareSettings.invitedUsers) {
          shareSettings.invitedUsers = [];
        }
      } catch (e) {
        console.error('Error parsing share settings:', e);
      }
      
      // Check if user is already invited
      const userAlreadyInvited = shareSettings.invitedUsers.some(
        user => user.email === emailToShare
      );
      
      if (!userAlreadyInvited) {
        // Add user to invited users
        shareSettings.invitedUsers.push({
          userId: userToShare.$id,
          email: emailToShare,
          name: userToShare.name || '',
          role: 'viewer'
        });
      }
      
      // Call the backend endpoint to update permissions
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const token = await this.getJWT();
      
      const response = await fetch(`${backendUrl}/api/threads/${threadId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shareSettings: JSON.stringify(shareSettings),
          userToShareId: userToShare.$id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share thread');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sharing thread with user:', error);
      throw error;
    }
  }
  
  async getSharedUsers(threadId) {
    try {
      // Get the thread
      const thread = await this.getChatThread(threadId);
      
      // Get the owner's info
      const owner = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        thread.createdBy
      );
      
      // Parse share settings
      let shareSettings = { invitedUsers: [] };
      try {
        shareSettings = JSON.parse(thread.shareSettings || '{}');
      } catch (e) {
        console.error('Error parsing share settings:', e);
      }
      
      // Build users list with owner first
      const users = [
        {
          userId: owner.$id,
          email: owner.email,
          name: owner.name,
          role: 'owner',
          isOwner: true
        },
        ...shareSettings.invitedUsers
      ];
      
      return users;
    } catch (error) {
      console.error('Error getting shared users:', error);
      throw error;
    }
  }
  
  async removeThreadAccess(threadId, userId) {
    try {
      // Call the backend endpoint to remove user access
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const token = await this.getJWT();
      
      const response = await fetch(`${backendUrl}/api/threads/${threadId}/share/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove thread access');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error removing thread access:', error);
      throw error;
    }
  }

  async getUser(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );
      
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Update permissions for all messages in a thread
   * @param {string} threadId - The thread ID
   * @param {Array} permissions - The permissions to apply
   * @returns {Promise<void>}
   */
  async updateMessagePermissions(threadId, permissions) {
    try {
      // Get all messages for this thread
      const messages = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        [Query.equal('threadId', threadId)]
      );
      
      // Update permissions for each message
      const updatePromises = messages.documents.map(message => 
        databases.updateDocument(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          message.$id,
          {}, // No need to update content, just permissions
          permissions
        )
      );
      
      await Promise.all(updatePromises);
      console.log(`Updated permissions for ${messages.documents.length} messages in thread ${threadId}`);
    } catch (error) {
      console.error(`Error updating message permissions for thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Get pricing plans from the Appwrite database
   * @returns {Promise<Array>} - Array of pricing plans
   */
  async getPricingPlans() {
    try {
      const PRICING_COLLECTION_ID = process.env.REACT_APP_APPWRITE_PRICING_COLLECTION_ID || '684ae4820033917267e3';
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        PRICING_COLLECTION_ID
      );
      
      if (!response || !response.documents) {
        console.warn('No pricing plans found');
        return [];
      }
      
      return response.documents;
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      throw error;
    }
  }
}

export const appwriteService = new AppwriteService();
export { client, account, databases, storage }; 