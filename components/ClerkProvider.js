import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage Interface for Clerk using a combination of SecureStore and Memory
// This ensures compatibility across Web, iOS, and Android
const tokenCache = {
  async getToken(key) {
    try {
      if (Platform.OS === 'web') {
        return window.localStorage.getItem(key);
      }
      return SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Error getting token from secure store:', err);
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      if (Platform.OS === 'web') {
        window.localStorage.setItem(key, value);
        return;
      }
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Error saving token to secure store:', err);
    }
  },
};

// Get Clerk publishable key
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 
                        Constants.expoConfig?.extra?.clerkPublishableKey || 
                        'pk_test_c2F2aW5nLWplbm5ldC04MS5jbGVyay5hY2NvdW50cy5kZXYk'; // Using the key from .env
                 
// Clerk Provider wrapper component
export default function ClerkProvider({ children }) {
  // Configure options based on platform
  const clerkOptions = Platform.OS === 'web' 
    ? {
        // Web-specific options
        appearance: {
          elements: {
            formButtonPrimary: {
              backgroundColor: '#1f8a70',
              color: 'white',
              '&:hover, &:focus, &:active': {
                backgroundColor: '#166d56',
              },
            },
          },
        }
      } 
    : {};

  return (
    <BaseClerkProvider 
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      {...clerkOptions}
    >
      {children}
    </BaseClerkProvider>
  );
} 