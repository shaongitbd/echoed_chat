import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, BarChart3, Layers, Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { appwriteService } from '../lib/appwrite';

// Mock subscription tiers
const SUBSCRIPTION_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Basic access to AI chat features',
    features: [
      { name: 'Text Queries', limit: 30, used: 12 },
      { name: 'Image Generation', limit: 10, used: 3 },
      { name: 'Video Generation', limit: 5, used: 0 }
    ],
    current: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99/month',
    description: 'Enhanced access with higher limits',
    features: [
      { name: 'Text Queries', limit: 500, used: 0 },
      { name: 'Image Generation', limit: 100, used: 0 },
      { name: 'Video Generation', limit: 30, used: 0 }
    ],
    current: false
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '$29.99/month',
    description: 'Premium access with highest limits',
    features: [
      { name: 'Text Queries', limit: 5000, used: 0 },
      { name: 'Image Generation', limit: 1000, used: 0 },
      { name: 'Video Generation', limit: 300, used: 0 }
    ],
    current: false
  }
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  // Handle profile form change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate form
    const errors = {};
    
    if (!profileForm.name.trim()) {
      errors.name = 'Name is required';
    }
    
    // Only validate password fields if user is trying to change password
    if (profileForm.newPassword || profileForm.confirmPassword || profileForm.currentPassword) {
      if (!profileForm.currentPassword) {
        errors.currentPassword = 'Current password is required to change password';
      }
      
      if (profileForm.newPassword && profileForm.newPassword.length < 8) {
        errors.newPassword = 'New password must be at least 8 characters';
      }
      
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsLoading(false);
      return;
    }
    
    try {
      // Mock API call - in a real app, this would call your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user profile
      await updateUserProfile({
        name: profileForm.name,
        ...(profileForm.newPassword ? { password: profileForm.newPassword } : {})
      });
      
      toast.success('Profile updated successfully');
      
      // Clear password fields
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Navigate to model selection page
  const handleEditProviders = () => {
    navigate('/model-selection');
  };
  
  // Handle subscription upgrade
  const handleUpgradeSubscription = (tierId) => {
    toast.info(`Redirecting to upgrade to ${tierId} plan...`);
    // In a real app, this would redirect to a payment page
  };
  
  // Tab content components
  const ProfileTab = () => (
    <form onSubmit={handleProfileSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={profileForm.name}
          onChange={handleProfileChange}
          className={`appearance-none block w-full px-3 py-2 border ${
            formErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
          } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm`}
        />
        {formErrors.name && (
          <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={profileForm.email}
          disabled
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">Email address cannot be changed</p>
      </div>
      
      <div className="pt-5 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={profileForm.currentPassword}
              onChange={handleProfileChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                formErrors.currentPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm`}
            />
            {formErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{formErrors.currentPassword}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={profileForm.newPassword}
              onChange={handleProfileChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                formErrors.newPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm`}
            />
            {formErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{formErrors.newPassword}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={profileForm.confirmPassword}
              onChange={handleProfileChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                formErrors.confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm`}
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-5">
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Sign out
        </button>
        
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
  
  const UsageTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your Subscription</h3>
        <p className="text-sm text-gray-600 mb-6">
          View your current plan and usage limits
        </p>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SUBSCRIPTION_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-lg shadow-sm overflow-hidden border ${
                tier.current
                  ? 'border-gray-900 ring-2 ring-gray-900'
                  : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">{tier.name}</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{tier.price}</p>
                <p className="mt-2 text-sm text-gray-500">{tier.description}</p>
              </div>
              
              <div className="px-5 pt-4 pb-5">
                <h4 className="text-xs font-medium text-gray-900 uppercase tracking-wide mb-4">
                  Usage Limits
                </h4>
                <ul className="space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature.name} className="flex flex-col">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{feature.name}</span>
                        <span className="text-gray-500">
                          {tier.current ? `${feature.used} / ${feature.limit}` : feature.limit}
                        </span>
                      </div>
                      {tier.current && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-gray-900 h-2 rounded-full"
                            style={{ width: `${(feature.used / feature.limit) * 100}%` }}
                          ></div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                {tier.current ? (
                  <div className="flex items-center text-sm font-medium text-gray-900">
                    <CheckCircle className="h-4 w-4 text-gray-900 mr-2" />
                    Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpgradeSubscription(tier.id)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Usage Notice</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                You have used 40% of your monthly text queries. Your limits will reset on June 30, 2023.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  const ProvidersTab = () => {
    // Get user settings for providers
    const [providerSettings, setProviderSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
      const loadProviderSettings = async () => {
        try {
          if (user) {
            const settings = await appwriteService.getUserSettings(user.$id);
            setProviderSettings(settings);
          }
        } catch (error) {
          console.error('Error loading provider settings:', error);
          toast.error('Failed to load provider settings');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProviderSettings();
    }, [user]);
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Providers</h3>
          <p className="text-sm text-gray-600 mb-6">
            Manage your AI providers and model selections
          </p>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <h4 className="text-base font-medium text-gray-900 mb-4">Current Configuration</h4>
              
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : providerSettings?.providers && providerSettings.providers.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700">Default Provider/Model</h5>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">{providerSettings.defaultProvider || 'Not set'}</span>
                      {providerSettings.defaultModel && (
                        <span className="text-gray-500"> / {providerSettings.defaultModel}</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700">Active Providers</h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {providerSettings.providers
                        .filter(provider => provider.enabled)
                        .map(provider => (
                          <span 
                            key={provider.name}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {provider.name}
                          </span>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700">Selected Models</h5>
                    <div className="mt-2 space-y-2">
                      {providerSettings.providers
                        .filter(provider => provider.enabled)
                        .map(provider => (
                          <div key={provider.name} className="flex items-start">
                            <span className="text-sm text-gray-900 font-medium">{provider.name}:</span>
                            <div className="ml-2">
                              {provider.models && provider.models.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {provider.models
                                    .filter(model => model.enabled)
                                    .map(model => (
                                      <span 
                                        key={model.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                                      >
                                        {model.id}
                                        {model.capabilities && (
                                          <span className="ml-1 text-gray-500">
                                            ({model.capabilities.join(', ')})
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">No models selected</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700">API Keys</h5>
                    <div className="mt-2 space-y-2">
                      {providerSettings.providers
                        .filter(provider => provider.enabled)
                        .map(provider => (
                          <div key={provider.name} className="flex items-center">
                            <span className="text-sm text-gray-900 font-medium">{provider.name}:</span>
                            <span className="ml-2 text-sm text-gray-500">
                              {provider.apiKey ? '••••••••••••••••' : 'No API key set'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No providers configured yet</p>
                </div>
              )}
              
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleEditProviders}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Edit Providers & Models
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Provider Information</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Adding your own API keys for providers allows you to use your own quota and billing.
                  Without an API key, you'll use our shared resources which may have rate limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'usage':
        return <UsageTab />;
      case 'providers':
        return <ProvidersTab />;
      default:
        return <ProfileTab />;
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <Sidebar showMobileMenu={showMobileMenu} onCloseMobileMenu={() => setShowMobileMenu(false)} />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
        {/* Header */}
        <header className="border-b border-gray-200 py-4 px-8 bg-white shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-gray-800">Settings</h1>
        </header>
        
        {/* Settings content */}
        <div className="flex-1 py-6 px-8">
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`${
                    activeTab === 'profile'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </button>
                
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`${
                    activeTab === 'usage'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Usage
                </button>
                
                <button
                  onClick={() => setActiveTab('providers')}
                  className={`${
                    activeTab === 'providers'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Providers
                </button>
              </nav>
            </div>
            
            {/* Tab content */}
            <div className="py-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings; 