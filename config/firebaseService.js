import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API URL for backend communications
const API_URL = 'https://tourism-management-system-wdu4.onrender.com';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMPFpT8c4zrfJGQ1hjDtVYr_KPm113hXI",
  authDomain: "tourism-bbbae.firebaseapp.com",
  projectId: "tourism-bbbae",
  storageBucket: "tourism-bbbae.firebasestorage.app",
  messagingSenderId: "842838358421",
  appId: "1:842838358421:web:af8fffedb80c9b5e6f1e9c",
  measurementId: "G-QL9QQRYGJP"
};

// Initialize Firebase
let firebaseApp;
let messaging;

// Flag to track initialization
let isInitialized = false;

/**
 * Initialize Firebase
 */
export const initFirebase = async () => {
  if (isInitialized) {
    console.log('Firebase already initialized');
    return;
  }
  
  try {
    // Initialize Firebase app
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize Firebase Cloud Messaging
    if (Platform.OS !== 'web') {
      // For native platforms, we use Expo Notifications
      await setupExpoNotifications();
    } else {
      // For web platform, use Firebase Messaging directly
      try {
        messaging = getMessaging(firebaseApp);
        
        // Request permission for notifications
        const permission = await Notification.requestPermission?.() || 
                         (navigator.permissions && await navigator.permissions.query({name: 'notifications'}).then(result => result.state)) || 
                         'default';
        
        if (permission === 'granted') {
          console.log('Notification permission granted');
          await registerServiceWorker();
        } else {
          console.log('Notification permission denied or not supported');
        }
      } catch (webError) {
        console.error('Error setting up web notifications:', webError);
        // Continue even if web notifications fail - they're optional
        isInitialized = true;
      }
    }
    
    isInitialized = true;
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Mark as initialized anyway to prevent repeated attempts
    isInitialized = true;
  }
};

/**
 * Set up Expo Notifications for native platforms
 */
const setupExpoNotifications = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  // If we don't have permission yet, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for notifications!');
    return;
  }
  
  // Configure notifications behavior
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
  
  // Set notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  
  // Listen for notifications
  const subscription = Notifications.addNotificationReceivedListener(handleNotification);
  
  // Store the subscription for cleanup
  await AsyncStorage.setItem('notificationSubscription', JSON.stringify(subscription));
};

/**
 * Handle received notification
 */
const handleNotification = (notification) => {
  console.log('Notification received!', notification);
  // You can add custom handling logic here
};

/**
 * Register service worker for web notifications
 */
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Use relative path for the service worker
      const swPath = './firebase-messaging-sw.js';
      
      console.log('Registering service worker at:', swPath);
      
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: '/'
      }).catch(err => {
        console.log('Service worker registration failed, error:', err);
        return null;
      });
      
      if (!registration) {
        console.log('Service worker registration failed, skipping token generation');
        return;
      }
      
      // Force update the service worker to avoid using outdated version
      try {
        await registration.update();
      } catch (updateError) {
        console.error('Error updating service worker:', updateError);
      }
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service worker is active');
      
      try {
        // Get the FCM token
        // Use your actual VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
        const vapidKey = 'BG2u580wvIrUGs1dURmFyche-_ZPuwApoQ5gLqDidw_iO4Ifo-bZHULaqOOqFEJox7fDPxyVN8F8V4pehleatcE';
        const fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        }).catch(err => {
          console.log('Failed to get FCM token:', err);
          return null;
        });
        
        if (fcmToken) {
          console.log('FCM Token:', fcmToken);
          
          // Save the token
          await saveTokenToStorage(fcmToken);
          
          // Register token with your backend
          await registerTokenWithBackend(fcmToken);
          
          // Listen for messages when the app is in the foreground
          onMessage(messaging, handleForegroundMessage);
        }
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        // Continue without token
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  } else {
    console.log('Service workers not supported in this browser');
  }
};

/**
 * Handle message received when app is in foreground
 */
