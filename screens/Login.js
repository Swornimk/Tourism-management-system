import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// formik
import { Formik } from 'formik';

import {
  StyledContainer,
  PageLogo,
  PageTitle,
  SubTitle,
  StyledInputLabel,
  StyledFormArea,
  StyledButton,
  StyledTextInput,
  LeftIcon,
  RightIcon,
  InnerContainer,
  ButtonText,
  MsgBox,
  Line,
  ExtraView,
  ExtraText,
  TextLink,
  TextLinkContent,
  Colors,
} from './../components/styles';
import { View, Text, ActivityIndicator } from 'react-native';

//colors
const { darkLight, brand, primary, red } = Colors;

// icon
import { Octicons, Fontisto, Ionicons } from '@expo/vector-icons';

// keyboard avoiding view
import KeyboardAvoidingWrapper from './../components/KeyboardAvoidingWrapper';

// API URL - using the same configuration as signup
const API_URL = 'http://10.0.2.2:8000';

const Login = ({ navigation }) => {
  const [hidePassword, setHidePassword] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status when login screen loads
    const checkAuthStatus = async () => {
      try {
        const [accessToken, isAdmin] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('isAdmin')
        ]);

        if (accessToken) {
          // If token exists, navigate based on admin status
          if (isAdmin === 'true') {
            navigation.navigate('AdminDashboard');
          } else {
            navigation.navigate('Welcome');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        // Make sure to set loading to false regardless of outcome
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [navigation]);

  const handleMessage = (message, type = 'FAILED') => {
    setMessage(message);
    setMessageType(type);
  };

  // Validation function
  const validateForm = (values) => {
    const errors = {};
    const missingFields = [];
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!values.email) {
      errors.email = 'Email is required';
      missingFields.push('Email');
    } else if (!emailRegex.test(values.email)) {
      errors.email = 'Invalid email format';
    }
    
    // Password validation
    if (!values.password) {
      errors.password = 'Password is required';
      missingFields.push('Password');
    }
    
    // Add missing fields list to errors
    if (missingFields.length > 0) {
      errors._missingFields = missingFields;
    }
    
    return errors;
  };

  // Store only auth tokens in AsyncStorage
  const storeAuthTokens = async (authData) => {
    try {
      console.log('Storing new auth tokens...');
      if (!authData.accessToken || !authData.refreshToken) {
        console.error('Invalid token data received:', authData);
        throw new Error('Invalid token data received');
      }
      
      const itemsToStore = [
        ['accessToken', authData.accessToken],
        ['refreshToken', authData.refreshToken],
        ['isAdmin', authData.isAdmin ? 'true' : 'false']
      ];
      
      // Store userId if available
      if (authData.userId) {
        itemsToStore.push(['userId', authData.userId.toString()]);
      }
      
      await AsyncStorage.multiSet(itemsToStore);
      console.log('Auth tokens stored successfully');
      console.log('Is admin?', authData.isAdmin ? 'Yes' : 'No');
      return true;
    } catch (error) {
      console.error('Error storing auth tokens:', error);
      throw error;
    }
  };

  // Submit to backend
  const submitToBackend = async (values) => {
    try {
      // Trim whitespace from inputs
      const userData = {
        email: values.email.trim(),
        password: values.password.trim()
      };

      // DEBUG ONLY - Remove these logs before production
      console.log('Login attempt with email:', userData.email);
      console.log('Password length:', userData.password);
      console.log('Password first/last chars:', 
        userData.password.charAt(0) + '...' + 
        userData.password.charAt(userData.password)
      );
      
      console.log('Sending request to:', `${API_URL}/login`);

      const response = await axios.post(`${API_URL}/login`, userData);
      
      if (response.data.error) {
        console.log('Login failed:', response.data.error);
        return {
          success: false,
          message: response.data.error
        };
      }

      console.log('Login response:', response.data);

      // Validate response data
      if (!response.data.accessToken || !response.data.refreshToken) {
        console.error('Invalid response data:', response.data);
        return {
          success: false,
          message: 'Invalid response from server'
        };
      }

      // Store auth tokens if login successful
      try {
        await storeAuthTokens(response.data);
        console.log('Login successful, navigating to appropriate screen...');
        
        // Navigate based on user role with a complete navigation reset
        if (response.data.isAdmin) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminDashboard' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
        }
      } catch (error) {
        console.error('Failed to store tokens:', error);
        return {
          success: false,
          message: 'Failed to store authentication data'
        };
      }
      
      return {
        success: true,
        message: response.data.message || 'Login successful!',
        data: response.data
      };
      
    } catch (error) {
      console.error('Login error details:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      return {
        success: false,
        message: error.response?.data?.error || 'Authentication failed. Please check your credentials and try again.'
      };
    }
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setMessage('');
    setMessageType('');
    setIsSubmitting(true);
    
    // Validate form
    const errors = validateForm(values);
    
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      
      if (errors._missingFields && errors._missingFields.length > 0) {
        const missingFieldsText = errors._missingFields.join(', ');
        setMessage(`Please fill in all required fields: ${missingFieldsText}`);
      } else {
        setMessage('Please fix the errors in the form');
      }
      
      setMessageType('ERROR');
      setIsSubmitting(false);
      setSubmitting(false);
      return;
    }
    
    // Form is valid, proceed with submission
    const result = await submitToBackend(values);
    
    if (result.success) {
      setMessage(result.message);
      setMessageType('SUCCESS');
    } else {
      setMessage(result.message);
      setMessageType('ERROR');
    }
    
    setIsSubmitting(false);
    setSubmitting(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingWrapper>
      <StyledContainer>
        <StatusBar style="dark" />
        <InnerContainer>
          <PageLogo resizeMode="cover" source={require('./../assets/img/logo.jpg')} />
          <PageTitle>Travellers</PageTitle>
          <SubTitle>Account Login</SubTitle>

          <Formik
            initialValues={{ email: '', password: '' }}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <StyledFormArea>
                <MyTextInput
                  label="Email Address *"
                  placeholder="andyj@gmail.com"
                  placeholderTextColor={darkLight}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  value={values.email}
                  keyboardType="email-address"
                  icon="mail"
                />
                {touched.email && errors.email && (
                  <Text style={{ color: red, fontSize: 12, marginBottom: 5 }}>{errors.email}</Text>
                )}

                <MyTextInput
                  label="Password *"
                  placeholder="* * * * * * * *"
                  placeholderTextColor={darkLight}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  value={values.password}
                  secureTextEntry={hidePassword}
                  icon="lock"
                  isPassword={true}
                  hidePassword={hidePassword}
                  setHidePassword={setHidePassword}
                />
                {touched.password && errors.password && (
                  <Text style={{ color: red, fontSize: 12, marginBottom: 5 }}>{errors.password}</Text>
                )}

                <Text style={{ color: darkLight, fontSize: 12, textAlign: 'center', marginTop: 5 }}>
                  Fields marked with * are required
                </Text>

                <MsgBox style={{ color: messageType === 'SUCCESS' ? Colors.green : red }}>
                  {message}
                </MsgBox>

                {isSubmitting ? (
                  <View style={{ marginVertical: 10 }}>
                    <ActivityIndicator size="large" color={brand} />
                  </View>
                ) : (
                  <StyledButton onPress={handleSubmit}>
                    <ButtonText>Login</ButtonText>
                  </StyledButton>
                )}

                <Line />
                <StyledButton google={true}>
                  <Fontisto name="google" size={25} color={primary} />
                  <ButtonText google={true}>Sign in with Google</ButtonText>
                </StyledButton>
                <ExtraView>
                  <ExtraText>Don't have an account already? </ExtraText>
                  <TextLink onPress={() => navigation.navigate('Signup')}>
                    <TextLinkContent>Signup</TextLinkContent>
                  </TextLink>
                </ExtraView>
              </StyledFormArea>
            )}
          </Formik>
        </InnerContainer>
      </StyledContainer>
    </KeyboardAvoidingWrapper>
  );
};

const MyTextInput = ({ label, icon, isPassword, hidePassword, setHidePassword, ...props }) => {
  return (
    <View>
      <LeftIcon>
        <Octicons name={icon} size={30} color={brand} />
      </LeftIcon>
      <StyledInputLabel>{label}</StyledInputLabel>
      <StyledTextInput {...props} />
      {isPassword && (
        <RightIcon
          onPress={() => {
            setHidePassword(!hidePassword);
          }}
        >
          <Ionicons name={hidePassword ? 'eye-off' : 'eye'} size={30} color={darkLight} />
        </RightIcon>
      )}
    </View>
  );
};

export default Login;