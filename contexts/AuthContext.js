import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import axios from 'axios';
import userSessionManager from '../config/userSessionManager';

// API endpoint
const API_URL = 'https://tourism-management-system-wdu4.onrender.com';

// Create context
export const AuthContext = createContext();

// Context hook
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Google OAuth configuration for DirectGoogleAuth (fallback method)
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "365137678690-bhfe7pbqhvq0qohemdkki0ctd4hdqud7.apps.googleusercontent.com",
    iosClientId: "365137678690-225n6k5f21p4on7qcnt4b0707s6dm77r.apps.googleusercontent.com",
    webClientId: "365137678690-kfd4urtlldq7491udnrvq3gdkaqg46da.apps.googleusercontent.com",
    expoClientId: "76957dea-4f2f-4c67-886c-0bcf99ed46e8",
  });

  // Initialize auth state
  useEffect(() => {
    const initAuthState = async () => {
      try {
        const isLoggedIn = await userSessionManager.initUserSession();
        setIsAuthenticated(isLoggedIn);
        
        if (isLoggedIn) {
          const userId = await AsyncStorage.getItem('userId');
          const isAdminUser = await AsyncStorage.getItem('isAdmin') === 'true';
          setIsAdmin(isAdminUser);
          
          // Fetch user details if needed
          await loadUserProfile();
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuthState();
  }, []);

  // Handle Google sign-in response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response.authentication.accessToken);
    }
  }, [response]);

  // Load user profile from backend
  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/getuser`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.length > 0) {
        setUserInfo(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Handle Google sign-in process
  const handleGoogleSignIn = async (accessToken) => {
    try {
      setIsLoading(true);
      
      // Get user info from Google
      const googleUserInfo = await fetchGoogleUserInfo(accessToken);
      
      if (!googleUserInfo) {
        throw new Error('Failed to fetch user info from Google');
      }
      
      // Send to backend for authentication/registration
      const response = await axios.post(`${API_URL}/auth/google`, {
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        picture: googleUserInfo.picture,
        googleId: googleUserInfo.id
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Store auth data
      await userSessionManager.setUserSession({
        userId: response.data.id,
        isAdmin: response.data.isAdmin || false,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken
      });
      
      // Update state
      setIsAuthenticated(true);
      setIsAdmin(response.data.isAdmin || false);
      
      // Load user profile
      await loadUserProfile();
      
      return true;
    } catch (error) {
      console.error('Google sign-in error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user info from Google
  const fetchGoogleUserInfo = async (accessToken) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching Google user info:', error);
      return null;
    }
  };

  // Regular email/password login
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Store auth data
      await userSessionManager.setUserSession({
        userId: response.data.id,
        isAdmin: response.data.isAdmin || false,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken
      });
      
      // Update state
      setIsAuthenticated(true);
      setIsAdmin(response.data.isAdmin || false);
      
      // Load user profile
      await loadUserProfile();
      
      return { success: true, message: response.data.message || 'Login successful!' };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Authentication failed. Please check your credentials and try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear notifications when logging out
      try {
        const notificationService = require('../config/notificationService').default;
        if (notificationService && notificationService.clearAllNotifications) {
          await notificationService.clearAllNotifications();
        }
      } catch (error) {
        console.error('Error clearing notifications during logout:', error);
        // Continue with logout even if notification clearing fails
      }
      
      await userSessionManager.clearUserSession();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserInfo(null);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Setup socket connection after authentication
  const setupSocketConnection = async (userData) => {
    try {
      // Import socket service dynamically to avoid circular dependencies
      const socketService = require('../config/socketService').default;
      
      // Reconnect the socket with the new token
      if (socketService && socketService.getSocket) {
        console.log("Reconnecting socket with new auth token");
        await socketService.reconnectWithToken(userData.accessToken);
      }
    } catch (error) {
      console.error("Error setting up socket connection:", error);
      // Don't fail the sign-in process if socket setup fails
    }
  };

  // Context value
  const contextValue = {
    isLoading,
    isAuthenticated,
    isAdmin,
    userInfo,
    login,
    logout,
    googleSignIn: () => promptAsync(),
    request, // Needed to check if Google sign-in is ready
    loadUserProfile, // Expose this to allow components to refresh user data
    handleGoogleSignIn, // Used by DirectGoogleAuth
    setupSocketConnection // Used by auth components
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 