// Model Service
// Handles communication with different LLM providers

// Default provider configurations
const DEFAULT_PROVIDERS = {
  replit: {
    name: 'Replit',
    baseUrl: 'https://api.replit.com/v1/ai',
    models: [
      {
        id: 'replit-3b-v1',
        name: 'Replit Code 3B v1',
        capabilities: ['text']
      }
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        capabilities: ['text']
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        capabilities: ['text']
      },
      {
        id: 'meta-llama/llama-3-70b-instruct',
        name: 'Llama 3 70B',
        capabilities: ['text']
      },
      {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        capabilities: ['text']
      }
    ]
  },
  google: {
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview 05-20', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro Preview', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Preview (Image Gen)', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', capabilities: ['text', 'audio', 'image', 'video'] }
    ]
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        capabilities: ['text', 'image']
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        capabilities: ['text', 'image']
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        capabilities: ['text']
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        capabilities: ['image']
      }
    ]
  }
};

/**
 * Handles sending messages to different AI model providers
 * @param {string} provider - The provider name (replit, openrouter, google, openai)
 * @param {string} model - The model ID
 * @param {string} apiKey - The API key for the provider
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Additional options for the request
 * @returns {Promise} - Promise with the response from the provider
 */
export const sendChatRequest = async (provider, model, apiKey, messages, options = {}) => {
  const {
    temperature = 0.7,
    maxTokens = null,
    searchResults = null,
    webSearch = false,
    files = []
  } = options;

  if (!provider || !model || !apiKey) {
    throw new Error('Provider, model, and API key are required');
  }

  // Determine the correct handler based on the provider
  switch (provider) {
    case 'replit':
      return sendReplitRequest(model, apiKey, messages, { temperature, maxTokens });
    case 'openrouter':
      return sendOpenRouterRequest(model, apiKey, messages, { temperature, maxTokens });
    case 'google':
      return sendGoogleRequest(model, apiKey, messages, { temperature, maxTokens, files });
    case 'openai':
      return sendOpenAIRequest(model, apiKey, messages, { temperature, maxTokens, files });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

/**
 * Sends a request to the Replit AI API
 */
const sendReplitRequest = async (model, apiKey, messages, options) => {
  const { temperature, maxTokens } = options;
  
  try {
    const response = await fetch('https://api.replit.com/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens && { max_tokens: maxTokens })
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Replit API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending Replit request:', error);
    throw error;
  }
};

/**
 * Sends a request to the OpenRouter API
 */
const sendOpenRouterRequest = async (model, apiKey, messages, options) => {
  const { temperature, maxTokens } = options;
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Chat UI'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens && { max_tokens: maxTokens }),
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending OpenRouter request:', error);
    throw error;
  }
};

/**
 * Sends a request to the Google Gemini API
 */
const sendGoogleRequest = async (model, apiKey, messages, options) => {
  const { temperature, maxTokens, files = [] } = options;
  
  try {
    // Convert chat messages to Gemini format
    const geminiMessages = convertToGeminiFormat(messages, files);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature,
          ...(maxTokens && { maxOutputTokens: maxTokens })
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Create a detailed error object
      const error = new Error();
      error.status = response.status;
      error.statusText = response.statusText;
      
      // Add specific error message for common status codes
      if (response.status === 429) {
        error.message = "Too many requests. The Google API rate limit has been exceeded.";
        error.code = "RATE_LIMIT_EXCEEDED";
      } else if (response.status === 401 || response.status === 403) {
        error.message = "Authentication failed. Please check your API key.";
        error.code = "AUTHENTICATION_ERROR";
      } else {
        error.message = `Google API error: ${response.status} ${response.statusText}`;
      }
      
      // Add error details from the response if available
      if (errorData.error) {
        if (errorData.error.message) {
          error.message = errorData.error.message;
        }
        if (errorData.error.status) {
          error.reason = errorData.error.status;
        }
        if (errorData.error.details) {
          error.details = errorData.error.details;
        }
      }
      
      throw error;
    }

    const data = await response.json();
    
    // Convert Gemini response to standard format
    return convertFromGeminiFormat(data);
  } catch (error) {
    console.error('Error sending Google request:', error);
    throw error;
  }
};

/**
 * Sends a request to the OpenAI API
 */
const sendOpenAIRequest = async (model, apiKey, messages, options) => {
  const { temperature, maxTokens, files = [] } = options;
  
  try {
    // Handle image generation
    if (model === 'dall-e-3') {
      return sendDallERequest(apiKey, messages[messages.length - 1].content, options);
    }
    
    // Convert files to OpenAI format if needed
    const openAIMessages = await convertToOpenAIFormat(messages, files);
    
    const endpoint = model.includes('gpt') ? 'chat/completions' : 'completions';
    
    const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: openAIMessages,
        temperature,
        ...(maxTokens && { max_tokens: maxTokens })
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Create a detailed error object
      const error = new Error();
      error.status = response.status;
      error.statusText = response.statusText;
      
      // Add specific error message for common status codes
      if (response.status === 429) {
        error.message = "Too many requests. The OpenAI API rate limit has been exceeded.";
        error.code = "RATE_LIMIT_EXCEEDED";
      } else if (response.status === 401 || response.status === 403) {
        error.message = "Authentication failed. Please check your API key.";
        error.code = "AUTHENTICATION_ERROR";
      } else {
        error.message = `OpenAI API error: ${response.status} ${response.statusText}`;
      }
      
      // Add error details from the response if available
      if (errorData.error) {
        if (errorData.error.message) {
          error.message = errorData.error.message;
        }
        if (errorData.error.type) {
          error.reason = errorData.error.type;
        }
        if (errorData.error.code) {
          error.code = errorData.error.code;
        }
      }
      
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending OpenAI request:', error);
    throw error;
  }
};

/**
 * Sends an image generation request to DALL-E
 */
const sendDallERequest = async (apiKey, prompt, options) => {
  const { size = '1024x1024', quality = 'standard' } = options;
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Create a detailed error object
      const error = new Error();
      error.status = response.status;
      error.statusText = response.statusText;
      
      // Add specific error message for common status codes
      if (response.status === 429) {
        error.message = "Too many requests. The DALL-E API rate limit has been exceeded.";
        error.code = "RATE_LIMIT_EXCEEDED";
      } else if (response.status === 401 || response.status === 403) {
        error.message = "Authentication failed. Please check your API key.";
        error.code = "AUTHENTICATION_ERROR";
      } else {
        error.message = `DALL-E API error: ${response.status} ${response.statusText}`;
      }
      
      // Add error details from the response if available
      if (errorData.error) {
        if (errorData.error.message) {
          error.message = errorData.error.message;
        }
        if (errorData.error.type) {
          error.reason = errorData.error.type;
        }
        if (errorData.error.code) {
          error.code = errorData.error.code;
        }
      }
      
      throw error;
    }

    const data = await response.json();
    
    // Convert DALL-E response to standard format
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: data.data[0].url
          }
        }
      ],
      model: 'dall-e-3',
      created: Date.now(),
      raw: data
    };
  } catch (error) {
    console.error('Error sending DALL-E request:', error);
    throw error;
  }
};

