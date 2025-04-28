import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import firebaseService from '../config/firebaseService';
import { useNavigation } from '@react-navigation/native';

/**
 * Custom hook to manage Firebase Cloud Messaging
 * Handles initialization, permission requests, and token registration
 */
export const useFirebaseMessaging = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [token, setToken] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  // Initialize Firebase and request permissions
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        setLoading(true);
        // Initialize Firebase
        await firebaseService.initFirebase();
        setIsInitialized(true);

        // Check login status
        const accessToken = await AsyncStorage.getItem('accessToken');
        if (!accessToken) {
          console.log('User not logged in, skipping FCM token registration');
          setLoading(false);
          return;
        }

        // Get FCM token based on platform
        if (Platform.OS === 'web') {
          // For web, check if notification permission is granted
          if (Notification.permission === 'granted') {
            setPermissionGranted(true);
            
            // Get and register token
            const fcmToken = await firebaseService.getFirebaseToken();
            if (fcmToken) {
              setToken(fcmToken);
              // Save token to AsyncStorage
              await AsyncStorage.setItem('firebaseToken', fcmToken);
            }
          } else if (Notification.permission === 'default') {
            // Ask for permission
            const permission = await Notification.requestPermission();
            setPermissionGranted(permission === 'granted');
            
            if (permission === 'granted') {
              // Get and register token
              const fcmToken = await firebaseService.getFirebaseToken();
              if (fcmToken) {
                setToken(fcmToken);
                // Save token to AsyncStorage
                await AsyncStorage.setItem('firebaseToken', fcmToken);
              }
            }
          }
        } else {
          // For native platforms, use Expo Notifications
          const fcmToken = await firebaseService.getFirebaseToken();
          if (fcmToken) {
            setToken(fcmToken);
            setPermissionGranted(true);
            // Save token to AsyncStorage
            await AsyncStorage.setItem('firebaseToken', fcmToken);
          }
        }
      } catch (err) {
        console.error('Error initializing Firebase Messaging:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  // Handle notification click/press
  useEffect(() => {
    const handleNotificationClick = async (notification) => {
      try {
        // Check if the notification contains trip information
        const tripData = notification?.data?.tripData 
          ? typeof notification.data.tripData === 'string' 
            ? JSON.parse(notification.data.tripData) 
            : notification.data.tripData
          : null;

        if (tripData && tripData.tripId) {
          // Navigate to the trip details page
          if (tripData.status === 'approved') {
            navigation.navigate('TripDetails', { tripId: tripData.tripId });
          } else if (tripData.status === 'rejected') {
            navigation.navigate('TripDetails', { tripId: tripData.tripId });
          } else {
            navigation.navigate('TripDetails', { tripId: tripData.tripId });
          }
        }
      } catch (err) {
        console.error('Error handling notification click:', err);
      }
    };

    // Set up listeners for notification clicks
    if (Platform.OS === 'web' && isInitialized) {
      // For web, we already handle this in the service worker
      // But we can add additional handling for when the app is already open
    } else if (isInitialized) {
      // For native platforms, use Expo Notifications
      const subscription = firebaseService.addNotificationResponseReceivedListener?.(handleNotificationClick);
      
      // Return cleanup function
      return () => {
        if (subscription) {
          subscription.remove();
        }
      };
    }
  }, [isInitialized, navigation]);

  // Method to manually request permissions (can be called from UI)
  const requestPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        const permission = await Notification.requestPermission();
        setPermissionGranted(permission === 'granted');
        
        if (permission === 'granted') {
          const fcmToken = await firebaseService.getFirebaseToken();
          setToken(fcmToken);
          return permission;
        }
      } else {
        // For native platforms
        const fcmToken = await firebaseService.getFirebaseToken();
        if (fcmToken) {
          setToken(fcmToken);
          setPermissionGranted(true);
          return 'granted';
        }
      }
      return 'denied';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err);
      return 'error';
    }
  };

  // Return hook values and methods
  return {
    isInitialized,
    token,
    permissionGranted,
    loading,
    error,
    requestPermission
  };
}; 