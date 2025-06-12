import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { appwriteService, account, databases } from '../lib/appwrite';

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Function to check authentication status
  const checkAuth = async () => {
    console.log('Checking authentication status...');
    try {
      setIsLoading(true);
      
      try {
        // Check if we have an active session using account directly
        console.log('Checking for active session...');
        await account.get();
        console.log('Session exists');
        
        // Get user data
        console.log('Active session found, getting user data');
        const currentUser = await appwriteService.getCurrentUser();
        console.log('Current user data:', currentUser);
        
        if (currentUser) {
          console.log('Setting user state with:', currentUser);
          setUser(currentUser);
        } else {
          console.log('No user data found despite active session, setting user to null');
          setUser(null);
        }
      } catch (sessionError) {
        console.log('No active session found:', sessionError);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('Auth check complete');
    }
  };
  
  // Register a new user
  const register = async (email, password, name) => {
    setIsLoading(true);
    
    try {
      const newAccount = await appwriteService.createAccount(email, password, name);
      
     
      await checkAuth(); // Re-check auth after login
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Login with email and password
  const login = async (email, password) => {
    setIsLoading(true);
    
    try {
      await appwriteService.login(email, password);
      await checkAuth(); // Re-check auth after login
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await appwriteService.logout();
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manually refresh auth state
  const refreshAuth = async () => {
    return await checkAuth();
  };
  
  // Update user profile
  const updateUserProfile = async (data) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Update name if provided
      if (data.name) {
        await appwriteService.account.updateName(data.name);
      }
      
      // Update password if provided
      if (data.password) {
        await appwriteService.account.updatePassword(data.password);
      }
      
      // Update user document in database
      await databases.updateDocument(
        appwriteService.DATABASE_ID,
        appwriteService.USERS_COLLECTION_ID,
        user.$id,
        {
          ...(data.name && { name: data.name }),
          updatedAt: new Date().toISOString()
        }
      );
      
      // Refresh user data
      const updatedUser = await appwriteService.getCurrentUser();
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update user preferences
  const updateUserPreferences = async (preferences) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      await appwriteService.updateUserPreferences(user.$id, preferences);
      
      // Refresh user data
      const updatedUser = await appwriteService.getCurrentUser();
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Context value
  const value = {
    user,
    isLoading,
    register,
    login,
    logout,
    refreshAuth,
    updateUserProfile,
    updateUserPreferences
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 