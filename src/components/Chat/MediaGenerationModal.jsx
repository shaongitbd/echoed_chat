import React, { useState, useEffect } from 'react';
import { X, Image, Video, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import modelService from '../../lib/modelService';
import { useSettings } from '../../contexts/SettingsContext';

const MediaGenerationModal = ({ onClose, onGenerate, mediaType = 'image' }) => {
  const { userSettings } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState({});
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  
  // Load available providers and models when component mounts
  useEffect(() => {
    const loadProviders = () => {
      if (userSettings && userSettings.providers) {
        // Filter providers that have models with the requested capability
        const filteredProviders = userSettings.providers.reduce((acc, provider) => {
          if (provider.enabled) {
            const modelsWithCapability = provider.models.filter(
              model => model.enabled && model.capabilities.includes(mediaType)
            );
            
            if (modelsWithCapability.length > 0) {
              acc[provider.name] = {
                name: provider.name,
                models: modelsWithCapability
              };
            }
          }
          return acc;
        }, {});
        
        setProviders(filteredProviders);
        
        // Set first provider and model as default
        const providerEntries = Object.entries(filteredProviders);
        if (providerEntries.length > 0) {
          const [firstProviderKey, firstProvider] = providerEntries[0];
          setSelectedProvider(firstProviderKey);
          
          if (firstProvider.models.length > 0) {
            setSelectedModel(firstProvider.models[0].id);
          }
        }
      }
    };
    
    loadProviders();
  }, [userSettings, mediaType]);
  
  // Handle provider change
  const handleProviderChange = (e) => {
    const providerKey = e.target.value;
    setSelectedProvider(providerKey);
    
    // Set first model of the selected provider
    if (providers[providerKey] && providers[providerKey].models.length > 0) {
      setSelectedModel(providers[providerKey].models[0].id);
    } else {
      setSelectedModel('');
    }
  };
  
  // Handle model change
  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };
  
  // Handle generate
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select a provider and model');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get API key
      const providerSettings = userSettings.providers.find(p => p.name === selectedProvider);
      const apiKey = providerSettings?.apiKey;
      
      if (!apiKey) {
        toast.error(`No API key found for ${selectedProvider}. Please add one in settings.`);
        return;
      }
      
      let result;
      if (mediaType === 'image') {
        result = await modelService.generateImage(
          selectedProvider,
          selectedModel,
          apiKey,
          prompt
        );
        setPreviewImage(result.url);
      } else if (mediaType === 'video') {
        result = await modelService.generateVideo(
          selectedProvider,
          selectedModel,
          apiKey,
          prompt
        );
        setPreviewImage(result.url);
      }
      
      // Call onGenerate with the result after a short delay
      // to let the user see the preview
      setTimeout(() => {
        onGenerate({
          content: result.url,
          contentType: mediaType,
          [`${mediaType}Prompt`]: prompt,
          model: selectedModel,
          provider: selectedProvider
        });
      }, 1500);
      
    } catch (error) {
      console.error(`Error generating ${mediaType}:`, error);
      toast.error(`Failed to generate ${mediaType}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            {mediaType === 'image' ? (
              <>
                <Image size={20} className="mr-2" />
                Generate Image
              </>
            ) : (
              <>
                <Video size={20} className="mr-2" />
                Generate Video
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {/* Provider and Model Selection */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={handleProviderChange}
                className="w-full p-2 border rounded-md bg-white"
                disabled={isLoading}
              >
                <option value="" disabled>Select provider</option>
                {Object.entries(providers).map(([key, provider]) => (
                  <option key={key} value={key}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={handleModelChange}
                className="w-full p-2 border rounded-md bg-white"
                disabled={isLoading || !selectedProvider}
              >
                <option value="" disabled>Select model</option>
                {selectedProvider && providers[selectedProvider]?.models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Prompt Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe the ${mediaType} you want to generate...`}
              className="w-full p-2 border rounded-md"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          {/* Preview */}
          {previewImage && (
            <div className="mb-4 border p-2 rounded-md">
              <p className="text-sm font-medium mb-2">Preview:</p>
              {mediaType === 'image' ? (
                <img
                  src={previewImage}
                  alt="Generated preview"
                  className="rounded-md max-h-60 mx-auto"
                />
              ) : (
                <video
                  src={previewImage}
                  controls
                  className="rounded-md w-full max-h-60"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim() || !selectedProvider || !selectedModel}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                Generate {mediaType}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaGenerationModal; 