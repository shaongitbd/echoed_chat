import { Router } from 'express';
import { Client, Databases } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Constants
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;

export const handleCreateUserProfile = async (req, res) => {
  try {
    // Use the authenticated user from the request
    const { userId, name, email } = req.body;
    
  
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields: name or email' });
    }
    
    const userProfile = await createUserProfile(userId, name, email);
    
    if (!userProfile || !userProfile.$id) {
      return res.status(500).json({ error: 'Failed to create user profile: Invalid response from database' });
    }
    
    return res.status(201).json(userProfile);
  } catch (error) {
    console.error('Error in handleCreateUserProfile:', error);
    return res.status(500).json({ error: `Failed to create user profile: ${error.message}` });
  }
};

/**
 * Creates a user profile in the database with read-only permissions
 */
async function createUserProfile(userId, name, email) {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        name,
        email,
        plan: 'free'
      },
      // Set permissions to read-only for the user
      [`read("user:${userId}")`]
    );
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

export const handleUpdateUserName = async (req, res) => {
  try {
    // Use the authenticated user from the request
    const userId = req.user.$id;
    const { name } = req.body;
    
    if (!userId) {
      console.error('No user ID found in authenticated request');
      return res.status(401).json({ error: 'Authentication error: No user ID found' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }
    
    // Get current user document
    try {
      const currentUser = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );
      
      if (!currentUser || !currentUser.$id) {
        return res.status(404).json({ error: 'User profile not found' });
      }
    } catch (docError) {
      console.error('Error fetching user document:', docError);
      return res.status(404).json({ error: 'User profile not found or inaccessible' });
    }
    
    // Update only the name field
    const updatedUser = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      { name },
      // Maintain existing permissions
      [`read("user:${userId}")`]
    );
    
    if (!updatedUser || !updatedUser.$id) {
      return res.status(500).json({ error: 'Failed to update user name: Invalid response from database' });
    }
    
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error in handleUpdateUserName:', error);
    return res.status(500).json({ error: `Failed to update user name: ${error.message}` });
  }
};

export const handleUpdateUserPreferences = async (req, res) => {
  try {
    // Use the authenticated user from the request
    const userId = req.user.$id;
    const { preferences } = req.body;
    
    if (!userId) {
      console.error('No user ID found in authenticated request');
      return res.status(401).json({ error: 'Authentication error: No user ID found' });
    }
    
    if (!preferences) {
      return res.status(400).json({ error: 'Missing required field: preferences' });
    }
    
    // Get current user document to ensure we only update preferences
    try {
      const currentUser = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );
      
      if (!currentUser || !currentUser.$id) {
        return res.status(404).json({ error: 'User profile not found' });
      }
    } catch (docError) {
      console.error('Error fetching user document:', docError);
      return res.status(404).json({ error: 'User profile not found or inaccessible' });
    }
    
    // Update only the preferences field
    const updatedUser = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      { preferences: JSON.stringify(preferences) },
      // Maintain existing permissions
      [`read("user:${userId}")`]
    );
    
    if (!updatedUser || !updatedUser.$id) {
      return res.status(500).json({ error: 'Failed to update user preferences: Invalid response from database' });
    }
    
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error in handleUpdateUserPreferences:', error);
    return res.status(500).json({ error: `Failed to update user preferences: ${error.message}` });
  }
}; 