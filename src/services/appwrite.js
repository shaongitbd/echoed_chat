import { Client, Account, Databases, Query } from 'appwrite';

// Initialize Appwrite client
export const client = new Client();

client
  .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.REACT_APP_APPWRITE_PROJECT_ID || '');

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);

// Database and collection IDs
export const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || '';
export const USERS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_USERS_COLLECTION_ID || '';
export const THREADS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_THREADS_COLLECTION_ID || '';
export const MESSAGES_COLLECTION_ID = process.env.REACT_APP_APPWRITE_MESSAGES_COLLECTION_ID || '';

// Authentication functions
export const createAccount = async (email, password, name) => {
  try {
    const newAccount = await account.create('unique()', email, password, name);
    
    if (newAccount.$id) {
      // Default values for preferences and usage stats
      const preferences = {
        providers: [
          {
            name: 'openai',
            enabled: true,
            apiKey: '',
            models: [
              { id: 'gpt-4o', enabled: true, capabilities: ['text'] },
              { id: 'gpt-3.5-turbo', enabled: true, capabilities: ['text'] },
            ],
          },
        ],
      };
      
      const usageStats = {
        textQueries: 0,
        imageGeneration: 0,
        videoGeneration: 0
      };

      // Create user profile in the database
      await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        newAccount.$id,
        {
          email,
          name,
          preferences: JSON.stringify(preferences),
          plan: 'free',
          usageStats: JSON.stringify(usageStats)
        }
      );
    }
    
    return newAccount;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

export const signIn = async (email, password) => {
  try {
    return await account.createEmailSession(email, password);
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    return await account.deleteSession('current');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const checkSession = async () => {
  try {
    // Get the current session
    const session = await account.getSession('current');
    console.log('Current session:', session);
    return session;
  } catch (error) {
    console.log('No active session found:', error);
    return null;
  }
};

export const getCurrentUser = async () => {
  console.log('getCurrentUser: Starting function');
  try {
    // First check if we have a session
    try {
      console.log('getCurrentUser: Checking for active session');
      const session = await account.getSession('current');
      console.log('getCurrentUser: Session found', session);
    } catch (error) {
      console.log('getCurrentUser: No active session found:', error);
      return null;
    }
    
    // If we get here, we have a session
    console.log('getCurrentUser: Getting account details');
    const currentAccount = await account.get();
    console.log('getCurrentUser: Account details retrieved', currentAccount);
    
    if (currentAccount.$id) {
      try {
        // Get user profile from database
        console.log(`getCurrentUser: Getting user profile for ID ${currentAccount.$id}`);
        const userProfile = await databases.getDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          currentAccount.$id
        );
        console.log('getCurrentUser: User profile retrieved', userProfile);
        
        // Safely parse JSON fields
        let preferences = {};
        try {
          preferences = userProfile.preferences
            ? JSON.parse(userProfile.preferences)
            : { providers: [] };
          console.log('getCurrentUser: Parsed preferences', preferences);
        } catch (e) {
          console.warn(
            'Could not parse user preferences:',
            userProfile.preferences
          );
          preferences = { providers: [] };
        }

        let usageStats = {};
        try {
          usageStats = userProfile.usageStats ? JSON.parse(userProfile.usageStats) : { textQueries: 0, imageGeneration: 0, videoGeneration: 0 };
          console.log('getCurrentUser: Parsed usageStats', usageStats);
        } catch (e) {
          console.warn('Could not parse user usageStats:', userProfile.usageStats);
          usageStats = { textQueries: 0, imageGeneration: 0, videoGeneration: 0 };
        }
        
        const userWithProfile = {
          ...currentAccount,
          ...userProfile,
          preferences,
          usageStats
        };
        console.log('getCurrentUser: Returning user with profile', userWithProfile);
        return userWithProfile;
      } catch (error) {
        console.error('getCurrentUser: Error getting user profile:', error);
        // Return just the account info if we can't get the profile
        console.log('getCurrentUser: Returning account info only', currentAccount);
        return currentAccount;
      }
    }
    
    console.log('getCurrentUser: Returning account info', currentAccount);
    return currentAccount;
  } catch (error) {
    console.error('getCurrentUser: Error getting current user:', error);
    return null;
  }
};

// Thread functions
export const createThread = async (userId, title) => {
  try {
    const threadData = {
      createdBy: userId,
      title,
      participants: JSON.stringify([userId]),
      isShared: false,
      shareSettings: JSON.stringify({
        public: false,
        invitedUsers: []
      })
    };

    return await databases.createDocument(
      DATABASE_ID,
      THREADS_COLLECTION_ID,
      'unique()',
      threadData
    );
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

export const getThreads = async (userId) => {
  try {
    console.log('Getting threads for user:', userId);
    
    // Query by createdBy instead of userId to match the schema
    const response = await databases.listDocuments(
      DATABASE_ID,
      THREADS_COLLECTION_ID,
      [
        Query.equal('createdBy', userId),
        Query.orderDesc('$updatedAt')
      ]
    );
    
    console.log('Threads response:', response);
    
    // Parse JSON fields for each thread
    return response.documents.map(thread => ({
      ...thread,
      participants: thread.participants ? JSON.parse(thread.participants) : [],
      shareSettings: thread.shareSettings ? JSON.parse(thread.shareSettings) : {}
    }));
  } catch (error) {
    console.error('Error getting threads:', error);
    throw error;
  }
};

export const getThread = async (threadId) => {
  try {
    const thread = await databases.getDocument(
      DATABASE_ID,
      THREADS_COLLECTION_ID,
      threadId
    );
    
    // Get messages for this thread
    const messages = await getMessages(threadId);
    
    // Parse JSON fields
    const parsedThread = {
      ...thread,
      participants: thread.participants ? JSON.parse(thread.participants) : [],
      shareSettings: thread.shareSettings ? JSON.parse(thread.shareSettings) : {},
      messages
    };

    return parsedThread;
  } catch (error) {
    console.error('Error getting thread:', error);
    throw error;
  }
};

export const deleteThread = async (threadId) => {
  try {
    // Delete all messages in the thread first
    const messages = await getMessages(threadId);
    
    for (const message of messages) {
      await databases.deleteDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        message.$id
      );
    }
    
    // Delete the thread
    return await databases.deleteDocument(
      DATABASE_ID,
      THREADS_COLLECTION_ID,
      threadId
    );
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
};

// Message functions
export const createMessage = async (threadId, role, content, contentType = 'text', model = '', provider = '', fileIds = [], searchMetadata = null) => {
  try {
    const messageData = {
      threadId,
      role,
      content,
      contentType,
      model,
      provider,
      fileIds: JSON.stringify(fileIds),
      searchMetadata: searchMetadata ? JSON.stringify(searchMetadata) : null,
      isEdited: false
    };

    const message = await databases.createDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      'unique()',
      messageData
    );
    
    // Update thread to trigger Appwrite's automatic $updatedAt update
    await databases.updateDocument(
      DATABASE_ID,
      THREADS_COLLECTION_ID,
      threadId,
      {
        // Empty update to trigger $updatedAt refresh
      }
    );
    
    return message;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
};

export const getMessages = async (threadId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      [
        Query.equal('threadId', threadId),
        Query.orderAsc('$createdAt')
      ]
    );
    
    // Parse JSON fields for each message
    return response.documents.map(message => ({
      ...message,
      fileIds: message.fileIds ? JSON.parse(message.fileIds) : [],
      searchMetadata: message.searchMetadata ? JSON.parse(message.searchMetadata) : null
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// User preferences functions
export const updateUserPreferences = async (userId, preferences) => {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        preferences: JSON.stringify(preferences),
      }
    );
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

export const getUserPreferences = async (userId) => {
  try {
    const user = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );

    try {
      return user.preferences
        ? JSON.parse(user.preferences)
        : { providers: [] };
    } catch (e) {
      console.warn('Could not parse user preferences:', user.preferences);
      return { providers: [] };
    }
  } catch (error) {
    console.error('Error getting user preferences:', error);
    throw error;
  }
}; 