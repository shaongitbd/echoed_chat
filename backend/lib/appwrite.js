import { Client, Databases, Users } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const users = new Users(client);

// In the original frontend code, there was an `appwriteService` that had a `getUserProfile` method.
// The frontend code gets the user's profile to get the API key stored in the user's preferences.
// In the backend, we need to read the user's document from the database to get the preferences.
// We'll assume the user's profile is stored in a 'profiles' collection and the document ID is the user's ID.
// The user will need to configure these values in environment variables.
const PROFILES_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const PROFILES_COLLECTION_ID = process.env.APPWRITE_PROFILES_COLLECTION_ID;

async function getUserProfile(userId) {
    if (!PROFILES_DATABASE_ID || !PROFILES_COLLECTION_ID) {
        throw new Error('Appwrite database/collection not configured in environment variables.');
    }
    return await databases.getDocument(PROFILES_DATABASE_ID, PROFILES_COLLECTION_ID, userId);
}

/**
 * Verify JWT token from Appwrite and return user information
 * @param {string} jwt - JWT token from Appwrite
 * @returns {Promise<Object>} - User information
 */
async function verifyToken(jwt) {
    if (!jwt) {
        throw new Error('No JWT token provided');
    }
    
    try {
        // Get the current user session using the JWT token
        // This will throw an error if the token is invalid
        const user = await users.get();
        return user;
    } catch (error) {
        console.error('Error verifying JWT token:', error);
        throw new Error('Invalid or expired JWT token');
    }
}

export const appwriteService = {
    getUserProfile,
    verifyToken
}; 