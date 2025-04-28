import * as SecureStore from 'expo-secure-store';

// Define the TokenCache class for Clerk token storage
export const tokenCache = {
  async getToken(key) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Error getting token from secure store:', err);
      return null;
    }
  },
  
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Error saving token to secure store:', err);
    }
  },
};

export default tokenCache; 