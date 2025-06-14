import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { PROVIDERS } from '../lib/providers';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { appwriteService } from '../lib/appwrite';

const ModelSelection = () => {
  const navigate = useNavigate();
  const { user, updateUserPreferences } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Selected providers and models - initialize with nothing selected by default
  const [selectedProviders, setSelectedProviders] = useState({
    openai: {
      selected: false,
      apiKey: '',
      models: {}
    },
    anthropic: {
      selected: false,
      apiKey: '',
      models: {}
    },
    google: {
      selected: false,
      apiKey: '',
      models: {}
    },
   
    echoed: {
      selected: false,
      apiKey: '',
      models: {}
    }
  });
  
  // Load user preferences on component mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user && user.$id && !isInitialized) {
        try {
          setIsLoading(true);
          console.log('Loading user preferences for user:', user.$id);
          
          // Get the full user profile from the database
          const userProfile = await appwriteService.getUserProfile(user.$id);
          console.log('User profile loaded:', userProfile);
          
          // Check if user has preferences
          if (userProfile && userProfile.preferences) {
            let userPrefs;
            
            // Parse preferences if it's a string
            if (typeof userProfile.preferences === 'string') {
              userPrefs = JSON.parse(userProfile.preferences);
            } else {
              userPrefs = userProfile.preferences;
            }
            
            console.log('Parsed user preferences:', userPrefs);
            
            if (userPrefs && userPrefs.providers) {
              const newSelectedProviders = { ...selectedProviders };
              
              // Process each provider from user preferences
              userPrefs.providers.forEach(provider => {
                if (newSelectedProviders[provider.name]) {
                  console.log(`Setting up provider ${provider.name}`);
                  
                  // Update provider selection and API key
                  newSelectedProviders[provider.name].selected = provider.enabled;
                  newSelectedProviders[provider.name].apiKey = provider.apiKey || '';
                  
                  // Reset models
                  newSelectedProviders[provider.name].models = {};
                  
                  // Set selected models
                  if (provider.models && Array.isArray(provider.models)) {
                    provider.models.forEach(model => {
                      if (model.enabled) {
                        console.log(`Enabling model ${model.id} for ${provider.name}`);
                        newSelectedProviders[provider.name].models[model.id] = true;
                      }
                    });
                  }
                }
              });
              
              console.log('Setting selected providers state:', newSelectedProviders);
              setSelectedProviders(newSelectedProviders);
            }
          } else {
            // If no preferences found, don't select anything by default
            console.log('No preferences found, leaving all providers unselected');
          }
          
          setIsInitialized(true);
        } catch (error) {
          console.error('Error loading user preferences:', error);
          toast.error('Failed to load your preferences');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadUserPreferences();
  }, [user, isInitialized]);
  
  // Handle provider selection toggle
  const toggleProvider = (providerId) => {
    setSelectedProviders(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        selected: !prev[providerId].selected
      }
    }));
  };
  
  // Handle model selection toggle
  const toggleModel = (providerId, modelId) => {
    setSelectedProviders(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        models: {
          ...prev[providerId].models,
          [modelId]: !prev[providerId].models[modelId]
        }
      }
    }));
  };
  
  // Handle API key change
  const handleApiKeyChange = (providerId, value) => {
    setSelectedProviders(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        apiKey: value
      }
    }));
    
    // Clear previous test result when key changes
    setTestResults(prev => ({
      ...prev,
      [providerId]: null
    }));
  };
  
  // Test API key directly using AI SDK
  const testApiKey = async (providerId) => {
    setIsTesting(providerId);
    
    try {
      const apiKey = selectedProviders[providerId].apiKey;
      
      if (!apiKey) {
        toast.error(`Please enter an API key for ${getProviderName(providerId)}`);
        setIsTesting(false);
        return;
      }
      
      let isValid = false;
      
      // Test the API key directly using AI SDK
      try {
        switch (providerId) {
          case 'openai':
            // Test OpenAI API key with a simple models list request
            const openaiProvider = createOpenAI({ apiKey });
            await openaiProvider.listModels();
            isValid = true;
            break;
            
          case 'anthropic':
            // Test Anthropic API key with a simple completion request
            const anthropicProvider = createAnthropic({ apiKey });
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
            const googleProvider = createGoogleGenerativeAI({ apiKey });
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
            const mistralProvider = createMistral({ apiKey });
            const mistralModel = mistralProvider('mistral-tiny');
            await generateText({
              model: mistralModel,
              prompt: 'Hello',
              maxTokens: 1,
            });
            isValid = true;
            break;
            
          default:
            toast.error(`Unsupported provider: ${providerId}`);
        }
      } catch (testError) {
        console.error(`Error testing ${providerId} API key:`, testError);
        toast.error(`Invalid ${getProviderName(providerId)} API key: ${testError.message || 'Unknown error'}`);
        isValid = false;
      }
      
      setTestResults(prev => ({
        ...prev,
        [providerId]: isValid
      }));
      
      if (isValid) {
        toast.success(`${getProviderName(providerId)} API key is valid`);
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      toast.error(`Error testing ${getProviderName(providerId)} API key`);
      
      setTestResults(prev => ({
        ...prev,
        [providerId]: false
      }));
    } finally {
      setIsTesting(false);
    }
  };
  
  // Helper to get provider name by ID
  const getProviderName = (providerId) => {
    const provider = PROVIDERS.find(p => p.id === providerId);
    return provider ? provider.name : providerId;
  };
  
  // Save preferences and continue
  const handleSaveAndContinue = async () => {
    setIsLoading(true);
    
    try {
      // Format data for AI SDK compatibility
      const providers = Object.entries(selectedProviders)
        .filter(([_, data]) => data.selected)
        .map(([providerId, data]) => {
          // Get selected model IDs
          const selectedModelIds = Object.entries(data.models)
            .filter(([_, selected]) => selected)
            .map(([modelId]) => modelId);
          
          // Get model details including capabilities
          const modelDetails = selectedModelIds.map(modelId => {
            const providerInfo = PROVIDERS.find(p => p.id === providerId);
            const modelInfo = providerInfo?.models.find(m => m.id === modelId);
            
            return {
              id: modelId,
              enabled: true,
              capabilities: modelInfo?.capabilities || ['text']
            };
          });
          
          return {
            name: providerId,
            enabled: true,
            apiKey: data.apiKey,
            models: modelDetails
          };
        });
      
      // Validate that at least one provider and model is selected
      if (providers.length === 0) {
        toast.error('Please select at least one provider');
        setIsLoading(false);
        return;
      }
      
      const hasModels = providers.some(provider => provider.models.length > 0);
      
      if (!hasModels) {
        toast.error('Please select at least one model');
        setIsLoading(false);
        return;
      }
      
      // Check if API keys are provided for selected providers
      const missingKeys = providers.filter(
        provider => PROVIDERS.find(p => p.id === provider.name).requiresKey && !provider.apiKey
      );
      
      if (missingKeys.length > 0) {
        const missingProviders = missingKeys.map(p => getProviderName(p.name)).join(', ');
        toast.error(`Please provide API keys for: ${missingProviders}`);
        setIsLoading(false);
        return;
      }
      
      // Check if API keys have been tested and are valid
      const untestedKeys = providers.filter(
        provider => PROVIDERS.find(p => p.id === provider.name).requiresKey && 
                    testResults[provider.name] !== true
      );
      
      if (untestedKeys.length > 0) {
        const untestedProviders = untestedKeys.map(p => getProviderName(p.name)).join(', ');
        toast.error(`Please test the API keys for: ${untestedProviders}`);
        setIsLoading(false);
        return;
      }
      
      // Set default provider and model
      const defaultProvider = providers[0].name;
      const defaultModel = providers[0].models[0].id;
      
      const preferences = {
        providers,
        defaultProvider,
        defaultModel
      };
      
      console.log('Saving preferences:', preferences);
      
      // Save preferences to user account
      await updateUserPreferences(preferences);
      
      toast.success('Preferences saved successfully');
      navigate('/chat'); // Redirect to chat page
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Skip setup and use defaults
  const handleSkip = () => {
    // Use OpenAI as default provider with gpt-4o as default model
    const defaultPreferences = {
      providers: [
        {
          name: 'openai',
          enabled: true,
          apiKey: '',
          models: [
            {
              id: 'gpt-4o',
              enabled: true,
              capabilities: ['text', 'image']
            },
            {
              id: 'gpt-3.5-turbo',
              enabled: true,
              capabilities: ['text']
            }
          ]
        }
      ],
      defaultProvider: 'openai',
      defaultModel: 'gpt-4o'
    };
    
    updateUserPreferences(defaultPreferences)
      .then(() => {
        toast.info('Using default OpenAI models');
        navigate('/chat');
      })
      .catch(error => {
        console.error('Error setting default preferences:', error);
        toast.error('Failed to set default preferences');
      });
  };
  
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
    
      
      <div className="flex-1 overflow-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Choose Your AI Models</h1>
            <p className="mt-2 text-lg text-gray-600">
              Select which AI providers and models you'd like to use
            </p>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="p-6">
              <div className="space-y-8">
                {PROVIDERS.map((provider) => (
                  <div key={provider.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`provider-${provider.id}`}
                          checked={selectedProviders[provider.id]?.selected || false}
                          onChange={() => toggleProvider(provider.id)}
                          className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`provider-${provider.id}`} className="ml-3 block text-lg font-medium text-gray-900">
                          {provider.name}
                        </label>
                      </div>
                    </div>
                    
                    {selectedProviders[provider.id]?.selected && (
                      <div className="ml-7 space-y-4">
                        <p className="text-sm text-gray-500">{provider.description}</p>
                        
                        {provider.requiresKey && (
                          <div>
                            <label htmlFor={`apikey-${provider.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                              API Key
                            </label>
                            <div className="flex items-center">
                              <input
                                type="password"
                                id={`apikey-${provider.id}`}
                                value={selectedProviders[provider.id]?.apiKey || ''}
                                onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                                placeholder={`Enter your ${provider.name} API key`}
                                className="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                              <button
                                type="button"
                                onClick={() => testApiKey(provider.id)}
                                disabled={!selectedProviders[provider.id]?.apiKey || isTesting === provider.id}
                                className="ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                {isTesting === provider.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Test'
                                )}
                              </button>
                            </div>
                            {testResults[provider.id] === true && (
                              <p className="mt-1 text-sm text-green-600 flex items-center">
                                <Check className="h-4 w-4 mr-1" />
                                API key is valid
                              </p>
                            )}
                            {testResults[provider.id] === false && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Invalid API key
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Available Models</h4>
                          <div className="space-y-2">
                            {provider.models.map((model) => (
                              <div key={model.id} className="flex items-start">
                                <input
                                  type="checkbox"
                                  id={`model-${provider.id}-${model.id}`}
                                  checked={selectedProviders[provider.id]?.models?.[model.id] || false}
                                  onChange={() => toggleModel(provider.id, model.id)}
                                  className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded mt-1"
                                />
                                <div className="ml-3">
                                  <label htmlFor={`model-${provider.id}-${model.id}`} className="block text-sm font-medium text-gray-900">
                                    {model.name}
                                  </label>
                                  <p className="text-xs text-gray-500">{model.description}</p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {model.capabilities.map((capability) => (
                                      <span
                                        key={capability}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                      >
                                        {capability}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleSkip}
              className="text-gray-700 font-medium hover:text-gray-900"
            >
              Skip for now
            </button>
            
            <button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelection;
