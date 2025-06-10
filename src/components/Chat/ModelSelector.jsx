import React, { useState, useEffect } from 'react';
import { X, Check, Search, MessageSquare, Image, Video } from 'lucide-react';
import modelService from '../../lib/modelService';
import { useSettings } from '../../contexts/SettingsContext';

const ModelSelector = ({ onClose, onSelect, currentProvider, currentModel }) => {
  const { userSettings } = useSettings();
  const [providers, setProviders] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('text');
  
  // Load providers and models from user settings
  useEffect(() => {
    if (userSettings && userSettings.providers) {
      setProviders(userSettings.providers.reduce((acc, provider) => {
        if (provider.enabled) {
          acc[provider.name] = {
            name: provider.name,
            models: provider.models.filter(model => model.enabled)
          };
        }
        return acc;
      }, {}));
    } else {
      // Fallback to default providers if user settings not available
      setProviders(modelService.getAllProviders());
    }
  }, [userSettings]);
  
  // Filter models based on search query and tab
  const filteredProviders = Object.entries(providers).reduce((acc, [key, provider]) => {
    // Filter models by capability
    const filteredModels = provider.models.filter(model => {
      // Filter by capability tab
      const matchesCapability = model.capabilities?.includes(selectedTab);
      
      // Filter by search query
      const matchesSearch = searchQuery === '' ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCapability && matchesSearch;
    });
    
    if (filteredModels.length > 0) {
      acc[key] = {
        ...provider,
        models: filteredModels
      };
    }
    
    return acc;
  }, {});

  // Get icon for capability
  const getCapabilityIcon = (capability) => {
    switch (capability) {
      case 'text': return <MessageSquare size={12} />;
      case 'image': return <Image size={12} />;
      case 'video': return <Video size={12} />;
      default: return null;
    }
  };

  // Get descriptive label for capability
  const getCapabilityLabel = (capability) => {
    switch (capability) {
      case 'text': return 'Text Generation';
      case 'image': return 'Image Generation';
      case 'video': return 'Video Generation';
      default: return capability;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Select a model</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Search and tabs */}
        <div className="p-4 border-b">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search models..."
              className="w-full pl-10 pr-4 py-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedTab('text')}
              className={`px-4 py-2 rounded-md flex items-center ${selectedTab === 'text'
                ? 'bg-black text-white'
                : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <MessageSquare size={16} className="mr-2" />
              Text
            </button>
            <button
              onClick={() => setSelectedTab('image')}
              className={`px-4 py-2 rounded-md flex items-center ${selectedTab === 'image'
                ? 'bg-black text-white'
                : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Image size={16} className="mr-2" />
              Image
            </button>
            <button
              onClick={() => setSelectedTab('video')}
              className={`px-4 py-2 rounded-md flex items-center ${selectedTab === 'video'
                ? 'bg-black text-white'
                : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Video size={16} className="mr-2" />
              Video
            </button>
          </div>
        </div>
        
        {/* Models list */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          {Object.entries(filteredProviders).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No models found with the selected capability
            </div>
          ) : (
            Object.entries(filteredProviders).map(([providerKey, provider]) => (
              <div key={providerKey} className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {provider.name}
                </h4>
                <div className="space-y-2">
                  {provider.models.map(model => (
                    <button
                      key={model.id}
                      onClick={() => onSelect(providerKey, model.id)}
                      className={`w-full text-left p-3 rounded-md flex items-center justify-between ${
                        currentProvider === providerKey && currentModel === model.id
                          ? 'bg-black text-white'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                          {model.capabilities && model.capabilities.map(capability => (
                            <span 
                              key={capability}
                              className={`px-2 py-0.5 rounded flex items-center text-xs ${
                                currentProvider === providerKey && currentModel === model.id
                                  ? 'bg-gray-700 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="mr-1">{getCapabilityIcon(capability)}</span>
                              {getCapabilityLabel(capability)}
                            </span>
                          ))}
                        </div>
                        {model.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {model.description}
                          </div>
                        )}
                      </div>
                      {currentProvider === providerKey && currentModel === model.id && (
                        <Check size={20} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelSelector; 