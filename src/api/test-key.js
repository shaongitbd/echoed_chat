import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';

/**
 * Test an API key for a specific provider
 * @param {Object} req - Request object
 * @returns {Promise<Response>} - Response with validation result
 */
export async function handleTestKeyRequest(req) {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Provider and API key are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    let isValid = false;
    let error = '';
    
    // Test the API key based on the provider
    try {
      switch (provider) {
        case 'openai':
          // Test OpenAI API key with a simple models list request
          const openaiProvider = createOpenAI({
            apiKey: apiKey
          });
          await openaiProvider.listModels();
          isValid = true;
          break;
          
        case 'anthropic':
          // Test Anthropic API key with a simple completion request
          const anthropicProvider = createAnthropic({
            apiKey: apiKey
          });
          const anthropicModel = anthropicProvider('claude-3-haiku-20240307');
          await generateText({
            model: anthropicModel,
            prompt: 'Hello',
            maxTokens: 1,
          });
          isValid = true;
          break;
          
        case 'google':
          // Test Google API key with a simple text generation
          const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey
          });
          const googleModel = googleProvider('gemini-1.5-flash');
          await generateText({
            model: googleModel,
            prompt: 'Hello',
            maxTokens: 1,
          });
          isValid = true;
          break;
          
        case 'mistral':
          // Test Mistral API key with a simple completion request
          const mistralProvider = createMistral({
            apiKey: apiKey,
          });
          const mistralModel = mistralProvider('mistral-tiny');
          await generateText({
            model: mistralModel,
            prompt: 'Hello',
            maxTokens: 1,
          });
          isValid = true;
          break;
          
        default:
          error = `Unsupported provider: ${provider}`;
      }
    } catch (testError) {
      console.error(`Error testing ${provider} API key:`, testError);
      error = testError.message || `Invalid ${provider} API key`;
    }

    return new Response(JSON.stringify({ valid: isValid, error }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handleTestKeyRequest:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}