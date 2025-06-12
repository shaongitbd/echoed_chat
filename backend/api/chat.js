import { streamText, experimental_generateImage as generateImage, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { appwriteService } from '../lib/appwrite.js';
import { checkUsageLimit, incrementUsage } from '../lib/usage.js';

export async function handleChatRequest(req, res) {
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

    // Check if user ID is provided
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // --- IMAGE GENERATION INTENT ---
    if (intent === 'image') {
      console.log('Handling image generation request with provider:', provider);

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Check usage limits for image generation
      const usageCheck = await checkUsageLimit(userId, 'image');
      if (!usageCheck.allowed) {
        return res.status(403).json({ error: usageCheck.message });
      }

      let apiKey = '';
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
        // Don't expose internal server errors to the client
        return res.status(500).json({ error: 'Error fetching API key.' });
      }

      if (!apiKey) {
        return res.status(401).json({ error: `No API key found for ${provider}. Please add one in settings.` });
      }

      let aiProvider;

      try {
        switch (provider) {
          case 'openai':
            aiProvider = createOpenAI({ apiKey });
            const imageModel = aiProvider.image(model);

            console.log('Sending to OpenAI image generation model:', { provider, model, prompt });

            const { images, warnings } = await generateImage({
              model: imageModel,
              prompt,
              n: 1,
              size: '1024x1024',
            });
            
            if (warnings) {
                console.warn('Image generation warnings:', warnings);
            }

            // Increment usage after successful generation
            console.log('Incrementing image generation usage for user:', userId);
            const openaiUsageUpdated = await incrementUsage(usageCheck);
            if (!openaiUsageUpdated) {
              console.error('Failed to increment image usage for user:', userId);
            }

            return res.status(200).json({ 
              images,
              usage: {
                current: usageCheck.currentUsage + 1,
                limit: usageCheck.plan.image_credid,
                message: usageCheck.message
              }
            });
          
          case 'google':
            aiProvider = createGoogleGenerativeAI({ apiKey });
            const textToImageModel = aiProvider(model);

            console.log('Sending to Google text-to-image model:', { provider, model, prompt });

            const result = await generateText({
                model: textToImageModel,
                prompt: prompt,
                providerOptions: {
                    google: { responseModalities: ['IMAGE', 'TEXT'] }
                }
            });

            const imageFiles = result.files.filter(f => f.mimeType?.startsWith('image/'));

            if (imageFiles.length === 0) {
                return res.status(500).json({ error: 'The AI model did not return an image.' });
            }

            const imagesFromGoogle = imageFiles.map(file => ({
              base64: file.base64.startsWith('data:') ? file.base64.split(',')[1] : file.base64,
              mimeType: file.mimeType,
            }));

            // Increment usage after successful generation
            console.log('Incrementing image generation usage for user:', userId);
            const googleUsageUpdated = await incrementUsage(usageCheck);
            if (!googleUsageUpdated) {
              console.error('Failed to increment image usage for user:', userId);
            }

            return res.status(200).json({ 
              images: imagesFromGoogle,
              usage: {
                current: usageCheck.currentUsage + 1,
                limit: usageCheck.plan.image_credid,
                message: usageCheck.message
              }
            });

          case 'anthropic':
          default:
            return res.status(400).json({ error: `Image generation is not supported for the '${provider}' provider.` });
        }
      } catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ error: 'Failed to generate image' });
      }
    }

    // --- CHAT (TEXT) GENERATION INTENT ---
    console.log('Handling chat request with provider:', provider);
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Check usage limits for text generation
    const usageCheck = await checkUsageLimit(userId, 'text');
    if (!usageCheck.allowed) {
      return res.status(403).json({ error: usageCheck.message });
    }
    
    let apiKey = '';
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
      return res.status(500).json({ error: 'Error fetching API key.' });
    }
    
    if (!apiKey) {
      return res.status(401).json({ error: `No API key found for ${provider}. Please add one in settings.` });
    }
    
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
    
    try {
      // Create the AI stream using streamText
      const result = await streamText({
        model: modelInstance,
        messages: messages,
      });
      
      // Increment usage after successful generation
      console.log('Incrementing text query usage for user:', userId);
      const textUsageUpdated = await incrementUsage(usageCheck);
      if (!textUsageUpdated) {
        console.error('Failed to increment text usage for user:', userId);
      }
      
      // Add usage information to the response
      const usageInfo = {
        current: usageCheck.currentUsage + 1,
        limit: usageCheck.plan.text_credit,
        message: usageCheck.message
      };
      
      // Get the response object with proper headers
      const response = await result.toDataStreamResponse({
        extraData: {
          ...(isEdit ? { isEdit: true } : {}),
          usage: usageInfo
        },
        getErrorMessage: (error) => {
          return error.message || 'An error occurred during streaming';
        },
      });
      
      // Set the headers from the response
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      // Pipe the response body to Express response
      if (response.body) {
        // Create a readable stream from the response body
        const reader = response.body.getReader();
        
        // Process the stream
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                res.end();
                break;
              }
              
              // Send the chunk directly without any processing
              res.write(value);
            }
          } catch (error) {
            console.error('Error reading from stream:', error);
            res.end();
          }
        };
        
        // Start processing the stream
        processStream();
      } else {
        res.status(500).json({ error: 'Failed to generate response stream' });
      }
    } catch (error) {
      console.error('Error generating text:', error);
      res.status(500).json({ error: 'Failed to generate text response' });
    }
  } catch (error) {
    console.error('[API Handler] General error in chat API handler:', error);
    
    // Use a generic error response for security
    return res.status(500).json({ 
        error: {
          name: 'HandlerError',
          message: 'An unexpected error occurred processing your request.' 
        }
    });
  }
} 