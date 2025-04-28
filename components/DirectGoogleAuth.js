import React, { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { Fontisto } from '@expo/vector-icons';
import { StyledButton, ButtonText, Colors } from './styles';
import axios from 'axios';
import userSessionManager from '../config/userSessionManager';
import { useNavigation } from '@react-navigation/native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

const { primary } = Colors;

// API endpoint
const API_URL = 'https://tourism-tfph.onrender.com';

// Ensure WebBrowser auth sessions are completed 
WebBrowser.maybeCompleteAuthSession();

/**
 * Direct Google Authentication Button
 * This uses Expo's Google auth provider directly, bypassing Clerk
 * Use this as a fallback when Clerk Google auth fails
 */
const DirectGoogleAuth = ({ setMessage, setMessageType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  
  // Configure Google auth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "365137678690-bhfe7pbqhvq0qohemdkki0ctd4hdqud7.apps.googleusercontent.com",
    iosClientId: "365137678690-225n6k5f21p4on7qcnt4b0707s6dm77r.apps.googleusercontent.com",
    webClientId: "365137678690-kfd4urtlldq7491udnrvq3gdkaqg46da.apps.googleusercontent.com",
    expoClientId: "76957dea-4f2f-4c67-886c-0bcf99ed46e8",
  });
  
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
  
  // Handle Google sign-in
  const handleDirectGoogleAuth = async () => {
    try {
      setIsLoading(true);
      if (setMessage) setMessage('');
      
      // Start Google auth flow
      await promptAsync();
      
    } catch (error) {
      console.error('Direct Google auth error:', error);
      if (setMessage && setMessageType) {
        setMessage('Google Sign-In failed. Please try again.');
        setMessageType('ERROR');
      }
      setIsLoading(false);
    }
  };
  
  // Handle response from Google auth
  React.useEffect(() => {
    if (response?.type === 'success') {
      const fetchUserInfo = async () => {
        try {
          // Get access token from response
          const { authentication } = response;
          
          if (!authentication || !authentication.accessToken) {
            throw new Error('No access token received from Google');
          }
          
          // Fetch user info from Google
          const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${authentication.accessToken}` }
          });
          
          const userData = await userInfoResponse.json();
          console.log('Google user data:', JSON.stringify(userData, null, 2));
          
          // Prepare data for backend
          const userDataForBackend = {
            email: userData.email,
            name: userData.name || 'Google User',
            picture: userData.picture,
            googleId: userData.id
          };
          
          // Call backend with detailed error logging
          try {
            console.log("Sending data to backend:", JSON.stringify(userDataForBackend, null, 2));
            
            const backendResponse = await axios.post(`${API_URL}/auth/google`, userDataForBackend, {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            
            console.log("Backend response:", JSON.stringify(backendResponse.data, null, 2));
            
            if (backendResponse.data.error) {
              throw new Error(backendResponse.data.error);
            }
            
            // Store auth data
            await userSessionManager.setUserSession({
              userId: backendResponse.data.id,
              isAdmin: backendResponse.data.isAdmin || false,
              accessToken: backendResponse.data.accessToken,
              refreshToken: backendResponse.data.refreshToken
            });
            
            // Setup socket connection with the new token
            await setupSocketConnection(backendResponse.data);
            
            if (setMessage && setMessageType) {
              setMessage('Successfully signed in with Google!');
              setMessageType('SUCCESS');
            }
            
            // Navigate to appropriate screen
            if (backendResponse.data.isAdmin) {
              navigation.navigate('AdminDashboard');
            } else {
              navigation.navigate('Welcome');
            }
          } catch (apiError) {
            console.error("Backend API Error:", apiError);
            
            if (apiError.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              console.error("Response data:", JSON.stringify(apiError.response.data, null, 2));
              console.error("Response status:", apiError.response.status);
              console.error("Response headers:", JSON.stringify(apiError.response.headers, null, 2));
              
              if (apiError.response.status === 500) {
                throw new Error("Server error. This could be due to missing required fields or an issue with the server.");
              }
            } else if (apiError.request) {
              // The request was made but no response was received
              console.error("No response received from server:", apiError.request);
              throw new Error("No response from server. Please check your internet connection.");
            } else {
              // Something happened in setting up the request that triggered an Error
              console.error("Request setup error:", apiError.message);
            }
            
            throw apiError;
          }
          
        } catch (error) {
          console.error('Error processing Google auth:', error);
          if (setMessage && setMessageType) {
            // Provide more specific error messages based on the error type
            let errorMessage = 'Error processing Google authentication. Please try again.';
            
            if (error.message) {
              if (error.message.includes('Server error')) {
                errorMessage = 'Server error. Please try again later or contact support.';
              } else if (error.message.includes('No response from server')) {
                errorMessage = 'Connection error. Please check your internet connection.';
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
      
      fetchUserInfo();
    } else if (response?.type === 'error') {
      console.error('Google auth response error:', response.error);
      if (setMessage && setMessageType) {
        setMessage('Google authentication failed. Please try again.');
        setMessageType('ERROR');
      }
      setIsLoading(false);
    }
  }, [response]);
  
  return (
    <StyledButton 
      google={true} 
      onPress={handleDirectGoogleAuth}
      disabled={isLoading || !request}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={primary} />
      ) : (
        <Fontisto name="google" size={25} color={primary} />
      )}
      <ButtonText google={true}>Sign in with Google (Alternate)</ButtonText>
    </StyledButton>
  );
};

export default DirectGoogleAuth;