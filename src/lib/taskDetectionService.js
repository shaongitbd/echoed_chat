import modelService from './modelService';

/**
 * Task types that can be detected from user input
 */
export const TASK_TYPES = {
  GENERAL_CHAT: 'general_chat',
  CODE_GENERATION: 'code_generation',
  CREATIVE_WRITING: 'creative_writing',
  IMAGE_GENERATION: 'image_generation',
  VIDEO_GENERATION: 'video_generation',
  DATA_ANALYSIS: 'data_analysis',
  WEB_SEARCH: 'web_search',
  DOCUMENT_ANALYSIS: 'document_analysis'
};

/**
 * Map of task types to the capabilities they require
 */
const TASK_CAPABILITY_MAP = {
  [TASK_TYPES.GENERAL_CHAT]: ['text'],
  [TASK_TYPES.CODE_GENERATION]: ['text'],
  [TASK_TYPES.CREATIVE_WRITING]: ['text'],
  [TASK_TYPES.IMAGE_GENERATION]: ['image'],
  [TASK_TYPES.VIDEO_GENERATION]: ['video'],
  [TASK_TYPES.DATA_ANALYSIS]: ['text'],
  [TASK_TYPES.WEB_SEARCH]: ['text'],
  [TASK_TYPES.DOCUMENT_ANALYSIS]: ['text']
};

/**
 * Map of task types to the providers that are recommended for them
 * Listed in order of preference
 */
const TASK_PROVIDER_PREFERENCE = {
  [TASK_TYPES.GENERAL_CHAT]: ['openai', 'anthropic', 'google', 'openrouter', 'replit'],
  [TASK_TYPES.CODE_GENERATION]: ['replit', 'openai', 'google', 'openrouter'],
  [TASK_TYPES.CREATIVE_WRITING]: ['anthropic', 'openai', 'google', 'openrouter'],
  [TASK_TYPES.IMAGE_GENERATION]: ['openai', 'google', 'stability'],
  [TASK_TYPES.VIDEO_GENERATION]: ['google', 'openai'],
  [TASK_TYPES.DATA_ANALYSIS]: ['openai', 'google', 'anthropic'],
  [TASK_TYPES.WEB_SEARCH]: ['google', 'openai', 'anthropic'],
  [TASK_TYPES.DOCUMENT_ANALYSIS]: ['anthropic', 'openai', 'google']
};

/**
 * Patterns to detect different task types
 */
const TASK_DETECTION_PATTERNS = [
  {
    type: TASK_TYPES.CODE_GENERATION,
    patterns: [
      /write (a|some) code/i,
      /generate (a|some) code/i,
      /create (a|some|an) (function|class|module|component)/i,
      /implement (a|an|the)/i,
      /how (do|would) I code/i,
      /write (a|an) (javascript|python|java|c\+\+|typescript|react|html|css)/i,
      /can you (help me|assist|write|fix|debug) (with|my|this) code/i,
      /function\s*\(/i,
      /class\s+\w+/i,
      /import\s+\w+/i,
      /const\s+\w+\s*=/i,
      /let\s+\w+\s*=/i,
      /var\s+\w+\s*=/i,
      /<\w+>\s*<\/\w+>/i
    ]
  },
  {
    type: TASK_TYPES.CREATIVE_WRITING,
    patterns: [
      /write (a|an) (story|poem|essay|article|blog post)/i,
      /create (a|an) (story|narrative|description)/i,
      /generate (a|an|some) (creative|imaginative)/i,
      /compose (a|an) (poem|song|letter)/i,
      /tell (me|us) (a|an) (story|tale)/i,
      /help me write (a|an)/i
    ]
  },
  {
    type: TASK_TYPES.IMAGE_GENERATION,
    patterns: [
      /generate (a|an) image/i,
      /create (a|an) image/i,
      /make (a|an) image/i,
      /draw (a|an|some)/i,
      /picture of/i,
      /photo of/i,
      /image of/i,
      /visual(ize|ization) of/i,
      /can you (create|generate|make|draw) (a|an) (picture|image|illustration)/i
    ]
  },
  {
    type: TASK_TYPES.VIDEO_GENERATION,
    patterns: [
      /generate (a|an) video/i,
      /create (a|an) video/i,
      /make (a|an) video/i,
      /animate/i,
      /video of/i,
      /animation of/i,
      /moving image/i,
      /can you (create|generate|make) (a|an) (video|animation|clip)/i
    ]
  },
  {
    type: TASK_TYPES.DATA_ANALYSIS,
    patterns: [
      /analyze (this|these|the) data/i,
      /(analyze|examine|study) (this|these|the) (numbers|statistics|data set|dataset)/i,
      /what (do|does) (this|these|the) (numbers|statistics|data) (mean|show|indicate)/i,
      /interpret (this|these|the) (data|numbers|statistics|results)/i,
      /data visualization/i,
      /create (a|an) (chart|graph|visualization)/i
    ]
  },
  {
    type: TASK_TYPES.WEB_SEARCH,
    patterns: [
      /search (for|about)/i,
      /find information (about|on)/i,
      /look up/i,
      /what is the latest/i,
      /news about/i,
      /current information on/i,
      /recent developments in/i,
      /what happened to/i,
      /who is/i,
      /when (did|was)/i,
      /where is/i,
      /how many/i,
      /what are/i
    ]
  },
  {
    type: TASK_TYPES.DOCUMENT_ANALYSIS,
    patterns: [
      /analyze (this|these|the) (document|text|article|paper)/i,
      /summarize (this|these|the) (document|text|article|paper)/i,
      /extract (information|data|key points) from/i,
      /read (this|these|the) (document|text|article|paper)/i,
      /what does (this|these|the) (document|text|article|paper) say/i
    ]
  }
];

/**
 * Detects the most likely task type based on user input
 * @param {string} input - The user's message
 * @returns {string} - The detected task type
 */
export const detectTaskType = (input) => {
  // Default to general chat if input is empty or too short
  if (!input || input.length < 5) {
    return TASK_TYPES.GENERAL_CHAT;
  }
  
  // Check for matches against each task type pattern
  for (const { type, patterns } of TASK_DETECTION_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return type;
      }
    }
  }
  
  // Default to general chat if no patterns match
  return TASK_TYPES.GENERAL_CHAT;
};

