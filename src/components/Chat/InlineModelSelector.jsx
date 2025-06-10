import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const InlineModelSelector = ({ currentProvider, currentModel, onSelect }) => {
  const { userSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [enabledModels, setEnabledModels] = useState([]);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get enabled models from user settings
  useEffect(() => {
    if (userSettings && userSettings.providers) {
      const models = [];
      
      userSettings.providers.forEach(provider => {
        if (provider.enabled) {
          provider.models.forEach(model => {
            if (model.enabled && model.capabilities?.includes('text')) {
              models.push({
                provider: provider.name,
                providerId: provider.name,
                model: model.name,
                modelId: model.id
              });
            }
          });
        }
      });
      
      setEnabledModels(models);
    }
  }, [userSettings]);
  
  // Get current model display name
  const getCurrentModelDisplay = () => {
    const current = enabledModels.find(
      m => m.providerId.toLowerCase() === currentProvider.toLowerCase() && m.modelId === currentModel
    );
    
    if (current) {
      return `${current.model}`;
    }
    
    return 'Select Model';
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors border border-gray-200"
      >
        <span className="max-w-[100px] truncate">{getCurrentModelDisplay()}</span>
        <ChevronDown size={14} />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border w-64 max-h-80 overflow-y-auto z-50">
          <div className="p-2">
            <div className="mb-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase">
              Select Model
            </div>
            {enabledModels.length === 0 ? (
              <div className="text-sm text-gray-500 p-2">No enabled models found</div>
            ) : (
              enabledModels.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelect(item.providerId, item.modelId);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors ${
                    currentProvider.toLowerCase() === item.providerId.toLowerCase() && currentModel === item.modelId
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">{item.model}</div>
                    <div className="text-xs text-gray-500">{item.provider}</div>
                  </div>
                  {currentProvider === item.providerId && currentModel === item.modelId && (
                    <Check size={16} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineModelSelector; 