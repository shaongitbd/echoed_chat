import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { appwriteService } from '../lib/appwrite';

/**
 * API handler for chat requests
 * This would typically be in a server-side file like /api/chat/route.js in Next.js
 * For this demo, we'll simulate it in the frontend
 */
export async function handleChatRequest(req) {
  try {
    const { 
      messages, 
      userId, 
      threadId, 
      provider = 'openai', 
      model = 'gpt-4o',
      isEdit = false,
      modelCapabilities = [],
    } = req.body;
    
    console.log('Handling chat request with provider:', provider);
    console.log('Messages received:', messages);
    
    // Check for image generation intent for capable Google models
    let isImageGenerationIntent = false;
    if (provider === 'google' && modelCapabilities?.includes('image') && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user' && typeof lastMessage.content === 'string') {
            const userContent = lastMessage.content.toLowerCase();
            const imageKeywords = ['image of', 'picture of', 'generate an image', 'create an image', 'draw a', 'show me a photo of'];
            isImageGenerationIntent = imageKeywords.some(keyword => userContent.includes(keyword));
        }
    }
    
    // Validate required parameters
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get API key for the selected provider from user settings
    let apiKey = '';
    if (userId) {
      try {
        // Fetch the entire user profile, which contains the 'preferences' field
        const userProfile = await appwriteService.getUserProfile(userId);

        if (userProfile && userProfile.preferences && typeof userProfile.preferences === 'string') {
          // Parse the preferences string to get the settings object
          const preferences = JSON.parse(userProfile.preferences);
          const providerSettings = preferences.providers?.find(p => p.name === provider);

          if (providerSettings && providerSettings.apiKey) {
            apiKey = providerSettings.apiKey;
          }
        }
      } catch (error) {
        console.error('Error getting user profile or API key:', error);
      }
    }
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `No API key found for ${provider}. Please add one in settings.` }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Select provider and model based on user selection
    let aiProvider;
    
    switch (provider) {
      case 'anthropic':
        aiProvider = createAnthropic({ apiKey });
        break;
      case 'google':
        aiProvider = createGoogleGenerativeAI({ apiKey });
        break;
      case 'openai':
      default:
        aiProvider = createOpenAI({ apiKey });
        break;
    }

    const modelInstance = aiProvider(model);
    
    // Log what we're about to send to the AI
    console.log('Sending to AI model:', { provider, model });
    
    // The ai-sdk library handles different message formats for different providers
    // We just need to make sure the content format is correct
    
    // For edited messages, we create a special stream
    try {
      console.log('Streaming text with provided messages');
      const result = streamText({
        model: modelInstance,
        messages: messages,
        ...((isImageGenerationIntent) && {
            providerOptions: {
                google: { responseModalities: ['TEXT', 'IMAGE'] }
            }
        })
      });
      
      return result.toDataStreamResponse({
        extraData: isEdit ? { isEdit: true } : undefined
      });
    } catch (error) {
      console.error('[AI SDK] Error during text generation:', error);

      let errorMessage = 'An unknown error occurred while generating the AI response.';
      let statusCode = 500;

      // Check for specific error types from the AI SDK or underlying provider
      if (error.name === 'APIError') {
        errorMessage = `AI Provider Error: ${error.message}`;
        // Status code might be on the error object, e.g., 401 for auth, 429 for rate limits
        statusCode = error.statusCode || 400; 
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Return a structured error response
      return new Response(
        JSON.stringify({
          error: {
            name: error.name || 'UnknownError',
            message: errorMessage,
            statusCode: statusCode,
          }
        }),
        { 
          status: statusCode, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('[AI SDK] General error in chat API handler:', error);
    
    // Check if the error is an APIError and has a specific message
    let errorMessage = 'An unexpected error occurred while processing the AI response.';
    if (error.name === 'APIError') {
      errorMessage = error.message; // Use the specific message from the AI provider
    }
    
    return new Response(
      JSON.stringify({ 
        error: {
          name: 'HandlerError',
          message: errorMessage 
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to save messages to a thread
async function saveMessageToThread(threadId, message) {
  try {
    // In a real app, this would be an API call to your backend
    console.log(`Saving message to thread ${threadId}:`, message);
    
    // Example API call (commented out)
    /*
    await fetch(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: message.role,
        content: message.content
      })
    });
    */
  } catch (error) {
    console.error('Error saving message to thread:', error);
  }
} 