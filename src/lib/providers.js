// AI SDK providers and models with capabilities
export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI models including GPT-4 and GPT-3.5',
    models: [
      { id: 'gpt-4.1', name: 'gpt-4.1', description: 'New text-only model', capabilities: ['text'] },
      { id: 'gpt-4.1-mini', name: 'gpt-4.1-mini', description: 'New text-only model', capabilities: ['text'] },
      { id: 'gpt-4.1-nano', name: 'gpt-4.1-nano', description: 'New text-only model', capabilities: ['text'] },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most advanced model with vision capabilities', capabilities: ['text', 'image'] },
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini', description: 'New text-only model', capabilities: ['text'] },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast and powerful for complex tasks', capabilities: ['text'] },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Balanced performance and cost', capabilities: ['text'] },
      { id: 'o1', name: 'o1', description: 'New text-only model', capabilities: ['text'] },
      { id: 'o1-mini', name: 'o1-mini', description: 'New text-only model', capabilities: ['text'] }
    ],
    requiresKey: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models from Anthropic',
    models: [
      { id: 'claude-4-opus-20250514', name: 'claude-4-opus-20250514', description: 'Latest model from athropic', capabilities: ['text'] },
      { id: 'claude-4-sonnet-20250514', name: 'claude-4-sonnet-20250514', description: 'Latest thinking model from anthropic', capabilities: ['text'] },
      { id: 'claude-3-7-sonnet-20250219', name: 'claude-3-7-sonnet-20250219', description: 'Most used athropic model', capabilities: ['text'] },
      { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet-20241022', description: 'New text-only model', capabilities: ['text'] },
      { id: 'claude-3-5-sonnet-20240620', name: 'claude-3-5-sonnet-20240620', description: 'New text-only model', capabilities: ['text'] },
      { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku-20241022', description: 'New text-only model', capabilities: ['text'] },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable Claude model', capabilities: ['text', 'image'] },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed', capabilities: ['text', 'image'] },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient responses', capabilities: ['text', 'image'] }
    ],
    requiresKey: true
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini models from Google',
    models: [
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview 05-20', description: 'Adaptive thinking, cost efficiency', capabilities: ['text'] },
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro Preview', description: 'Enhanced thinking, reasoning, and multimodal understanding', capabilities: ['text', 'audio', 'image', 'video'] },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Next-gen features, speed, and thinking', capabilities: ['text'] },
      { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Preview (Image Generation)', description: 'Conversational image generation and editing', capabilities: ['text', 'image'] },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', description: 'Cost efficiency and low latency', capabilities: ['text'] },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and versatile performance', capabilities: ['text'] },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B', description: 'High volume and lower intelligence tasks', capabilities: ['text'] },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Complex reasoning tasks', capabilities: ['text'] }
    ],
    requiresKey: true
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Mistral AI models',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most powerful Mistral model', capabilities: ['text'] },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced performance and efficiency', capabilities: ['text'] },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast and cost-effective', capabilities: ['text'] }
    ],
    requiresKey: true
  }
]; 