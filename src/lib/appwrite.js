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
const USER_SETTINGS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_USER_SETTINGS_COLLECTION_ID || 'user-settings';
const USAGE_LIMITS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_USAGE_LIMITS_COLLECTION_ID || 'usage-limits';
const INVITATIONS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_INVITATIONS_COLLECTION_ID || 'invitations';
const MEMORIES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_MEMORIES_COLLECTION_ID || 'memories';
const ANNOTATIONS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_ANNOTATIONS_COLLECTION_ID || 'annotations';

// Storage bucket IDs
const PROFILE_IMAGES_BUCKET_ID = process.env.REACT_APP_APPWRITE_PROFILE_IMAGES_BUCKET_ID || 'profile-images';
const CHAT_ATTACHMENTS_BUCKET_ID = process.env.REACT_APP_APPWRITE_CHAT_ATTACHMENTS_BUCKET_ID || 'chat-attachments';
const GENERATED_CONTENT_BUCKET_ID = process.env.REACT_APP_APPWRITE_GENERATED_CONTENT_BUCKET_ID || 'generated-content';

// A placeholder for your attachments bucket ID.
// IMPORTANT: Make sure to set this in your .env file.
const attachmentsBucketId = process.env.REACT_APP_APPWRITE_ATTACHMENTS_BUCKET_ID;

// Service class to handle all Appwrite operations
class AppwriteService {
  // Authentication methods
  async createAccount(email, password, name) {
    try {
      const response = await account.create(ID.unique(), email, password, name);
      
      if (response.$id) {
        // Create user profile
        await this.createUserProfile(response.$id, name, email);
        
        // No longer setting default preferences automatically
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

  async loginWithOAuth(provider) {
    try {
      return await account.createOAuth2Session(provider);
    } catch (error) {
      console.error(`Error logging in with ${provider}:`, error);
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

  async sendEmailVerification() {
    try {
      return await account.createVerification(`${window.location.origin}/verify-email`);
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }

  async completeEmailVerification(userId, secret) {
    try {
      return await account.updateVerification(userId, secret);
    } catch (error) {
      console.error('Error completing email verification:', error);
      throw error;
    }
  }

  // User profile methods
  async createUserProfile(userId, name, email) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        {
          name,
          email,
          plan: 'free',
          usageStats: {
            textQueries: 0,
            imageGeneration: 0,
            videoGeneration: 0
          }
        }
      );
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
      return await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        data
      );
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async incrementUsage(userId, type, amount = 1) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const usageStats = userProfile.usageStats || {};
      
      if (type === 'textQueries') {
        usageStats.textQueries = (usageStats.textQueries || 0) + amount;
      } else if (type === 'imageGeneration') {
        usageStats.imageGeneration = (usageStats.imageGeneration || 0) + amount;
      } else if (type === 'videoGeneration') {
        usageStats.videoGeneration = (usageStats.videoGeneration || 0) + amount;
      }
      
      return await this.updateUserProfile(userId, { usageStats });
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  // User settings methods
  async createDefaultUserSettings(userId) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        userId,
        {
          providers: [
            {
              name: 'openai',
              enabled: true,
              apiKey: '', // Will be filled by user
              models: [
                {
                  id: 'gpt-4o',
                  enabled: true,
                  capabilities: ['text', 'image']
                },
                {
                  id: 'gpt-3.5-turbo',
                  enabled: true,
                  capabilities: ['text']
                }
              ]
            }
          ],
          defaultProvider: 'openai',
          defaultModel: 'gpt-4o',
          theme: 'system',
          notifications: {
            email: true,
            inApp: true
          },
          defaultSearchProvider: 'web'
        }
      );
    } catch (error) {
      console.error('Error creating default user settings:', error);
      throw error;
    }
  }

  async getUserSettings(userId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        userId
      );
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(userId, data) {
    try {
      return await databases.updateDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        userId,
        data
      );
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      // Get current settings
      const currentSettings = await this.getUserSettings(userId);
      
      // Update with new preferences
      return await this.updateUserSettings(userId, {
        ...currentSettings,
        ...preferences
      });
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
        participants: JSON.stringify([userId]),
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
      return true;
    } catch (error) {
      console.error('Error updating chat thread:', error);
      throw error;
    }
  }

