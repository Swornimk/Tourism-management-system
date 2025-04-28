import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Fontisto } from '@expo/vector-icons';
import { StyledButton, ButtonText, Colors } from './styles';
import { useAuth } from '../contexts/AuthContext';

const { primary } = Colors;

/**
 * Google Sign-In Button Component
 * Reusable component for Google authentication
 */
const GoogleLoginButton = ({ isSubmitting, onPress, setMessage, setMessageType }) => {
  const { googleSignIn, request: googleAuthRequest } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      if (setMessage) setMessage('');
      
      // Execute callback if provided (for loading states)
      if (onPress) onPress(true);
      
      // Trigger Google Sign-In
      await googleSignIn();
      
      // The auth context will handle the authentication flow
      // and navigation after successful login
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (setMessage && setMessageType) {
        setMessage('Google Sign-In failed. Please try again.');
        setMessageType('ERROR');
      }
    } finally {
      // Complete the operation
      if (onPress) onPress(false);
    }
  };

  return (
    <StyledButton 
      google={true} 
      onPress={handleGoogleSignIn}
      disabled={!googleAuthRequest || isSubmitting}
    >
      {isSubmitting ? (
        <ActivityIndicator size="small" color={primary} />
      ) : (
        <Fontisto name="google" size={25} color={primary} />
      )}
      <ButtonText google={true}>Sign in with Google</ButtonText>
    </StyledButton>
  );
};

export default GoogleLoginButton; 