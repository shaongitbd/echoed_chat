import { Router } from 'express';
import { handleChatRequest } from './chat.js';
import threadsRouter from './threads.js';
import { handleCreateUserProfile, handleUpdateUserPreferences, handleUpdateUserName } from './users.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/chat', handleChatRequest);

// Use the threads router for all /threads routes
router.use('/threads',authMiddleware, threadsRouter);

// User routes with authentication
router.post('/users/profile', authMiddleware, handleCreateUserProfile);
router.put('/users/preferences', authMiddleware, handleUpdateUserPreferences);
router.put('/users/name', authMiddleware, handleUpdateUserName);

export default router; 