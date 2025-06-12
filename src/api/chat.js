import { streamText, experimental_generateImage as generateImage, generateText } from 'ai';
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
      intent, // 'chat' or 'image'
      prompt, // for image generation
    } = req.body;
    
    // --- IMAGE GENERATION INTENT ---
    if (intent === 'image') {
      console.log('Handling image generation request with provider:', provider);

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
      }

      let apiKey = '';
      if (userId) {
        try {
          const userProfile = await appwriteService.getUserProfile(userId);
          if (userProfile && userProfile.preferences && typeof userProfile.preferences === 'string') {
            const preferences = JSON.parse(userProfile.preferences);
            const providerSettings = preferences.providers?.find(p => p.name === provider);
            if (providerSettings && providerSettings.apiKey) {
              apiKey = providerSettings.apiKey;
            }
          }
        } catch (error) {
          console.error('Error getting API key:', error);
        }
      }

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: `No API key found for ${provider}. Please add one in settings.` }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let aiProvider;

      switch (provider) {
        case 'openai':
          aiProvider = createOpenAI({ apiKey });
          const imageModel = aiProvider.image(model);

          console.log('Sending to OpenAI image generation model:', { provider, model, prompt });

          const { images, warnings } = await generateImage({
            model: imageModel,
            prompt,
            n: 1, // For now, generate one image at a time
            size: '1024x1024',
          });
          
          if (warnings) {
              console.warn('Image generation warnings:', warnings);
          }

          return new Response(JSON.stringify({ images }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        
        case 'google':
          aiProvider = createGoogleGenerativeAI({ apiKey });
          const textToImageModel = aiProvider(model);

          console.log('Sending to Google text-to-image model:', { provider, model, prompt });

          const result = await generateText({
              model: textToImageModel,
              prompt: prompt,
              // Some Google models can generate images as part of a text response
              providerOptions: {
                  google: { responseModalities: ['IMAGE', 'TEXT'] }
              }
          });

          // The response will contain file parts for the images
          const imageFiles = result.files.filter(f => f.mimeType?.startsWith('image/'));

          if (imageFiles.length === 0) {
              throw new Error('The AI model did not return an image.');
          }

          // The frontend expects the raw base64 string, but google provides a data URL.
          // We need to parse it.
          const imagesFromGoogle = imageFiles.map(file => {
            const isDataUrl = file.base64.startsWith('data:');
            return {
              base64: isDataUrl ? file.base64.split(',')[1] : file.base64,
              mimeType: file.mimeType,
            };
          });

          return new Response(JSON.stringify({ images: imagesFromGoogle }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });

        case 'anthropic':
        default:
          return new Response(
            JSON.stringify({ error: `Image generation is not supported for the '${provider}' provider.` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
      }
    }

    // --- CHAT (TEXT) GENERATION INTENT ---
    console.log('Handling chat request with provider:', provider);
    console.log('Messages received:', messages);
    console.log("model capabilities", modelCapabilities);
    
    // Check for image generation intent for capable Google models
    let isImageGenerationIntent = false;
    if (provider === 'google' && 
        (model === 'gemini-2.0-flash-preview-image-generation' || 
         modelCapabilities?.includes('image')) && 
        messages.length > 0) {
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
      extraData: isEdit ? { isEdit: true } : undefined,
      getErrorMessage: (error) => {
        // The Vercel AI SDK provides a detailed error object.
        // We pass its message directly to the client.
        return error.message;
      },
    });
  } catch (error) {
    // This top-level catch is now for truly unexpected errors,
    // like issues with reading the request body, not for AI SDK errors.
    console.error('[API Handler] General error in chat API handler:', error);
    
    return new Response(
      JSON.stringify({ 
        error: {
          name: 'HandlerError',
          message: 'An unexpected error occurred processing your request.' 
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