const handleForegroundMessage = (payload) => {
  console.log('Message received in foreground:', payload);
  
  try {
    // Extract user targeting information
    const targetUserId = payload.data?.targetUserId || null;
    const targetUserRole = payload.data?.targetUserRole || null;
    const targetIsAdmin = targetUserRole === 'admin';
    
    // Check if admin notifications should be suppressed
    const shouldSendAdminNotification = payload.data?.shouldSendAdminNotification !== 'false';
    
    // Extract trip information from the payload
    let tripData = null;
    try {
      tripData = payload.data?.tripData ? JSON.parse(payload.data.tripData) : null;
    } catch (e) {
      console.error('Error parsing tripData in foreground message:', e);
    }
    
    // Get trip title and status for better notifications
    const tripTitle = tripData?.title || payload.data?.tripTitle || 'Unknown Trip';
    const tripStatus = tripData?.status || payload.data?.status || 'updated';
    
    console.log(`Foreground message for ${targetIsAdmin ? 'admin' : 'user'} about trip "${tripTitle}" (status: ${tripStatus})`);
    
    // Skip notification for admins if shouldSendAdminNotification is false
    if (targetIsAdmin && !shouldSendAdminNotification) {
      console.log('Skipping foreground notification for admin as shouldSendAdminNotification is false');
      return;
    }
    
    // Check if we're allowed to show notifications
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted, skipping foreground notification');
      return;
    }
    
    // Create a better notification title
    let notificationTitle = payload.notification?.title || 'Trip Update';
    
    // Create a better body message that includes the trip title
    let notificationBody = '';
    if (tripStatus === 'approved') {
      notificationBody = `Your trip "${tripTitle}" has been approved`;
    } else if (tripStatus === 'rejected') {
      notificationBody = `Your trip "${tripTitle}" has been rejected`;
    } else {
      notificationBody = `Your trip "${tripTitle}" has been updated`;
    }
    
    // Use the provided body if available, otherwise use our custom one
    const finalBody = payload.notification?.body || notificationBody;
    
    // Display a custom notification
    const notificationOptions = {
      body: finalBody,
      icon: '/firebase-logo.png',
      badge: '/firebase-logo.png',
      data: payload.data // Include the original data for click handling
    };
    
    new Notification(notificationTitle, notificationOptions);
  } catch (error) {
    console.error('Error handling foreground message:', error);
  }
};

/**
 * Get the FCM token or Expo push token
 */
export const getFirebaseToken = async () => {
  try {
    if (Platform.OS !== 'web') {
      // For native platforms, get the Expo push token
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      console.log('Expo Push Token:', token);
      
      // Save the token
      await saveTokenToStorage(token);
      
      return token;
    } else if (messaging) {
      // For web platform, check if permission is granted
      const permission = Notification.permission;
      
      if (permission !== 'granted') {
        // Request permission
        const newPermission = await Notification.requestPermission();
        if (newPermission !== 'granted') {
          console.log('Notification permission denied');
          return null;
        }
      }
      
      // Make sure service worker is registered
      let swRegistration;
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.getRegistration('./firebase-messaging-sw.js');
          if (!swRegistration) {
            // Register the service worker if not registered
            swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js', {
              scope: '/'
            });
          }
        } catch (swError) {
          console.error('Service worker registration error:', swError);
        }
      }
      
      // Get FCM token with all required parameters
      const vapidKey = 'BJcQlsrYKYSu-nQtGdgmZFmT1NZzQAoWGFz5AqC4P3oTnAQh5jLwYnDYOzkVKCAUz0N5Imt5eiF4QEyERlrGzLM';
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration
      });
      
      if (token) {
        console.log('FCM Web Token:', token);
        
        // Save the token
        await saveTokenToStorage(token);
        
        // Register with backend
        await registerTokenWithBackend(token);
        
        return token;
      } else {
        console.error('Failed to get FCM token');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};

/**
 * Save token to AsyncStorage
 */
const saveTokenToStorage = async (token) => {
  if (token) {
    await AsyncStorage.setItem('firebaseToken', token);
  }
};

/**
 * Register token with backend server
 */
export const registerTokenWithBackend = async (token = null) => {
  try {
    if (!token) {
      token = await getFirebaseToken();
      if (!token) {
        console.log('No token available to register with backend');
        return;
      }
    }
    
    const accessToken = await AsyncStorage.getItem('accessToken');
    
    if (!accessToken) {
      console.log('User not logged in, skipping token registration');
      return null;
    }
    
    // Get or generate a unique device ID
    let deviceId = await AsyncStorage.getItem('deviceId');
    
    if (!deviceId) {
      deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await AsyncStorage.setItem('deviceId', deviceId);
    }
    
    // Get user ID and role information
    const userId = await AsyncStorage.getItem('userId');
    const isAdmin = await AsyncStorage.getItem('isAdmin') === 'true';
    const userRole = isAdmin ? 'admin' : 'user';
    
    console.log(`Registering FCM token for user ${userId} with role: ${userRole}`);
    
    // Create payload with platform information and user role
    const payload = {
      token,
      deviceId,
      userId,
      platform: Platform.OS,
      isAdmin, // Include admin status for role-based notifications
      userRole, // Explicit user role for targeting notifications
      appVersion: Constants.expoConfig?.version || '1.0.0',
      // Include additional information for web platform
      ...(Platform.OS === 'web' && {
        isWebPlatform: true,
        userAgent: navigator.userAgent,
        browserName: navigator.appName || 'Unknown Browser'
      })
    };
    
    console.log(`Registering ${Platform.OS} token with backend for ${userRole}`);
    
    // Send to the backend API
    const response = await fetch(`${API_URL}/users/push-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Token registered with backend for ${userRole}:`, data);
    return data;
  } catch (error) {
    console.error('Error registering token with backend:', error);
    return null;
  }
};

