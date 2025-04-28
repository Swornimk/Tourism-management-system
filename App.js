import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Linking, Platform, AppState, Alert, LogBox } from 'react-native';
import RootStack from './navigators/RootStack';
import { setNavigationRef } from './config/services';
import notificationService from './config/notificationService';
import * as Notifications from 'expo-notifications';
import { TripProvider } from './contexts/TripContext';
import NotificationProvider from './contexts/NotificationContext';
import socketService from './config/socketService';
import userSessionManager from './config/userSessionManager';
import TripStatusNotification from './components/TripStatusNotification';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import ClerkProvider from './components/ClerkProvider';

// Initialize WebBrowser for Google Authentication
WebBrowser.maybeCompleteAuthSession();

// Main app content component with access to auth context
const AppContent = () => {
  // Get authentication status from context
  const { isAuthenticated } = useAuth();
  
  // Keep track of app state to handle notifications properly
  const appState = useRef(AppState.currentState);
  // Reference to notification subscriptions
  const notificationListener = useRef();
  const responseListener = useRef();
  // Track initialization status
  const [servicesInitialized, setServicesInitialized] = useState(false);
  // Track socket connection attempts
  const socketAttempts = useRef(0);
  const maxSocketAttempts = 3;

  // Diagnostic mode for testing
  const [isDiagnosticMode] = useState(__DEV__);

  useEffect(() => {
    // Initialize user session first
    userSessionManager.initUserSession().then(isLoggedIn => {
      console.log(`User session init complete, logged in: ${isLoggedIn}`);
    });

    // Unified initialization function with proper error handling
    async function initializeServices() {
      if (servicesInitialized) return;
      
      try {
        // Initialize WebSocket for all users but only initialize notifications for authenticated users
        const initPromises = [initializeWebSocket()];
        
        // Only initialize notifications if user is authenticated
        if (isAuthenticated) {
          initPromises.push(initializeNotifications());
        } else {
          console.log('User not authenticated, skipping notification initialization');
        }
        
        await Promise.all(initPromises);
        
        setServicesInitialized(true);
        console.log('All services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize one or more services:', error);
        // Allow the app to continue even if some services fail
        setServicesInitialized(true);
      }
    }
    
    // Initialize WebSocket with retry logic and backoff
    async function initializeWebSocket() {
      try {
        // Limit connection attempts
        if (socketAttempts.current >= maxSocketAttempts) {
          console.log(`Reached max WebSocket connection attempts (${maxSocketAttempts}), stopping retries`);
          return;
        }
        
        socketAttempts.current++;
        await socketService.initSocket();
        console.log('WebSocket connection initialized successfully');
        socketAttempts.current = 0; // Reset on success
      } catch (error) {
        console.error(`Failed to initialize WebSocket (attempt ${socketAttempts.current}/${maxSocketAttempts}):`, error);
        if (socketAttempts.current < maxSocketAttempts) {
          // Already handled by the socketService retry logic
          console.log('WebSocket service will handle reconnection');
        }
      }
    }
    
    // Initialize notifications
    async function initializeNotifications() {
      try {
        await notificationService.initialize();
        console.log('Notifications initialized successfully');
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        
        // Show an alert to the user about notification permissions
        if (error.message && error.message.includes('permission')) {
          Alert.alert(
            'Notification Permission Required',
            'Please enable notifications in your device settings to receive important updates.',
            [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
          );
        }
      }
    }
    
    // Start initialization
    initializeServices();
    
    // Watch for app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      // When app comes to foreground from background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        
        // If we've reached max attempts, reset counter when app comes to foreground
        if (socketAttempts.current >= maxSocketAttempts) {
          socketAttempts.current = 0;
        }
        
        // Re-register for notifications if needed and user is authenticated
        if (isAuthenticated) {
          notificationService.registerForPushNotifications();
        }
        
        // Only try to reconnect socket if we haven't reached max attempts
        if (socketAttempts.current < maxSocketAttempts) {
          socketService.getSocket();
        }
      }
      
      appState.current = nextAppState;
    });
    
    // Clean up subscriptions and connections
    return () => {
      subscription.remove();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      // Disconnect WebSocket when app unmounts
      socketService.disconnectSocket();
    };
  }, [servicesInitialized, isDiagnosticMode, isAuthenticated]);

  const linking = {
    prefixes: ['tourismapp://', 'https://your-app-domain.com'],
    config: {
      screens: {
        PaymentSuccess: {
          path: 'payment/success',
          parse: {
            pid: String,
            refId: String,
            amount: Number,
            bookingId: String,
          }
        },
        PaymentFailure: {
          path: 'payment/failure',
          parse: {
            pid: String,
            bookingId: String,
            errorMessage: String,
          }
        },
      },
    },
    // Custom function to get the URL which was used to open the app
    getInitialURL: async () => {
      // First, you may want to do the default deep link handling
      const url = await Linking.getInitialURL();
      
      // Check if app was opened from a deep link
      console.log('Initial URL:', url);
      return url;
    },
    // Custom function that will get called when the app is opened from a deep link
    subscribe: (listener) => {
      // Listen to incoming links from deep linking
      const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        console.log('Incoming URL:', url);
        listener(url);
      });
      
      return () => {
        // Clean up the event listeners
        linkingSubscription.remove();
      };
    },
  };

  return (
    <NavigationContainer
      ref={(navigatorRef) => {
        setNavigationRef(navigatorRef);
      }}
      linking={linking}
    >
      <RootStack />
      {/* Only render TripStatusNotification when user is authenticated */}
      {isAuthenticated && <TripStatusNotification />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ClerkProvider>
      <AuthProvider>
        <TripProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </TripProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}