/**
 * Converts messages to Gemini format
 */
const convertToGeminiFormat = (messages, files = []) => {
  return messages.map(message => {
    const { role, content } = message;
    
    // Handle text-only messages
    if (typeof content === 'string' && !files.length) {
      return {
        role: role === 'user' ? 'user' : 'model',
        parts: [{ text: content }]
      };
    }
    
    // Handle messages with files
    const parts = [];
    
    if (typeof content === 'string') {
      parts.push({ text: content });
    }
    
    // Add files as inline parts
    if (files.length && role === 'user') {
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          parts.push({
            inlineData: {
              mimeType: file.type,
              data: file.data // Base64 encoded data
            }
          });
        }
      });
    }
    
    return {
      role: role === 'user' ? 'user' : 'model',
      parts
    };
  });
};

/**
 * Converts Gemini response to standard format
 */
const convertFromGeminiFormat = (response) => {
  if (!response.candidates || !response.candidates.length) {
    throw new Error('Invalid Gemini response format');
  }
  
  const candidate = response.candidates[0];
  const content = candidate.content.parts.map(part => part.text).join('');
  
  return {
    choices: [
      {
        message: {
          role: 'assistant',
          content
        }
      }
    ],
    model: response.modelId || 'gemini',
    created: Date.now(),
    raw: response
  };
};

/**
 * Converts messages to OpenAI format
 */
const convertToOpenAIFormat = async (messages, files = []) => {
  const result = [];
  
  // Process each message
  for (const message of messages) {
    const { role, content } = message;
    
    // Handle text-only messages
    if (typeof content === 'string' && !files.length) {
      result.push({
        role: role === 'system' ? 'system' : role === 'user' ? 'user' : 'assistant',
        content
      });
      continue;
    }
    
    // Handle messages with files
    const newMessage = {
      role: role === 'system' ? 'system' : role === 'user' ? 'user' : 'assistant',
      content: []
    };
    
    if (typeof content === 'string') {
      newMessage.content.push({
        type: 'text',
        text: content
      });
    }
    
    // Add files as content parts
    if (files.length && role === 'user') {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          newMessage.content.push({
            type: 'image_url',
            image_url: {
              url: file.data, // Base64 encoded data or URL
              detail: 'auto'
            }
          });
        }
      }
    }
    
    result.push(newMessage);
  }
  
  return result;
};

/**
 * Generates an image using the appropriate provider
 */
export const generateImage = async (provider, model, apiKey, prompt, options = {}) => {
  switch (provider) {
    case 'openai':
      return sendDallERequest(apiKey, prompt, options);
    case 'google':
      // Google uses the same endpoint for text and image generation
      return sendGoogleRequest('gemini-1.5-pro', apiKey, [{ role: 'user', content: `Generate an image: ${prompt}` }], options);
    default:
      throw new Error(`Image generation not supported for provider: ${provider}`);
  }
};

/**
 * Generates a video using the appropriate provider
 */
export const generateVideo = async (provider, model, apiKey, prompt, options = {}) => {
  switch (provider) {
    case 'google':
      if (model === 'gemini-1.5-pro') {
        return sendGoogleRequest(model, apiKey, [{ role: 'user', content: `Generate a video: ${prompt}` }], options);
      }
      throw new Error(`Video generation not supported for model: ${model}`);
    default:
      throw new Error(`Video generation not supported for provider: ${provider}`);
  }
};

/**
 * Gets all available models for a specific capability
 */
export const getModelsForCapability = (providers, capability) => {
  const result = [];
  
  Object.entries(providers).forEach(([providerKey, provider]) => {
    if (provider.enabled) {
      const models = provider.models.filter(model => 
        model.enabled && model.capabilities.includes(capability)
      );
      
      if (models.length) {
        result.push({
          provider: providerKey,
          providerName: provider.name,
          models: models.map(model => ({
            id: model.id,
            name: model.name
          }))
        });
      }
    }
  });
  
  return result;
};

/**
 * Gets all providers with their models
 */
export const getAllProviders = () => {
  return DEFAULT_PROVIDERS;
};

export default {
  sendChatRequest,
  generateImage,
  generateVideo,
  getModelsForCapability,
  getAllProviders
}; 