/**
 * Gets the required capabilities for a task type
 * @param {string} taskType - The detected task type
 * @returns {string[]} - Array of required capabilities
 */
export const getTaskCapabilities = (taskType) => {
  return TASK_CAPABILITY_MAP[taskType] || ['text'];
};

/**
 * Recommends the best model for a task based on available providers and models
 * @param {object} userSettings - The user's settings containing enabled providers
 * @param {string} taskType - The detected task type
 * @returns {object|null} - The recommended provider and model, or null if none found
 */
export const recommendModel = (userSettings, taskType) => {
  if (!userSettings || !userSettings.providers) {
    return null;
  }
  
  const requiredCapabilities = getTaskCapabilities(taskType);
  const preferredProviders = TASK_PROVIDER_PREFERENCE[taskType] || [];
  
  // Try to find a model from preferred providers first
  for (const providerName of preferredProviders) {
    const provider = userSettings.providers.find(p => 
      p.name.toLowerCase() === providerName.toLowerCase() && p.enabled
    );
    
    if (provider) {
      const suitableModels = provider.models.filter(model => 
        model.enabled && requiredCapabilities.every(cap => model.capabilities.includes(cap))
      );
      
      if (suitableModels.length > 0) {
        // Sort models by preference if there are multiple options
        return {
          provider: provider.name,
          model: suitableModels[0].id
        };
      }
    }
  }
  
  // If no preferred provider models found, try any enabled provider with suitable models
  for (const provider of userSettings.providers) {
    if (provider.enabled) {
      const suitableModels = provider.models.filter(model => 
        model.enabled && requiredCapabilities.every(cap => model.capabilities.includes(cap))
      );
      
      if (suitableModels.length > 0) {
        return {
          provider: provider.name,
          model: suitableModels[0].id
        };
      }
    }
  }
  
  return null;
};

/**
 * Gets a user-friendly description of a task type
 * @param {string} taskType - The detected task type
 * @returns {string} - Human-readable description
 */
export const getTaskTypeDescription = (taskType) => {
  const descriptions = {
    [TASK_TYPES.GENERAL_CHAT]: 'General conversation',
    [TASK_TYPES.CODE_GENERATION]: 'Code generation',
    [TASK_TYPES.CREATIVE_WRITING]: 'Creative writing',
    [TASK_TYPES.IMAGE_GENERATION]: 'Image generation',
    [TASK_TYPES.VIDEO_GENERATION]: 'Video generation',
    [TASK_TYPES.DATA_ANALYSIS]: 'Data analysis',
    [TASK_TYPES.WEB_SEARCH]: 'Web search',
    [TASK_TYPES.DOCUMENT_ANALYSIS]: 'Document analysis'
  };
  
  return descriptions[taskType] || 'General task';
}; 