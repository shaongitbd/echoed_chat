import React, { useState, useEffect } from 'react';
import { zap } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../contexts/SettingsContext';

const ModelRecommendation = ({
  inputText,
  onSelectRecommendation,
  currentProvider,
  currentModel,
  showRecommendation,
  onClose,
}) => {
  const { userSettings } = useSettings();
  const [recommendedProvider, setRecommendedProvider] = useState(null);
  const [recommendedModel, setRecommendedModel] = useState(null);

  useEffect(() => {
    // Basic logic to recommend a faster model for short prompts
    if (userSettings && inputText.length > 0 && inputText.length < 50) {
      const fasterProvider = 'openai';
      const fasterModel = 'gpt-3.5-turbo';

      // Check if the recommended provider and model are enabled in user settings
      const isProviderEnabled = userSettings.providers?.find(
        p => p.name.toLowerCase() === fasterProvider && p.enabled
      );
      
      const isModelEnabled = isProviderEnabled?.models.find(
        m => m.id === fasterModel && m.enabled
      );

      // Avoid recommending the same model or a disabled one
      if (isModelEnabled && (currentProvider.toLowerCase() !== fasterProvider || currentModel !== fasterModel)) {
        setRecommendedProvider(fasterProvider);
        setRecommendedModel(fasterModel);
      } else {
        setRecommendedProvider(null);
        setRecommendedModel(null);
      }
    } else {
      setRecommendedProvider(null);
      setRecommendedModel(null);
    }
  }, [inputText, currentProvider, currentModel, userSettings]);

  const handleSelect = () => {
    onSelectRecommendation(recommendedProvider, recommendedModel);
    toast.success(`Switched to faster model: ${recommendedProvider}/${recommendedModel}`);
    onClose();
  };

  if (!showRecommendation || !recommendedProvider || !recommendedModel) {
    return null;
  }

  return (
    <div className="absolute bottom-full mb-2 w-full max-w-md bg-white p-3 rounded-lg shadow-lg border border-gray-200 animate-fade-in-up">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <zap className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="ml-3 flex-grow">
          <p className="text-sm font-medium text-gray-900">
            Switch to a faster model for this prompt?
          </p>
          <p className="text-sm text-gray-500">
            Using {recommendedProvider}/{recommendedModel} could be quicker.
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            type="button"
            onClick={handleSelect}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800"
          >
            Switch
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelRecommendation; 