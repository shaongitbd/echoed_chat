import React, { createContext, useContext, useState, useEffect } from 'react';
import { appwriteService } from '../lib/appwrite';
import { useAuth } from './AuthContext';
import { PROVIDERS } from '../lib/providers';

// Convert PROVIDERS array to object format for compatibility
const getAllProviders = () => {
  return PROVIDERS.reduce((acc, provider) => {
    acc[provider.id.toLowerCase()] = {
      name: provider.name,
      models: provider.models.map(model => ({
        id: model.id,
        name: model.name,
        capabilities: model.capabilities || ['text']
      }))
    };
    return acc;
  }, {});
};

// Create context
const SettingsContext = createContext({
  userSettings: null,
  isLoading: false,
  updateSettings: () => {},
  updateProviderApiKey: () => {},
  updateProviderModels: () => {},
  toggleProvider: () => {},
  toggleModel: () => {}
});

// Settings provider component
export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load user settings when user changes
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setUserSettings(null);
        return;
      }
      
      try {
        setIsLoading(true);
        const settingsFromDB = await appwriteService.getUserSettings(user.$id);
        const allKnownProviders = getAllProviders();

        let processedSettings = settingsFromDB;

        // Check if preferences is a string and parse it
        if (settingsFromDB.preferences && typeof settingsFromDB.preferences === 'string') {
          try {
            const parsedPreferences = JSON.parse(settingsFromDB.preferences);
            processedSettings = { ...settingsFromDB, ...parsedPreferences };
          } catch (e) {
            console.error('Error parsing user settings preferences:', e);
            // Fallback to using settings as is, but still attempt to enrich
            processedSettings = settingsFromDB;
          }
        }

        // Enrich providers with full model details from modelService
        if (processedSettings.providers && Array.isArray(processedSettings.providers)) {
          processedSettings.providers = processedSettings.providers.map(userProvider => {
            const knownProvider = allKnownProviders[userProvider.name.toLowerCase()];
            if (!knownProvider) return userProvider;

            const enrichedModels = userProvider.models.map(userModel => {
              const knownModel = knownProvider.models.find(m => m.id === userModel.id);
              return {
                ...userModel,
                name: knownModel ? knownModel.name : userModel.id, // Add name, fallback to id
                capabilities: knownModel ? knownModel.capabilities : (userModel.capabilities || [])
              };
            });

            return { ...userProvider, models: enrichedModels };
          });
        }
        
        setUserSettings(processedSettings);
      } catch (error) {
        console.error('Error loading user settings:', error);
        
        // If settings don't exist, create default settings
        try {
          const defaultSettings = await appwriteService.createDefaultUserSettings(user.$id);
          setUserSettings(defaultSettings);
        } catch (createError) {
          console.error('Error creating default user settings:', createError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [user]);
  
  // Update user settings
  const updateSettings = async (newSettings) => {
    if (!user || !userSettings) return false;
    
    try {
      setIsLoading(true);
      const updatedSettings = await appwriteService.updateUserSettings(user.$id, newSettings);
      setUserSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating user settings:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update provider API key
  const updateProviderApiKey = async (providerName, apiKey) => {
    if (!user || !userSettings) return false;
    
    try {
      setIsLoading(true);
      
      // Find the provider in settings
      const updatedProviders = userSettings.providers.map(provider => {
        if (provider.name === providerName) {
          return {
            ...provider,
            apiKey
          };
        }
        return provider;
      });
      
      // Update settings
      const updatedSettings = await appwriteService.updateUserSettings(user.$id, {
        providers: updatedProviders
      });
      
      setUserSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating provider API key:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update provider models
  const updateProviderModels = async (providerName, models) => {
    if (!user || !userSettings) return false;
    
    try {
      setIsLoading(true);
      
      // Find the provider in settings
      const updatedProviders = userSettings.providers.map(provider => {
        if (provider.name === providerName) {
          return {
            ...provider,
            models
          };
        }
        return provider;
      });
      
      // Update settings
      const updatedSettings = await appwriteService.updateUserSettings(user.$id, {
        providers: updatedProviders
      });
      
      setUserSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating provider models:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle provider enabled state
  const toggleProvider = async (providerName) => {
    if (!user || !userSettings) return false;
    
    try {
      setIsLoading(true);
      
      // Find the provider in settings
      const updatedProviders = userSettings.providers.map(provider => {
        if (provider.name === providerName) {
          return {
            ...provider,
            enabled: !provider.enabled
          };
        }
        return provider;
      });
      
      // Update settings
      const updatedSettings = await appwriteService.updateUserSettings(user.$id, {
        providers: updatedProviders
      });
      
      setUserSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error toggling provider:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle model enabled state
  const toggleModel = async (providerName, modelId) => {
    if (!user || !userSettings) return false;
    
    try {
      setIsLoading(true);
      
      // Find the provider and model in settings
      const updatedProviders = userSettings.providers.map(provider => {
        if (provider.name === providerName) {
          const updatedModels = provider.models.map(model => {
            if (model.id === modelId) {
              return {
                ...model,
                enabled: !model.enabled
              };
            }
            return model;
          });
          
          return {
            ...provider,
            models: updatedModels
          };
        }
        return provider;
      });
      
      // Update settings
      const updatedSettings = await appwriteService.updateUserSettings(user.$id, {
        providers: updatedProviders
      });
      
      setUserSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error toggling model:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Context value
  const value = {
    userSettings,
    isLoading,
    updateSettings,
    updateProviderApiKey,
    updateProviderModels,
    toggleProvider,
    toggleModel
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings context
export const useSettings = () => {
  return useContext(SettingsContext);
}; 