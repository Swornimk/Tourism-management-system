import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
  ToastAndroid,
  Platform,
  LogBox
} from 'react-native';
import { Colors } from '../components/styles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../config/socketService';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'https://tourism-tfph.onrender.com';

// Ignore specific warnings or errors to prevent them from showing in the console
// This helps prevent the red error box from appearing
LogBox.ignoreLogs([
  'Error changing password', // Ignore our custom error messages
  'Request failed with status code 401', // Ignore 401 errors which are handled properly
  'Network Error', // Ignore network errors which we handle
]);

// Helper function to show toast or alert based on platform
const showToast = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // For iOS, use Alert as a fallback since iOS doesn't have built-in toast
    Alert.alert('', message);
  }
};

// Custom error handler to prevent raw error display
const handleApiError = (error) => {
  // Prevent the error from being logged to the console
  // This helps avoid the red error screen in development
  if (__DEV__) {
    console.log('API Error handled gracefully:', error.message);
  }
  
  // Handle specific error cases with user-friendly messages
  let errorMessage = 'Failed to change password. Please try again.';
  
  if (error.response) {
    // The request was made and the server responded with a status code
    const status = error.response.status;
    const serverError = error.response.data?.error;
    
    if (status === 401 && serverError?.includes('current password is incorrect')) {
      errorMessage = 'Your current password is incorrect. Please try again.';
    } else if (status === 400 && serverError?.includes('Password must be at least')) {
      errorMessage = serverError; // Use the server's message about password requirements
    } else if (status === 400 && serverError?.includes('do not match')) {
      errorMessage = 'New password and confirmation do not match.';
    } else if (serverError) {
      // Use server's error message if available
      errorMessage = serverError;
    }
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'Unable to connect to the server. Please check your internet connection.';
  } else {
    // Something happened in setting up the request
    errorMessage = 'An error occurred. Please try again later.';
  }
  
  return errorMessage;
};

const ChangePassword = ({ navigation }) => {
  // Get the logout function from AuthContext
  const { logout } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Add useEffect for component initialization
  useEffect(() => {
    // Set up global error handler for this screen
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Filter out password-related errors that we handle ourselves
      const errorMessage = args[0]?.toString() || '';
      if (
        errorMessage.includes('Error changing password') || 
        errorMessage.includes('status code 401') ||
        errorMessage.includes('Network Error')
      ) {
        // Just log without triggering the error modal
        console.log('Suppressed error:', args[0]);
        return;
      }
      // For all other errors, use the original console.error
      originalConsoleError(...args);
    };

    // Cleanup when component unmounts
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Validate the form
  const validateForm = () => {
    let isValid = true;
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };

    // Check if current password is entered
    if (!currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

    // Check if new password is entered and meets requirements
    if (!newPassword.trim()) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
      isValid = false;
    } else if (newPassword === currentPassword) {
      errors.newPassword = 'New password must be different from current password';
      isValid = false;
    }

    // Check if confirm password matches new password
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        Alert.alert('Error', 'You need to be logged in to change your password');
        navigation.navigate('Login');
        return;
      }

      const requestData = {
        currentPassword,
        newPassword,
        confirmPassword
      };
      
      const requestConfig = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      let response;
      
      try {
        // First try PUT (RESTful approach)
        response = await axios.put(
          `${API_URL}/change-password`,
          requestData,
          requestConfig
        );
      } catch (putError) {
        // Using the custom error handler to log in a controlled way
        if (__DEV__) {
          console.log('PUT request failed, falling back to POST:', putError.message);
          console.log('Error details:', {
            status: putError.response?.status,
            data: putError.response?.data
          });
        }
        
        // Show a notification about the fallback only if the error is a network error
        if (!putError.response) {
          showToast('Network issue detected, trying alternative method...');
        }
        
        // Fall back to POST if PUT fails
        try {
          response = await axios.post(
            `${API_URL}/change-password`,
            requestData,
            requestConfig
          );
        } catch (postError) {
          // This will throw and be caught by the outer catch block
          throw postError;
        }
      }

      if (response.data.message) {
        try {
          // Set loading state while clearing data
          setLoading(true);
          
          // Show success message and then handle logout
          Alert.alert(
            'Success',
            'Your password has been updated successfully! Please sign in again with your new password.',
            [
              { 
                text: 'OK', 
                onPress: async () => {
                  try {
                    // First clear all auth tokens
                    await AsyncStorage.multiRemove([
                      'accessToken', 
                      'refreshToken', 
                      'userData',
                      'userId',
                      'isAdmin',
                      'userName',
                      'userEmail'
                    ]);
                    
                    // Execute the standard logout function
                    await logout();
                    
                    // Force navigation to Login screen
                    setTimeout(() => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    }, 100);
                  } catch (error) {
                    console.error('Error during logout:', error);
                    // As a last resort, directly navigate to Login
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }
                }
              }
            ]
          );
        } catch (logoutError) {
          console.log('Error during logout process:', logoutError);
          // Still try to navigate to login even if there's an error clearing data
          navigation.replace('Login');
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      
      const errorMessage = handleApiError(error);
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#3498db" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.description}>
          Update your password by entering your current password followed by your new password.
        </Text>
        
        {/* Current Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Icon 
                name={showCurrentPassword ? "visibility-off" : "visibility"} 
                size={22} 
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {formErrors.currentPassword ? 
            <Text style={styles.errorText}>{formErrors.currentPassword}</Text> 
            : null}
        </View>
        
        {/* New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Icon 
                name={showNewPassword ? "visibility-off" : "visibility"} 
                size={22} 
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {formErrors.newPassword ? 
            <Text style={styles.errorText}>{formErrors.newPassword}</Text> 
            : null}
          <Text style={styles.passwordHint}>
            Password must be at least 6 characters long
          </Text>
        </View>
        
        {/* Confirm New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon 
                name={showConfirmPassword ? "visibility-off" : "visibility"} 
                size={22} 
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {formErrors.confirmPassword ? 
            <Text style={styles.errorText}>{formErrors.confirmPassword}</Text> 
            : null}
        </View>
      </ScrollView>
      
      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    padding: 12,
    color: '#333',
  },
  eyeIcon: {
    padding: 12,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChangePassword; 