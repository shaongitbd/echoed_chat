import { appwriteService } from '../lib/appwrite.js';
import { Client, Account } from 'node-appwrite';

// Initialize Appwrite client for token verification
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID);

const account = new Account(client);

/**
 * Middleware to verify JWT token and authenticate user
 */
export const authMiddleware = async (req, res, next) => {
    try {
        // Get the authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            console.log('No authorization header provided');
            return res.status(401).json({ error: 'Unauthorized: No authorization header provided' });
        }
        
        if (!authHeader.startsWith('Bearer ')) {
            console.log('Invalid authorization format, expected Bearer token');
            return res.status(401).json({ error: 'Unauthorized: Invalid authorization format' });
        }
        
        // Extract the token
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            console.log('No token found in authorization header');
            return res.status(401).json({ error: 'Unauthorized: No token found in authorization header' });
        }
        
        console.log('Attempting to verify JWT token');
        
        try {
            // Set the JWT on the client
            client.setJWT(token);
            
            // This will throw an error if the token is invalid
            const user = await account.get();
            
            if (!user || !user.$id) {
                console.log('Invalid user data returned from Appwrite');
                return res.status(401).json({ error: 'Unauthorized: Invalid user data' });
            }
            
            console.log(`User authenticated: ${user.$id}`);
            
            // Add the user to the request object
            req.user = user;
            
            // Continue to the next middleware/route handler
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ error: `Unauthorized: ${error.message || 'Invalid or expired token'}` });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}; 