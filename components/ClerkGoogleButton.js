import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Fontisto } from '@expo/vector-icons';
import { useOAuth, useAuth, useUser } from '@clerk/clerk-expo';
import { StyledButton, ButtonText, Colors } from './styles';
import axios from 'axios';
import userSessionManager from '../config/userSessionManager';
import { useNavigation } from '@react-navigation/native';

const { primary } = Colors;

// API endpoint
const API_URL = 'https://tourism-tfph.onrender.com';

/**
 * Google Sign-In Button using Clerk
 * This component handles Google authentication with Clerk while maintaining
 * compatibility with the existing backend/AsyncStorage system
 */
const ClerkGoogleButton = ({ setMessage, setMessageType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const navigation = useNavigation();

  // Helper function to call the backend API with proper error handling
  const callBackendAPI = async (userData) => {
    try {
      console.log("Sending data to backend:", JSON.stringify(userData, null, 2));
      
      const response = await axios.post(`${API_URL}/auth/google`, userData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log("Backend response:", JSON.stringify(response.data, null, 2));
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      return response.data;
    } catch (error) {
      console.error("Backend API Error:", error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        console.error("Response status:", error.response.status);
        console.error("Response headers:", JSON.stringify(error.response.headers, null, 2));
        
        if (error.response.status === 500) {
          throw new Error("Server error. This could be due to missing required fields or an issue with the server.");
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received from server:", error.request);
        throw new Error("No response from server. Please check your internet connection.");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Request setup error:", error.message);
      }
      
      throw error;
    }
  };

  // Helper function to update socket connection after login
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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      if (setMessage) setMessage('');

      // If user is already signed in with Clerk, sign them out first
      if (isSignedIn) {
        await signOut();
      }

      // Start the OAuth flow with Clerk
      const { createdSessionId, setActive, signIn, signUp, user: oauthUser } = await startOAuthFlow();
      
      // If we have a session, activate it
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        
        // Get user data from Clerk
        const userData = oauthUser || user;
        
        if (userData) {
          const primaryEmail = userData.primaryEmailAddress?.emailAddress;
          const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          const profileImageUrl = userData.imageUrl;
          const externalId = userData.id;
          
          // Ensure we have the minimum required fields
          if (!primaryEmail) {
            throw new Error("Email address is required but was not provided by Google.");
          }
          
          // Prepare user data for backend
          const userDataForBackend = {
            email: primaryEmail,
            name: fullName || 'Google User', // Provide a default if name is empty
            picture: profileImageUrl,
            googleId: externalId,
            // Only include birthdate if it exists
            ...(userData.birthday && { birthdate: userData.birthday })
          };
          
          // Call backend API
          const apiResponse = await callBackendAPI(userDataForBackend);
          
          // Store auth data in your system
          await userSessionManager.setUserSession({
            userId: apiResponse.id,
            isAdmin: apiResponse.isAdmin || false,
            accessToken: apiResponse.accessToken,
            refreshToken: apiResponse.refreshToken
          });
          
          // Setup socket connection with the new token
          await setupSocketConnection(apiResponse);
          
          if (setMessage && setMessageType) {
            setMessage('Successfully signed in with Google!');
            setMessageType('SUCCESS');
          }
          
          // Navigate to appropriate screen based on user role
          if (apiResponse.isAdmin) {
            navigation.navigate('AdminDashboard');
          } else {
            navigation.navigate('Welcome');
          }
        } else {
          throw new Error("Could not get user data from Google.");
        }
      }
    } catch (error) {
      console.error('Clerk Google sign-in error:', error);
      
      // Handle specific error for single session mode
      if (error.message && error.message.includes('single session mode')) {
        // Try to work with the current session
        try {
          if (user) {
            const primaryEmail = user.primaryEmailAddress?.emailAddress;
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            const profileImageUrl = user.imageUrl;
            const externalId = user.id;
            
            // Prepare user data for backend
            const userDataForBackend = {
              email: primaryEmail,
              name: fullName || 'Google User',
              picture: profileImageUrl,
              googleId: externalId
            };
            
            // Authenticate with existing user data
            const apiResponse = await callBackendAPI(userDataForBackend);
            
            // Store auth data
            await userSessionManager.setUserSession({
              userId: apiResponse.id,
              isAdmin: apiResponse.isAdmin || false,
              accessToken: apiResponse.accessToken,
              refreshToken: apiResponse.refreshToken
            });
            
            // Setup socket connection with the new token
            await setupSocketConnection(apiResponse);
            
            if (setMessage && setMessageType) {
              setMessage('Successfully signed in with Google!');
              setMessageType('SUCCESS');
            }
            
            // Navigate to appropriate screen
            if (apiResponse.isAdmin) {
              navigation.navigate('AdminDashboard');
            } else {
              navigation.navigate('Welcome');
            }
            
            return;
          }
        } catch (secondError) {
          console.error('Error handling existing session:', secondError);
        }
      }
      
      if (setMessage && setMessageType) {
        // Provide more specific error messages based on the error type
        let errorMessage = 'Google Sign-In failed. Please try again.';
        
        if (error.message) {
          if (error.message.includes('single session mode')) {
            errorMessage = 'You are already signed in with another account. Please sign out first.';
          } else if (error.message.includes('Server error')) {
            errorMessage = 'Server error. Please try again later or contact support.';
          } else if (error.message.includes('No response from server')) {
            errorMessage = 'Connection error. Please check your internet connection.';
          } else if (error.message.includes('Email address is required')) {
            errorMessage = 'Could not get email from Google. Please try a different sign-in method.';
          } else {
            // Use the error message directly if it's meaningful
            errorMessage = error.message;
          }
        }
        
        setMessage(errorMessage);
        setMessageType('ERROR');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledButton 
      google={true} 
      onPress={handleGoogleSignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={primary} />
      ) : (
        <Fontisto name="google" size={25} color={primary} />
      )}
      <ButtonText google={true}>Sign in with Google</ButtonText>
    </StyledButton>
  );
};

export default ClerkGoogleButton; 