  async deleteChatThread(threadId) {
    try {
      console.log(`Starting deletion of thread: ${threadId}`);
      
      // Get all messages in this thread with a large limit to avoid pagination issues
      const messages = await this.getMessages(threadId);
      console.log(`Found ${messages.documents.length} messages to delete in thread ${threadId}`);
      
      // Handle message deletion in batches to avoid overwhelming the server
      const batchSize = 20;
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
      const response = await databases.listDocuments(
        DATABASE_ID,
        CHAT_THREADS_COLLECTION_ID,
        [
          Query.equal('createdBy', cleanUserId),
          Query.orderDesc('$updatedAt'),
        ]
      );
      console.log('Threads response:', response);
      return response;
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
      
      // Parse existing participants from JSON string
      let participants = [];
      try {
        participants = JSON.parse(thread.participants || '[]');
      } catch (e) {
        console.error('Error parsing participants:', e);
        participants = [];
      }
      
      // Create new shareSettings object
      const shareSettings = {
        public: isPublic,
        invitedUsers: users.map(user => ({
          email: user.email,
          role: user.role || 'viewer'
        }))
      };
      
      // Add new users to participants
      const newUserIds = users.map(u => u.userId).filter(Boolean);
      const updatedParticipants = [...new Set([...participants, ...newUserIds])];
      
      return await this.updateChatThread(threadId, {
        isShared: true,
        shareSettings: JSON.stringify(shareSettings),
        participants: JSON.stringify(updatedParticipants)
      });
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
        }
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

  async getMessages(threadId, parentMessageId = null, limit = 1000) {
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

  // Usage limits methods
  async getUserUsageLimits(plan) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        USAGE_LIMITS_COLLECTION_ID,
        plan
      );
    } catch (error) {
      console.error('Error getting usage limits:', error);
      throw error;
    }
  }

  async checkUserUsage(userId) {
    try {
      const user = await this.getUserProfile(userId);
      const plan = user.plan || 'free';
      const usageLimits = await this.getUserUsageLimits(plan);
      const usageStats = user.usageStats || {};
      
      return {
        textQueries: {
          used: usageStats.textQueries || 0,
          limit: usageLimits.textQueries,
          remaining: usageLimits.textQueries - (usageStats.textQueries || 0)
        },
        imageGeneration: {
          used: usageStats.imageGeneration || 0,
          limit: usageLimits.imageGeneration,
          remaining: usageLimits.imageGeneration - (usageStats.imageGeneration || 0)
        },
        videoGeneration: {
          used: usageStats.videoGeneration || 0,
          limit: usageLimits.videoGeneration,
          remaining: usageLimits.videoGeneration - (usageStats.videoGeneration || 0)
        },
        webSearchEnabled: usageLimits.webSearchEnabled
      };
    } catch (error) {
      console.error('Error checking user usage:', error);
      throw error;
    }
  }

  // Invitation methods
  async createInvitation(threadId, invitedBy, invitedEmail, role = 'viewer') {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        INVITATIONS_COLLECTION_ID,
        ID.unique(),
        {
          threadId,
          invitedBy,
          invitedEmail,
          role,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          acceptedAt: null
        }
      );
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  async getInvitations(email) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        INVITATIONS_COLLECTION_ID,
        [
          Query.equal('invitedEmail', email),
          Query.equal('status', 'pending')
        ]
      );
    } catch (error) {
      console.error('Error getting invitations:', error);
      throw error;
    }
  }

  async updateInvitation(invitationId, status) {
    try {
      const data = {
        status
      };
      
      if (status === 'accepted') {
        data.acceptedAt = new Date().toISOString();
      }
      
      return await databases.updateDocument(
        DATABASE_ID,
        INVITATIONS_COLLECTION_ID,
        invitationId,
        data
      );
    } catch (error) {
      console.error('Error updating invitation:', error);
      throw error;
    }
  }

  // Memory methods
  async createMemory(data) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        MEMORIES_COLLECTION_ID,
        ID.unique(),
        {
          userId: data.userId,
          name: data.name,
          content: data.content,
          tags: data.tags || [],
          threadId: data.threadId || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        [
          Permission.read(Role.user(data.userId)),
          Permission.update(Role.user(data.userId)),
          Permission.delete(Role.user(data.userId))
        ]
      );
    } catch (error) {
      console.error('Error creating memory:', error);
      throw error;
    }
  }

  async getUserMemories(userId) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        MEMORIES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$updatedAt')
        ]
      );
    } catch (error) {
      console.error('Error getting user memories:', error);
      throw error;
    }
  }

  async getMemory(memoryId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        MEMORIES_COLLECTION_ID,
        memoryId
      );
    } catch (error) {
      console.error('Error getting memory:', error);
      throw error;
    }
  }

  async updateMemory(memoryId, data) {
    try {
      const updateData = {
        ...data
      };
      
      return await databases.updateDocument(
        DATABASE_ID,
        MEMORIES_COLLECTION_ID,
        memoryId,
        updateData
      );
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId) {
    try {
      return await databases.deleteDocument(
        DATABASE_ID,
        MEMORIES_COLLECTION_ID,
        memoryId
      );
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }

  async searchMemoriesByTags(userId, tags) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        MEMORIES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          ...tags.map(tag => Query.search('tags', tag))
        ]
      );
    } catch (error) {
      console.error('Error searching memories by tags:', error);
      throw error;
    }
  }

  async searchMemoriesByContent(userId, query) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        MEMORIES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.or([
            Query.search('name', query),
            Query.search('content', query)
          ])
        ]
      );
    } catch (error) {
      console.error('Error searching memories by content:', error);
      throw error;
    }
  }

  // Annotation methods
  async createAnnotation(data) {
    try {
      const annotation = await databases.createDocument(
        DATABASE_ID,
        ANNOTATIONS_COLLECTION_ID,
        ID.unique(),
        {
          messageId: data.messageId,
          threadId: data.threadId,
          userId: data.userId,
          userName: data.userName,
          text: data.text,
          content: data.content,
          startOffset: data.startOffset,
          endOffset: data.endOffset,
          color: data.color || '#FFEB3B' // Default yellow highlight
        },
        [
          // Message participants can read
          Permission.read(Role.any()),
          // Only creator can update/delete
          Permission.update(Role.user(data.userId)),
          Permission.delete(Role.user(data.userId))
        ]
      );
      
      return annotation;
    } catch (error) {
      console.error('Error creating annotation:', error);
      throw error;
    }
  }

  async getAnnotationsForMessage(messageId) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        ANNOTATIONS_COLLECTION_ID,
        [
          Query.equal('messageId', messageId),
          Query.orderAsc('startOffset')
        ]
      );
    } catch (error) {
      console.error('Error getting annotations for message:', error);
      throw error;
    }
  }

  async getAnnotationsForThread(threadId) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        ANNOTATIONS_COLLECTION_ID,
        [
          Query.equal('threadId', threadId),
          Query.orderDesc('$createdAt')
        ]
      );
    } catch (error) {
      console.error('Error getting annotations for thread:', error);
      throw error;
    }
  }

  async updateAnnotation(annotationId, data) {
    try {
      const updateData = {
        ...data
      };
      
      return await databases.updateDocument(
        DATABASE_ID,
        ANNOTATIONS_COLLECTION_ID,
        annotationId,
        updateData
      );
    } catch (error) {
      console.error('Error updating annotation:', error);
      throw error;
    }
  }

  async deleteAnnotation(annotationId) {
    try {
      return await databases.deleteDocument(
        DATABASE_ID,
        ANNOTATIONS_COLLECTION_ID,
        annotationId
      );
    } catch (error) {
      console.error('Error deleting annotation:', error);
      throw error;
    }
  }

  // Subscribe to real-time annotations
  subscribeToAnnotations(threadId, callback) {
    try {
      return client.subscribe(
        `databases.${DATABASE_ID}.collections.${ANNOTATIONS_COLLECTION_ID}.documents`, 
        (response) => {
          const annotation = response.payload;
          
          // Only trigger callback for annotations in this thread
          if (annotation.threadId === threadId) {
            callback(response);
          }
        }
      );
    } catch (error) {
      console.error('Error subscribing to annotations:', error);
      throw error;
    }
  }

  // Add these methods to the AppwriteService class
  async announceUserPresence(threadId, userId, userName) {
    try {
      // This would typically use a Realtime API or custom function
      // For now, we'll simulate it with a direct client.subscribe pattern
      client.send(
        `threads.${threadId}.presence`,
        {
          event: 'user.join',
          payload: {
            userId,
            userName,
            timestamp: new Date().toISOString()
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error announcing user presence:', error);
      throw error;
    }
  }

  async announceUserLeft(threadId, userId) {
    try {
      client.send(
        `threads.${threadId}.presence`,
        {
          event: 'user.leave',
          payload: {
            userId,
            timestamp: new Date().toISOString()
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error announcing user left:', error);
      throw error;
    }
  }

  async updateCursorPosition(threadId, userId, position) {
    try {
      client.send(
        `threads.${threadId}.presence`,
        {
          event: 'cursor.move',
          payload: {
            userId,
            position,
            timestamp: new Date().toISOString()
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error updating cursor position:', error);
      throw error;
    }
  }
}

export const appwriteService = new AppwriteService();
export { client, account, databases, storage }; 