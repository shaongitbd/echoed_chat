import { convertToCoreMessages,streamText, experimental_generateImage as generateImage, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { appwriteService } from '../lib/appwrite.js';
import { checkUsageLimit, incrementUsage } from '../lib/usage.js';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import FormData from 'form-data';
import fetch from 'node-fetch';

export async function handleChatRequest(req, res) {
  try {
    const {
      messages,
      userId,
      threadId,
      provider = 'google',
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

      if (!apiKey && provider !== 'echoed') {
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

            case 'echoed':
              if (model === 'chutes-hidream' || model === 'chutes-chroma') {
                const response = await fetch(`https://${model}.chutes.ai/generate`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${process.env.ECHOED_API_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    "seed": null,
                    "shift": 3,
                    "prompt": prompt,
                    "resolution": "1024x1024",
                    "guidance_scale": 5,
                    "num_inference_steps": 50
                  })
                });
                console.log(response);
            
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Image = buffer.toString('base64');

                // Format image in the same way as Google
                const echoedImages = [{
                  base64: base64Image,
                  mimeType: 'image/png'
                }];

                // Increment usage after successful generation
                console.log('Incrementing image generation usage for user:', userId);
                const echoedUsageUpdated = await incrementUsage(usageCheck);
                if (!echoedUsageUpdated) {
                  console.error('Failed to increment image usage for user:', userId);
                }
              
                return res.status(200).json({ 
                  images: echoedImages,
                  usage: {
                    current: usageCheck.currentUsage + 1,
                    limit: usageCheck.plan.image_credid,
                    message: usageCheck.message
                  }
                });
              }
              else if(model === "imgen"){
                console.log("Generating image with Imgen");
                try {
                  // Use the gemini-web-fetcher endpoint
                  const geminiResponse = await fetch(`${process.env.CHAOS_API_URL}/generate-image`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      prompt: `generate ${prompt}`
                    })
                  });
                  console.log(geminiResponse);
                  if (!geminiResponse.ok) {
                    const errorData = await geminiResponse.json();
                    throw new Error(errorData.error || 'Failed to generate image with Gemini');
                  }
                  
                  // Get the image as binary data
                  const imageBuffer = await geminiResponse.arrayBuffer();
                  const buffer = Buffer.from(imageBuffer);
                  const base64Image = buffer.toString('base64');
                  
                  // Format image in the same way as Google
                  const geminiImages = [{
                    base64: base64Image,
                    mimeType: 'image/png'
                  }];
                  
                  // Increment usage after successful generation
                  console.log('Incrementing image generation usage for user:', userId);
                  const geminiUsageUpdated = await incrementUsage(usageCheck);
                  if (!geminiUsageUpdated) {
                    console.error('Failed to increment image usage for user:', userId);
                  }
                
                  return res.status(200).json({ 
                    images: geminiImages,
                    usage: {
                      current: usageCheck.currentUsage + 1,
                      limit: usageCheck.plan.image_credid,
                      message: usageCheck.message
                    }
                  });
                } catch (error) {
                  console.error('Error generating image with Gemini:', error);
                  return res.status(500).json({ error: `Failed to generate image with Gemini: ${error.message}` });
                }
              }
              else {
                return res.status(400).json({ error: `Image generation is not supported for the '${provider}' provider with model '${model}'.` });
              }

          
          
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
    
    if (!apiKey && provider !== 'echoed') {
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
        aiProvider = createOpenAI({ apiKey });
        break
     
      default:
        aiProvider = createOpenAI({ apiKey });
        break;
    }

    
    
    try {
      // Create the AI stream using streamText
      let result;
      if(provider != 'echoed'){
        const modelInstance = aiProvider(model);
        result = await streamText({
          model: modelInstance,
          messages: messages,
        });
      }
      else{
        if (model.includes("gemini") && provider == 'echoed'){
          try {
            console.log("Using Gemini for text generation");
            
            // Extract any image attachments
            const fileAttachments  = [];
            for (const msg of messages) {
              if (msg.experimental_attachments && msg.experimental_attachments.length > 0) {
                for (const attachment of msg.experimental_attachments) {
                    fileAttachments.push(attachment.url);
                  
                }
              }
            }
            
            console.log("Found file attachments:", fileAttachments.length > 0 ? fileAttachments : "None");
            
            // Format the entire conversation for Gemini
            const formattedConversation = messages.map(msg => {
              const role = msg.role === 'user' ? 'User: ' : 'Assistant: ';
              let content = `${role}${msg.content}`;
              
              // Add image references to the message if it has attachments
              if (msg.experimental_attachments && msg.experimental_attachments.length > 0) {
                content += " [Image attached]";
              }
              
              return content;
            }).join('\n\n');
            
            // Add a final prompt for the assistant to respond
            const prompt = `${formattedConversation}\n\nAssistant: `;
            
            console.log("Sending formatted conversation to Gemini");
            
            let geminiResponse;
            
            if (fileAttachments.length > 0) {
              // The user has attached images. Use the analyze-file endpoint.
              console.log("Using analyze-file endpoint for image analysis");
              
              const fileUrl = fileAttachments[fileAttachments.length - 1]; // Use the most recent image
              console.log("Downloading file from:", fileUrl);
              
        
        
                

                geminiResponse = await fetch(`${process.env.CHAOS_API_URL}/generate-text`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prompt: prompt,
                    file: fileUrl
                  })
                });
              
            } else {
              // Use the standard text endpoint if no images
              geminiResponse = await fetch(`${process.env.CHAOS_API_URL}/generate-text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  prompt: prompt
                })
              });
            }
            
            console.log("Gemini response status:", geminiResponse.status);
            
            if (!geminiResponse.ok) {
              const errorData = await geminiResponse.json();
              throw new Error(errorData.error || 'Failed to generate text with Gemini');
            }
            
            // Parse the response
            const geminiData = await geminiResponse.json();
            console.log("Gemini response data:", geminiData);
            
            if (!geminiData.text) {
              throw new Error('Gemini returned an empty response');
            }
            
            // Create a fallback response if streaming fails
            const fallbackResponse = {
              role: 'assistant',
              content: geminiData.text
            };
            
            // Create a compatible stream result
            result = {
              toDataStreamResponse: async ({ extraData, getErrorMessage }) => {
                try {
                  // Create a response object with headers
                  const responseHeaders = new Map();
                  responseHeaders.set('Content-Type', 'text/event-stream');
                  responseHeaders.set('Cache-Control', 'no-cache');
                  responseHeaders.set('Connection', 'keep-alive');
                  
                  // Get the response text
                  const responseText = geminiData.text || "No response from Gemini";
                  
                  // Create a readable stream that simulates token-by-token streaming
                  const encoder = new TextEncoder();
                  const stream = new ReadableStream({
                    async start(controller) {
                      try {
                        // First event - message ID
                        const messageId = `msg-${Math.random().toString(36).substring(2, 15)}`;
                        controller.enqueue(encoder.encode(`f:{"messageId":"${messageId}"}\n`));
                        
                        // Process the response character by character instead of word by word
                        // This handles code blocks and special characters better
                        const chars = responseText.split('');
                        let buffer = '';
                        const chunkSize = 4; // Send a few characters at a time
                        
                        for (let i = 0; i < chars.length; i++) {
                          buffer += chars[i];
                          
                          // Send in small chunks or when we hit special characters
                          if (buffer.length >= chunkSize || 
                              chars[i] === '\n' || 
                              chars[i] === '.' || 
                              chars[i] === '!' || 
                              chars[i] === '?' ||
                              i === chars.length - 1) {
                            
                            // Escape special characters for JSON
                            const escapedBuffer = JSON.stringify(buffer).slice(1, -1);
                            controller.enqueue(encoder.encode(`0:"${escapedBuffer}"\n`));
                            buffer = '';
                            
                            // Small delay to simulate streaming
                            await new Promise(resolve => setTimeout(resolve, 5));
                          }
                        }
                        
                        // Final events
                        // Estimate token counts - rough approximation
                        const promptTokens = Math.ceil(prompt.length / 4);
                        const completionTokens = Math.ceil(responseText.length / 4);
                        
                        // End event with usage info
                        controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":${promptTokens},"completionTokens":${completionTokens}},"isContinued":false}\n`));
                        
                        // Done event
                        controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":${promptTokens},"completionTokens":${completionTokens}}}\n`));
                        
                        controller.close();
                      } catch (error) {
                        console.error('Error in Gemini stream:', error);
                        controller.enqueue(encoder.encode(`e:{"finishReason":"error","error":"${error.message.replace(/"/g, '\\"')}"}\n`));
                        controller.close();
                      }
                    }
                  });
                  
                  return {
                    headers: responseHeaders,
                    body: stream
                  };
                } catch (error) {
                  console.error('Error in Gemini stream:', error);
                  return {
                    toDataStreamResponse: async ({ extraData, getErrorMessage }) => {
                      // Create a response object with headers
                      const responseHeaders = new Map();
                      responseHeaders.set('Content-Type', 'text/event-stream');
                      responseHeaders.set('Cache-Control', 'no-cache');
                      responseHeaders.set('Connection', 'keep-alive');
                      
                      // Get the response text
                      const responseText = fallbackResponse.content || "No response from Gemini";
                      
                      // Create a readable stream that simulates token-by-token streaming
                      const encoder = new TextEncoder();
                      const stream = new ReadableStream({
                        async start(controller) {
                          try {
                            // First event - message ID
                            const messageId = `msg-${Math.random().toString(36).substring(2, 15)}`;
                            controller.enqueue(encoder.encode(`f:{"messageId":"${messageId}"}\n`));
                            
                            // Process the response character by character instead of word by word
                            // This handles code blocks and special characters better
                            const chars = responseText.split('');
                            let buffer = '';
                            const chunkSize = 4; // Send a few characters at a time
                            
                            for (let i = 0; i < chars.length; i++) {
                              buffer += chars[i];
                              
                              // Send in small chunks or when we hit special characters
                              if (buffer.length >= chunkSize || 
                                  chars[i] === '\n' || 
                                  chars[i] === '.' || 
                                  chars[i] === '!' || 
                                  chars[i] === '?' ||
                                  i === chars.length - 1) {
                                
                                // Escape special characters for JSON
                                const escapedBuffer = JSON.stringify(buffer).slice(1, -1);
                                controller.enqueue(encoder.encode(`0:"${escapedBuffer}"\n`));
                                buffer = '';
                                
                                // Small delay to simulate streaming
                                await new Promise(resolve => setTimeout(resolve, 5));
                              }
                            }
                            
                            // Final events
                            // Estimate token counts - rough approximation
                            const promptTokens = Math.ceil(prompt.length / 4);
                            const completionTokens = Math.ceil(responseText.length / 4);
                            
                            // End event with usage info
                            controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":${promptTokens},"completionTokens":${completionTokens}},"isContinued":false}\n`));
                            
                            // Done event
                            controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":${promptTokens},"completionTokens":${completionTokens}}}\n`));
                            
                            controller.close();
                          } catch (error) {
                            console.error('Error in Gemini stream:', error);
                            controller.enqueue(encoder.encode(`e:{"finishReason":"error","error":"${error.message.replace(/"/g, '\\"')}"}\n`));
                            controller.close();
                          }
                        }
                      });
                      
                      return {
                        headers: responseHeaders,
                        body: stream
                      };
                    }
                  };
                }
              }
            };
          } catch (error) {
            console.error('Error generating text with Gemini:', error);
            throw error;
          }
        }
        else{
          const echoedProvider= createOpenAICompatible({
            name:'echoed',
            apiKey: process.env.ECHOED_API_KEY,
            baseURL: process.env.ECHOED_BASEURL,
          });
          
          result = await streamText({
            model: echoedProvider.chatModel(model),
            messages: convertToCoreMessages(messages),
          });
          console.log(result);
        }
      }
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