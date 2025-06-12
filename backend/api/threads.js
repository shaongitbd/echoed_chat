import express from 'express';
import { Client, Databases, Query, Permission, Role } from 'node-appwrite';

const router = express.Router();

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Constants
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const CHAT_THREADS_COLLECTION_ID = process.env.APPWRITE_CHAT_THREADS_COLLECTION_ID;
const CHAT_MESSAGES_COLLECTION_ID = process.env.APPWRITE_CHAT_MESSAGES_COLLECTION_ID;




/**
 * Update thread sharing permissions
 * @route POST /api/threads/:threadId/share
 */
router.post('/:threadId/share', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { shareSettings, userToShareId } = req.body;
    
    if (!threadId || !shareSettings || !userToShareId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get the current thread to verify ownership
    const thread = await databases.getDocument(
      DATABASE_ID,
      CHAT_THREADS_COLLECTION_ID,
      threadId
    );

    // Verify the requester is the owner of the thread
    if (thread.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to share this thread' });
    }

    // Add read permission for the user
    const permissions = [
      ...thread.$permissions || [],
      Permission.read(Role.user(userToShareId))
    ];
    
    // Update participants array
    let participants = [];
    if (thread.participants) {
      // If it's a string, parse it
      if (typeof thread.participants === 'string') {
        try {
          participants = JSON.parse(thread.participants);
        } catch (e) {
          console.error('Error parsing participants:', e);
          participants = [];
        }
      } else if (Array.isArray(thread.participants)) {
        participants = thread.participants;
      }
    }
    
    // Make sure the thread creator is in the participants list
    if (thread.createdBy && !participants.includes(thread.createdBy)) {
      participants.push(thread.createdBy);
    }
    
    // Only add the user if they're not already in the participants list
    if (!participants.includes(userToShareId)) {
      participants.push(userToShareId);
    }
    
    // Update the thread with new permissions and add user to participants
    const updatedThread = await databases.updateDocument(
      DATABASE_ID,
      CHAT_THREADS_COLLECTION_ID,
      threadId,
      {
        isShared: true,
        shareSettings: shareSettings,
        participants: participants
      },
      permissions
    );

    // Update all messages to have the same permissions
    // Get all messages for this thread
    const messages = await databases.listDocuments(
      DATABASE_ID,
      CHAT_MESSAGES_COLLECTION_ID,
      [Query.equal('threadId', threadId)]
    );

    // Update permissions for each message
    for (const message of messages.documents) {
      await databases.updateDocument(
        DATABASE_ID,
        CHAT_MESSAGES_COLLECTION_ID,
        message.$id,
        {}, // No need to update content, just permissions
        permissions
      );
    }

    return res.status(200).json(updatedThread);
  } catch (error) {
    console.error('Error updating thread sharing permissions:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Remove user access from a shared thread
 * @route DELETE /api/threads/:threadId/share/:userId
 */
router.delete('/:threadId/share/:userId', async (req, res) => {
  try {
    const { threadId, userId } = req.params;
    
    if (!threadId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get the current thread to verify ownership
    const thread = await databases.getDocument(
      DATABASE_ID,
      CHAT_THREADS_COLLECTION_ID,
      threadId
    );

    // Verify the requester is the owner of the thread
    if (thread.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this thread' });
    }

    // Parse share settings
    let shareSettings = { public: false, invitedUsers: [] };
    try {
      shareSettings = JSON.parse(thread.shareSettings || '{}');
    } catch (e) {
      console.error('Error parsing share settings:', e);
    }
    
    // Remove user from invited users
    shareSettings.invitedUsers = shareSettings.invitedUsers.filter(
      user => user.userId !== userId
    );
    
    // Remove user from participants array
    let participants = [];
    if (thread.participants) {
      // If it's a string, parse it
      if (typeof thread.participants === 'string') {
        try {
          participants = JSON.parse(thread.participants);
        } catch (e) {
          console.error('Error parsing participants:', e);
          participants = [];
        }
      } else if (Array.isArray(thread.participants)) {
        participants = thread.participants;
      }
      
      // Remove the user from participants but keep the creator
      participants = participants.filter(id => id !== userId || id === thread.createdBy);
      
      // Make sure the thread creator is in the participants list
      if (thread.createdBy && !participants.includes(thread.createdBy)) {
        participants.push(thread.createdBy);
      }
    }
    
    // Remove read permission for this user
    const permissions = (thread.$permissions || []).filter(
      permission => !permission.includes(`user:${userId}`) || permission.includes(`user:${thread.createdBy}`)
    );
    
    // Update the thread
    const updatedThread = await databases.updateDocument(
      DATABASE_ID,
      CHAT_THREADS_COLLECTION_ID,
      threadId,
      {
        shareSettings: JSON.stringify(shareSettings),
        participants: participants,
        isShared: shareSettings.public || shareSettings.invitedUsers.length > 0
      },
      permissions
    );

    // Update all messages to have the same permissions
    // Get all messages for this thread
    const messages = await databases.listDocuments(
      DATABASE_ID,
      CHAT_MESSAGES_COLLECTION_ID,
      [Query.equal('threadId', threadId)]
    );

    // Update permissions for each message
    for (const message of messages.documents) {
      await databases.updateDocument(
        DATABASE_ID,
        CHAT_MESSAGES_COLLECTION_ID,
        message.$id,
        {}, // No need to update content, just permissions
        permissions
      );
    }

    return res.status(200).json(updatedThread);
  } catch (error) {
    console.error('Error removing thread access:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router; 