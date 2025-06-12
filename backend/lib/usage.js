import { appwriteService } from './appwrite.js';
import { Client, Databases, Query } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Constants
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;
const PRICING_COLLECTION_ID = process.env.APPWRITE_PRICING_COLLECTION_ID;

/**
 * Check if a user has enough credits for a specific operation
 * @param {string} userId - The user ID
 * @param {string} operationType - The type of operation ('text', 'image', or 'video')
 * @returns {Promise<{allowed: boolean, message: string, plan: Object}>}
 */
export async function checkUsageLimit(userId, operationType) {
  try {
    // Get user profile to check their plan
    const userProfile = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );

    if (!userProfile) {
      return { allowed: false, message: 'User profile not found' };
    }

    const userPlan = userProfile.plan || 'free';
    let usageStats = { textQueries: 0, imageGeneration: 0, videoGeneration: 0 };
    
    // Parse usage stats if they exist
    if (userProfile.usageStats) {
      if (typeof userProfile.usageStats === 'string') {
        try {
          usageStats = JSON.parse(userProfile.usageStats);
        } catch (e) {
          console.error('Error parsing usageStats:', e);
          usageStats = { textQueries: 0, imageGeneration: 0, videoGeneration: 0 };
        }
      } else {
        usageStats = userProfile.usageStats;
      }
    }

    console.log(`Checking usage limits for user ${userId}, plan: ${userPlan}, operation: ${operationType}`);
    console.log('Current usage stats:', usageStats);

    // Get plan limits from pricing collection
    const pricingPlans = await databases.listDocuments(
      DATABASE_ID,
      PRICING_COLLECTION_ID,
      [Query.equal('package_name', userPlan)]
    );

    if (!pricingPlans || pricingPlans.documents.length === 0) {
      return { allowed: false, message: `Plan '${userPlan}' not found in pricing table` };
    }

    const planLimits = pricingPlans.documents[0];
    console.log('Plan limits:', planLimits);

    // Check limits based on operation type
    let currentUsage = 0;
    let limit = 0;
    let operationField = '';

    switch (operationType) {
      case 'text':
        currentUsage = usageStats.textQueries || 0;
        limit = planLimits.text_credit || 0;
        operationField = 'textQueries';
        break;
      case 'image':
        currentUsage = usageStats.imageGeneration || 0;
        limit = planLimits.image_credit || 0;
        operationField = 'imageGeneration';
        break;
      case 'video':
        currentUsage = usageStats.videoGeneration || 0;
        limit = planLimits.video_credit || 0;
        operationField = 'videoGeneration';
        break;
      default:
        return { allowed: false, message: `Unknown operation type: ${operationType}` };
    }

    console.log(`Current usage: ${currentUsage}, Limit: ${limit}, Operation field: ${operationField}`);

    // Check if user has reached their limit
    if (currentUsage >= limit) {
      return { 
        allowed: false, 
        message: `You have reached your ${operationType} generation limit for your ${userPlan} plan`,
        plan: planLimits
      };
    }

    return { 
      allowed: true, 
      message: `Operation allowed. ${currentUsage + 1}/${limit} ${operationType} generations used.`,
      plan: planLimits,
      userId,
      operationField,
      currentUsage
    };
  } catch (error) {
    console.error(`Error checking usage limits for user ${userId}:`, error);
    return { allowed: false, message: `Error checking usage limits: ${error.message}` };
  }
}

/**
 * Increment usage counter for a user after successful operation
 * @param {Object} usageInfo - The usage info returned from checkUsageLimit
 * @returns {Promise<boolean>} - Whether the update was successful
 */
export async function incrementUsage(usageInfo) {
  try {
    if (!usageInfo || !usageInfo.allowed || !usageInfo.userId || !usageInfo.operationField) {
      console.error('Invalid usage info provided for increment:', usageInfo);
      return false;
    }

    // Get current user profile
    const userProfile = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      usageInfo.userId
    );

    // Parse current usage stats
    let usageStats = { textQueries: 0, imageGeneration: 0, videoGeneration: 0 };
    if (userProfile.usageStats) {
      if (typeof userProfile.usageStats === 'string') {
        usageStats = JSON.parse(userProfile.usageStats);
      } else {
        usageStats = userProfile.usageStats;
      }
    }

    console.log(`Incrementing ${usageInfo.operationField} for user ${usageInfo.userId}`);
    console.log('Current usage stats:', usageStats);

    // Increment the specific counter based on operation type
    switch (usageInfo.operationField) {
      case 'textQueries':
        usageStats.textQueries = (usageStats.textQueries || 0) + 1;
        break;
      case 'imageGeneration':
        usageStats.imageGeneration = (usageStats.imageGeneration || 0) + 1;
        break;
      case 'videoGeneration':
        usageStats.videoGeneration = (usageStats.videoGeneration || 0) + 1;
        break;
      default:
        console.error(`Unknown operation field: ${usageInfo.operationField}`);
        return false;
    }

    console.log('Updated usage stats:', usageStats);

    // Update the user profile
    await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      usageInfo.userId,
      { usageStats: JSON.stringify(usageStats) }
    );

    return true;
  } catch (error) {
    console.error(`Error incrementing usage for user ${usageInfo?.userId}:`, error);
    return false;
  }
} 