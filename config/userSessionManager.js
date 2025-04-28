import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import firebaseService from './firebaseService';

// API URL for backend communications
const API_URL = 'https://tourism-tfph.onrender.com';

/**
 * User Session Manager
 * Handles user login/logout, session storage, and FCM token management
 */

// Store current user information for quick access
let _currentUser = {
  userId: null,
  isAdmin: false,
  accessToken: null,
  fcmToken: null,
  deviceId: null,
  timestamp: null
};

/**
 * Initialize user session from storage
 * Should be called on app start
 */
export const initUserSession = async () => {
  try {
    // Load critical session data
    const [userId, isAdminStr, accessToken, fcmToken, deviceId] = await Promise.all([
      AsyncStorage.getItem('userId'),
      AsyncStorage.getItem('isAdmin'),
      AsyncStorage.getItem('accessToken'),
      AsyncStorage.getItem('firebaseToken'),
      AsyncStorage.getItem('deviceId')
    ]);

    _currentUser = {
      userId,
      isAdmin: isAdminStr === 'true',
      accessToken,
      fcmToken,
      deviceId,
      timestamp: Date.now()
    };

    console.log(`Session initialized for ${_currentUser.isAdmin ? 'admin' : 'user'} (${_currentUser.userId || 'unknown'})`);
    return !!_currentUser.accessToken; // Return true if logged in
  } catch (error) {
    console.error('Error initializing user session:', error);
    return false;
  }
};

/**
 * Set session data on login
 */
export const setUserSession = async (userData) => {
  try {
    const { userId, isAdmin, accessToken, refreshToken } = userData;

    // Store in AsyncStorage
    const storageItems = [
      ['userId', userId],
      ['isAdmin', isAdmin ? 'true' : 'false'],
      ['accessToken', accessToken]
    ];

    if (refreshToken) {
      storageItems.push(['refreshToken', refreshToken]);
    }

    await Promise.all(storageItems.map(([key, value]) => AsyncStorage.setItem(key, value)));

    // Update local reference
    _currentUser = {
      userId,
      isAdmin: !!isAdmin,
      accessToken,
      timestamp: Date.now()
    };

    console.log(`Session set for ${_currentUser.isAdmin ? 'admin' : 'user'} (${_currentUser.userId})`);

    // After setting the session, register FCM token
    if (Platform.OS === 'web') {
      // Initialize Firebase for web
      await firebaseService.initFirebase();
      
      // Get and register FCM token
      const fcmToken = await firebaseService.getFirebaseToken();
      if (fcmToken) {
        _currentUser.fcmToken = fcmToken;
        console.log(`FCM token registered for ${_currentUser.isAdmin ? 'admin' : 'user'}`);
      }
    } else {
      // For native platforms, use Expo Notifications
      await firebaseService.initFirebase();
    }

    return true;
  } catch (error) {
    console.error('Error setting user session:', error);
    return false;
  }
};

/**
 * Check if current session is for an admin
 */
export const isAdminUser = async () => {
  if (_currentUser.isAdmin !== undefined) {
    return _currentUser.isAdmin;
  }
  
  try {
    const isAdmin = await AsyncStorage.getItem('isAdmin');
    _currentUser.isAdmin = isAdmin === 'true';
    return _currentUser.isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Get current user ID
 */
export const getCurrentUserId = async () => {
  if (_currentUser.userId) {
    return _currentUser.userId;
  }
  
  try {
    const userId = await AsyncStorage.getItem('userId');
    _currentUser.userId = userId;
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

/**
 * Clear session on logout
 */
export const clearUserSession = async () => {
  try {
    console.log('Logging out and clearing user session...');
    
    // First, deregister FCM token to stop receiving notifications
    await firebaseService.cleanupNotifications();
    
    // Then clear all session-related data
    const keysToRemove = [
      'userId',
      'isAdmin',
      'accessToken',
      'refreshToken',
      'firebaseToken',
      'deviceId'
    ];
    
    await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
    
    // Reset current user
    _currentUser = {
      userId: null,
      isAdmin: false,
      accessToken: null,
      fcmToken: null,
      deviceId: null,
      timestamp: null
    };
    
    console.log('User session cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing user session:', error);
    return false;
  }
};

/**
 * Get current user role for debugging
 */
export const getUserRoleInfo = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const isAdmin = await AsyncStorage.getItem('isAdmin');
    const deviceId = await AsyncStorage.getItem('deviceId');
    const fcmToken = await AsyncStorage.getItem('firebaseToken');
    
    return {
      userId,
      isAdmin: isAdmin === 'true',
      deviceId: deviceId || 'Not registered',
      hasToken: !!fcmToken,
      tokenPrefix: fcmToken ? fcmToken.substring(0, 10) + '...' : 'None'
    };
  } catch (error) {
    console.error('Error getting user role info:', error);
    return { error: 'Failed to get user info' };
  }
};

export default {
  initUserSession,
  setUserSession,
  isAdminUser,
  getCurrentUserId,
  clearUserSession,
  getUserRoleInfo
}; 