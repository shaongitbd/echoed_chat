import { handleChatRequest } from './chat';

/**
 * Main API router
 * In a real app, this would be handled by your backend framework
 * For this demo, we're simulating API routes in the frontend
 */
export async function handleApiRequest(path, method, body) {
  console.log(`[API ROUTER] Path: '${path}', Method: '${method}'`);
  // Parse the path to determine the route
  const pathParts = path.split('/').filter(Boolean);
  
  if (pathParts[0] === 'chat') {
    console.log('[API ROUTER] Routing to: handleChatRequest');
    // Handle chat requests
    return handleChatRequest({ method, body });
  }
  
  if (pathParts[0] === 'threads') {
    // Handle thread requests
    if (pathParts.length === 1 && method === 'POST') {
      // Create a new thread
      return handleCreateThread(body);
    }
    
    if (pathParts.length === 2 && method === 'GET') {
      // Get a specific thread
      return handleGetThread(pathParts[1]);
    }
    
    if (pathParts.length === 3 && pathParts[2] === 'messages' && method === 'POST') {
      // Add a message to a thread
      return handleAddMessage(pathParts[1], body);
    }
  }
  
  console.error(`[API ROUTER] No route found for path: '${path}'`);
  // Handle unknown routes
  return new Response(
    JSON.stringify({ error: 'Not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Mock thread storage
 * In a real app, this would be in a database
 */
const threads = {};

/**
 * Create a new thread
 */
async function handleCreateThread(body) {
  try {
    const { userId, title } = body;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const threadId = `thread_${Date.now()}`;
    
    threads[threadId] = {
      id: threadId,
      userId,
      title: title || 'New conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    
    return new Response(
      JSON.stringify(threads[threadId]),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating thread:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create thread' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get a specific thread
 */
async function handleGetThread(threadId) {
  try {
    if (!threads[threadId]) {
      return new Response(
        JSON.stringify({ error: 'Thread not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify(threads[threadId]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting thread:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get thread' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Add a message to a thread
 */
async function handleAddMessage(threadId, body) {
  try {
    if (!threads[threadId]) {
      return new Response(
        JSON.stringify({ error: 'Thread not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { role, content } = body;
    
    if (!role || !content) {
      return new Response(
        JSON.stringify({ error: 'Role and content are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const message = {
      id: `msg_${Date.now()}`,
      threadId,
      role,
      content,
      createdAt: new Date().toISOString()
    };
    
    threads[threadId].messages.push(message);
    threads[threadId].updatedAt = new Date().toISOString();
    
    return new Response(
      JSON.stringify(message),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error adding message:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to add message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 