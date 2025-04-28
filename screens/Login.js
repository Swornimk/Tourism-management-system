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
const { darkLight, brand, primary, red, green } = Colors;

// icon
import { Octicons, Fontisto, Ionicons } from '@expo/vector-icons';

// keyboard avoiding view
import KeyboardAvoidingWrapper from './../components/KeyboardAvoidingWrapper';

// Context
import { useAuth } from '../contexts/AuthContext';

// Clerk Google Button
import ClerkGoogleButton from '../components/ClerkGoogleButton';
// Direct Google Auth (fallback method)
import DirectGoogleAuth from '../components/DirectGoogleAuth';

const Login = ({ navigation }) => {
  const [hidePassword, setHidePassword] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAlternateAuth, setShowAlternateAuth] = useState(false);
  
  // Get auth context
  const { login, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    // Check authentication status when login screen loads
    const checkAuthStatus = async () => {
      try {
        if (isAuthenticated) {
          // Navigate based on user role
          if (isAdmin) {
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
  }, [navigation, isAuthenticated, isAdmin]);

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
    const result = await login(values.email, values.password);
    
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

  // Handle Google auth errors and show alternate method if needed
  const handleGoogleAuthError = (message, type) => {
    setMessage(message);
    setMessageType(type);
    
    // If the error message indicates a server or Clerk issue, 
    // show the alternate sign-in method
    if (
      type === 'ERROR' && 
      (message.includes('Server error') || 
       message.includes('single session mode') ||
       message.includes('500'))
    ) {
      setShowAlternateAuth(true);
    }
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
          <PageTitle>Travel App</PageTitle>
          <SubTitle>Account Login</SubTitle>

          <Formik
            initialValues={{ email: '', password: '' }}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <StyledFormArea>
                <MyTextInput
                  label="Email Address"
                  icon="mail"
                  placeholder="example@email.com"
                  placeholderTextColor={darkLight}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  value={values.email}
                  keyboardType="email-address"
                  error={touched.email && errors.email}
                  isRequired={true}
                />

                <MyTextInput
                  label="Password"
                  icon="lock"
                  placeholder="* * * * * * * *"
                  placeholderTextColor={darkLight}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  value={values.password}
                  secureTextEntry={hidePassword}
                  isPassword={true}
                  hidePassword={hidePassword}
                  setHidePassword={setHidePassword}
                  error={touched.password && errors.password}
                  isRequired={true}
                />

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
                
                {/* Primary Clerk Google Sign-In */}
                <ClerkGoogleButton 
                  setMessage={handleGoogleAuthError}
                  setMessageType={handleGoogleAuthError}
                />

                {/* Alternate Google Sign-In method (shown when primary method fails) */}
                {showAlternateAuth && (
                  <>
                    <Line />
                    <DirectGoogleAuth
                      setMessage={setMessage}
                      setMessageType={setMessageType}
                    />
                  </>
                )}
                
                <ExtraView>
                  <ExtraText>Don't have an account already?</ExtraText>
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

const MyTextInput = ({ label, icon, isPassword, hidePassword, setHidePassword, isRequired, error, ...props }) => {
  return (
    <View>
      <LeftIcon>
        <Octicons name={icon} size={30} color={brand} />
      </LeftIcon>
      <StyledInputLabel>
        {label} {isRequired && <Text style={{ color: red }}>*</Text>}
      </StyledInputLabel>
      <StyledTextInput {...props} />
      {isPassword && (
        <RightIcon onPress={() => setHidePassword(!hidePassword)}>
          <Ionicons name={hidePassword ? 'eye-off' : 'eye'} size={30} color={darkLight} />
        </RightIcon>
      )}
      {error && <Text style={{ color: red, fontSize: 12, marginTop: 5 }}>{error}</Text>}
    </View>
  );
};

export default Login;
