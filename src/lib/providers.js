// AI SDK providers and models with capabilities
export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI models including GPT-4 and GPT-3.5',
    models: [
      { id: 'gpt-4.1', name: 'gpt-4.1', description: 'New text-only model', capabilities: ['text'] , vision:true},
      { id: 'gpt-4.1-mini', name: 'gpt-4.1-mini', description: 'New text-only model', capabilities: ['text'] , vision:true},
      { id: 'gpt-4.1-nano', name: 'gpt-4.1-nano', description: 'New text-only model', capabilities: ['text'] , vision:true},
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most advanced model with vision capabilities', capabilities: ['text', 'image'] , vision:true},
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini', description: 'New text-only model', capabilities: ['text'] , vision:true},
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast and powerful for complex tasks', capabilities: ['text'] , vision:true},
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Balanced performance and cost', capabilities: ['text'] , vision:true},
      { id: 'o1', name: 'o1', description: 'New text-only model', capabilities: ['text'] , vision:true},
      { id: 'o1-mini', name: 'o1-mini', description: 'New text-only model', capabilities: ['text'] , vision:true}
    ],
    requiresKey: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models from Anthropic',
    models: [
      { id: 'claude-4-opus-20250514', name: 'claude-4-opus-20250514', description: 'Latest model from athropic', capabilities: ['text'], attachments:["image, "] , vision:true,},
      { id: 'claude-4-sonnet-20250514', name: 'claude-4-sonnet-20250514', description: 'Latest thinking model from anthropic', capabilities: ['text'] , vision:true,},
      { id: 'claude-3-7-sonnet-20250219', name: 'claude-3-7-sonnet-20250219', description: 'Most used athropic model', capabilities: ['text'] , vision:true,},
      { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet-20241022', description: 'New text-only model', capabilities: ['text'] ,vision:true,},
      { id: 'claude-3-5-sonnet-20240620', name: 'claude-3-5-sonnet-20240620', description: 'New text-only model', capabilities: ['text'],vision:true, },
      { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku-20241022', description: 'New text-only model', capabilities: ['text'] ,vision:true},
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable Claude model', capabilities: ['text', 'image'] ,vision:false},
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed', capabilities: ['text', 'image'] ,vision:false},
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient responses', capabilities: ['text', 'image'] ,vision:false}
    ],
    requiresKey: true
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini models from Google',
    models: [
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview 05-20', description: 'Adaptive thinking, cost efficiency', capabilities: ['text'] , vision:true,},
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro Preview', description: 'Enhanced thinking, reasoning, and multimodal understanding', capabilities: ['text'] , vision:true,},
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Next-gen features, speed, and thinking', capabilities: ['text'] , vision:true,},
      { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Preview (Image Generation)', description: 'Conversational image generation and editing', capabilities: ['text', 'image'] , vision:true,},
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', description: 'Cost efficiency and low latency', capabilities: ['text'] , vision:true},
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and versatile performance', capabilities: ['text'] , vision:false},
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B', description: 'High volume and lower intelligence tasks', capabilities: ['text'] , vision:false},
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Complex reasoning tasks', capabilities: ['text'] , vision:false}
    ],
    requiresKey: true
  },
  {
    id: 'echoed',
    name: 'Models provided by directly via echoed. No api key required',
    description: 'Model provided by directly via echoed. If you need vision capabilities in gemini, please use your own api key.',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (No vision)', description: ' State of the art AI model from google.Often seen as most well rounded model currenly avilable.', capabilities: [
        'text'], vision:false },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (No vision)', description: 'Cut Down version of Gemini 2.5 Pro. It is faster and cheaper but less powerful than Gemini 2.5 Pro.', capabilities: ['text'] , vision:false},
      { id: 'imgen', name: 'Imgen 4/3', description: 'State of the artImage generation model From google. Depending on usages we will select either Imgen 4 or Imgen 3.', capabilities: ['image'] , vision:false,},
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 0528', description: 'open-source large language model specializing in complex reasoning, mathematics, and programming task', capabilities: ['text'] , vision:false},
      { id: 'deepseek-ai/DeepSeek-V3-0324', name: 'DeepSeek V3 0324', description: 'improved version of DeepSeek-V3 that shows enhanced performance in reasoning, coding, Chinese writing, and function calling', capabilities: ['text'] },
      { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen3 235B A22B', description: 'Qwen3-235B-A22B is a 235B-parameter mixture-of-experts model (with 22B active parameters) that excels at reasoning, coding, and multilingual tasks through its unique ability to switch between thinking and non-thinking', capabilities: ['text'] },
      { id: 'chutesai/Mistral-Small-3.1-24B-Instruct-2503', name: 'Mistral Small 3.1 24B - Vision', description: ' Mistral Small 3.1 is a 24B parameter multimodal open-source LLM with vision capabilities and 128k context that excels at conversational AI, programming, and reasoning tasks while being deployable on consumer hardware.', capabilities: ['text'],vision:true },
      { id: 'chutesai/Llama-4-Maverick-17B-128E-Instruct-FP8', name: 'Llama 4 Maverick 17B -Vision', description: ' Meta\'s Llama 4 is a multimodal AI model with two variants (17B activated parameters each, but up to 400B total parameters) that can understand text and images across 12 languages.', capabilities: ['text'],vision:true },
      { id: 'chutes-hidream', name: 'Hidream', description: ' image generation model.', capabilities: ['image'], vision:false },
      { id: 'chutes-chroma', name: 'Chroma', description: ' image generation model.', capabilities: ['image'], vision:false },

    ],
    requiresKey: false
  },
]; 