/**
 * Clean up notifications when logging out
 */
export const cleanupNotifications = async () => {
  try {
    console.log('Starting FCM token cleanup process...');
    
    // Get the Firebase token before removing it
    const token = await AsyncStorage.getItem('firebaseToken');
    const deviceId = await AsyncStorage.getItem('deviceId');
    const userId = await AsyncStorage.getItem('userId');
    const accessToken = await AsyncStorage.getItem('accessToken');
    
    // Log the token information before cleanup
    console.log(`Cleanup - Token: ${token ? 'exists' : 'missing'}, DeviceID: ${deviceId ? 'exists' : 'missing'}`);
    
    // First, try to deregister the token with the server
    if ((token || deviceId) && accessToken) {
      try {
        console.log(`Deregistering token for user ${userId}`);
        
        // Use the new dedicated deregister endpoint
        const response = await fetch(`${API_URL}/users/push-token/deregister`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token,
            deviceId,
            userId // Include userId for better token management
          })
        });
        
        if (response.ok) {
          console.log('Token deregistered successfully from server');
        } else {
          console.log(`Token deregistration failed with status: ${response.status}`);
        }
      } catch (deregisterError) {
        console.error('Error deregistering token with server:', deregisterError);
        // Continue with cleanup even if deregistration fails
      }
    } else {
      console.log('Missing token/deviceId or accessToken for deregistration');
    }
    
    // Clean up local storage regardless of server deregistration
    const keysToRemove = [
      'firebaseToken',
      'deviceId',
      'notificationSubscription'
    ];
    
    await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
    
    // For web platform, try to unregister service worker
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('./firebase-messaging-sw.js');
        if (registration) {
          const unregistered = await registration.unregister();
          console.log('Service worker unregistered:', unregistered);
        }
      } catch (swError) {
        console.error('Error unregistering service worker:', swError);
      }
    }
    
    console.log('FCM token and notifications cleaned up successfully');
    
    // Reset Firebase initialization flag so it will reinitialize on next login
    isInitialized = false;
  } catch (error) {
    console.error('Error during notification cleanup:', error);
  }
};

/**
 * Diagnostic function to check notification setup
 * Call this when users report notification issues
 */
export const diagnoseFCMSetup = async () => {
  try {
    console.log('--- FCM Diagnostic Check Started ---');
    
    // Check stored data
    const userId = await AsyncStorage.getItem('userId');
    const isAdmin = await AsyncStorage.getItem('isAdmin') === 'true';
    const firebaseToken = await AsyncStorage.getItem('firebaseToken');
    const deviceId = await AsyncStorage.getItem('deviceId');
    const accessToken = await AsyncStorage.getItem('accessToken');
    
    console.log(`User ID: ${userId || 'Not found'}`);
    console.log(`Is Admin: ${isAdmin}`);
    console.log(`FCM token: ${firebaseToken ? 'Exists' : 'Missing'}`);
    console.log(`Device ID: ${deviceId || 'Not registered'}`);
    console.log(`Login status: ${accessToken ? 'Logged in' : 'Not logged in'}`);
    
    // Check Firebase initialization
    console.log(`Firebase initialized: ${isInitialized}`);
    
    // Check notification permission on web
    if (Platform.OS === 'web') {
      console.log(`Notification permission: ${Notification.permission}`);
      
      // Check service worker registration
      if ('serviceWorker' in navigator) {
        const swRegistration = await navigator.serviceWorker.getRegistration('./firebase-messaging-sw.js');
        console.log(`Service worker registered: ${swRegistration ? 'Yes' : 'No'}`);
      } else {
        console.log('Service workers not supported in this browser');
      }
    }
    
    // Try to verify token with the server
    if (firebaseToken && accessToken) {
      try {
        const response = await fetch(`${API_URL}/users/verify-token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: firebaseToken,
            userId
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Server token verification:', data);
        } else {
          console.log(`Server token verification failed: ${response.status}`);
        }
      } catch (verifyError) {
        console.error('Error verifying token with server:', verifyError);
      }
    }
    
    console.log('--- FCM Diagnostic Check Completed ---');
    
    // Return diagnostic info
    return {
      userId,
      isAdmin,
      hasToken: !!firebaseToken,
      hasDeviceId: !!deviceId,
      isLoggedIn: !!accessToken,
      firebaseInitialized: isInitialized,
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error running FCM diagnostics:', error);
    return { error: error.message };
  }
};

// Export the service functions
export default {
  initFirebase,
  getFirebaseToken,
  registerTokenWithBackend,
  cleanupNotifications,
  diagnoseFCMSetup
}; 
