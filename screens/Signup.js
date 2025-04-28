import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios'; // Import axios for HTTP requests

// formik
import { Formik } from 'formik';

import {
  StyledContainer,
  PageTitle,
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
  SubTitle,
  Colors,
} from './../components/styles';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';

//colors
const { darkLight, brand, red } = Colors;

// icon
import { Octicons, Ionicons } from '@expo/vector-icons';

// Datetimepicker
import DateTimePicker from '@react-native-community/datetimepicker';

// keyboard avoiding view
import KeyboardAvoidingWrapper from './../components/KeyboardAvoidingWrapper';

// API URL - replace with your IP address for testing on real device
const API_URL = 'https://tourism-tfph.onrender.com';

const Signup = ({ navigation }) => {
  const [hidePassword, setHidePassword] = useState(true);
  const [show, setShow] = useState(false);
  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actual value to be sent
  const [dob, setDob] = useState();

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShow(false);
    setDate(currentDate);
    setDob(currentDate);
  };

  const showDatePicker = () => {
    setShow('date');
  };

  // Validation function
  const validateForm = (values) => {
    const errors = {};
    const missingFields = [];
    
    // Full Name validation
    if (!values.fullName.trim()) {
      errors.fullName = 'Full Name is required';
      missingFields.push('Full Name');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!values.email) {
      errors.email = 'Email is required';
      missingFields.push('Email');
    } else if (!emailRegex.test(values.email)) {
      errors.email = 'Invalid email format';
    }
    
    // DOB validation
    if (!dob) {
      errors.dateOfBirth = 'Date of Birth is required';
      missingFields.push('Date of Birth');
    }
    
    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!values.password) {
      errors.password = 'Password is required';
      missingFields.push('Password');
    } else if (!passwordRegex.test(values.password)) {
      errors.password = 'Password must be at least 8 characters, include uppercase, lowercase, number and special character';
    }
    
    // Confirm password validation
    if (!values.confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required';
      missingFields.push('Confirm Password');
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Add missing fields list to errors
    if (missingFields.length > 0) {
      errors._missingFields = missingFields;
    }
    
    return errors;
  };

  // Submit to backend
  const submitToBackend = async (values) => {
    try {
      // Format the data to match backend expectations
      const userData = {
        userName: values.fullName,
        email: values.email,
        date: dob ? dob.toISOString() : null,
        password: values.password
      };

      console.log('Sending request to:', `${API_URL}/register`);
      console.log('Data:', JSON.stringify(userData));

      // Make API request
      const response = await axios.post(`${API_URL}/register`, userData);
      
      // Check response
      if (response.data.error) {
        console.log('Registration failed:', response.data.error);
        return {
          success: false,
          message: response.data.error
        };
      }
      
      console.log('Registration successful:', response.data);
      return {
        success: true,
        message: response.data.message || 'Registration successful!'
      };
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Provide more detailed error messages
      if (error.response) {
        // The request was made and the server responded with a status code
        console.log('Error response status:', error.response.status);
        console.log('Error response data:', error.response.data);
        
        if (error.response.status === 404) {
          return {
            success: false,
            message: 'Registration endpoint not found. Please check server configuration.'
          };
        } else if (error.response.status === 409) {
          return {
            success: false,
            message: 'Email already exists. Please use a different email address.'
          };
        } else {
          return {
            success: false,
            message: error.response.data?.error || `Server error (${error.response.status}). Please try again.`
          };
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.log('No response received:', error.request);
        return {
          success: false,
          message: 'No response from server. Please check your internet connection.'
        };
      } else {
        // Something happened in setting up the request
        return {
          success: false,
          message: 'Error sending request. Please try again.'
        };
      }
    }
  };

  // Submit handler
  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setMessage('');
    setMessageType('');
    setIsSubmitting(true);
    
    console.log('Starting signup process...');
    
    // Add Date of Birth to values
    values = { ...values, dateOfBirth: dob };
    
    // Validate form
    const errors = validateForm(values);
    
    if (Object.keys(errors).length > 0) {
      console.log('Form validation failed:', errors);
      setErrors(errors);
      
      // Customize message based on missing fields
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
    
    console.log('Form validation passed, submitting to backend...');
    
    // Form is valid, proceed with submission to backend
    const result = await submitToBackend(values);
    
    if (result.success) {
      console.log('Signup successful, preparing to navigate to Login...');
      setMessage(result.message);
      setMessageType('SUCCESS');
      
      // Navigate to Welcome screen after successful registration
      setTimeout(() => {
        console.log('Navigating to Login screen...');
        navigation.navigate("Login");  // Navigate to Login instead
      }, 1500);
    } else {
      console.log('Signup failed:', result.message);
      setMessage(result.message);
      setMessageType('ERROR');
    }
    
    setIsSubmitting(false);
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingWrapper>
      <StyledContainer>
        <StatusBar style="dark" />
        <InnerContainer>
          <PageTitle>Travellers</PageTitle>
          <SubTitle>Account Signup</SubTitle>
          {show && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onChange}
              style={{
                backgroundColor: 'yellow',
              }}
            />
          )}

          <Formik
            initialValues={{ fullName: '', email: '', dateOfBirth: '', password: '', confirmPassword: '' }}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <StyledFormArea>
                <MyTextInput
                  label="Full Name *"
                  placeholder="Richard Barnes"
                  placeholderTextColor={darkLight}
                  onChangeText={handleChange('fullName')}
                  onBlur={handleBlur('fullName')}
                  value={values.fullName}
                  icon="person"
                />
                {touched.fullName && errors.fullName && (
                  <Text style={{ color: red, fontSize: 12, marginBottom: 5 }}>{errors.fullName}</Text>
                )}
                
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
                  label="Date of Birth *"
                  placeholder="YYYY - MM - DD"
                  placeholderTextColor={darkLight}
                  onChangeText={handleChange('dateOfBirth')}
                  onBlur={handleBlur('dateOfBirth')}
                  value={dob ? dob.toDateString() : ''}
                  icon="calendar"
                  editable={false}
                  isDate={true}
                  showDatePicker={showDatePicker}
                />
                {touched.dateOfBirth && errors.dateOfBirth && (
                  <Text style={{ color: red, fontSize: 12, marginBottom: 5 }}>{errors.dateOfBirth}</Text>
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
                
                <MyTextInput
                  label="Confirm Password *"
                  placeholder="* * * * * * * *"
                  placeholderTextColor={darkLight}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  value={values.confirmPassword}
                  secureTextEntry={hidePassword}
                  icon="lock"
                  isPassword={true}
                  hidePassword={hidePassword}
                  setHidePassword={setHidePassword}
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <Text style={{ color: red, fontSize: 12, marginBottom: 5 }}>{errors.confirmPassword}</Text>
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
                    <ButtonText>Signup</ButtonText>
                  </StyledButton>
                )}
                
                <Line />
                <ExtraView>
                  <ExtraText>Already have an account? </ExtraText>
                  <TextLink onPress={() => navigation.navigate("Login")}>
                    <TextLinkContent>Login</TextLinkContent>
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

const MyTextInput = ({ label, icon, isPassword, hidePassword, setHidePassword, isDate, showDatePicker, ...props }) => {
  return (
    <View>
      <LeftIcon>
        <Octicons name={icon} size={30} color={brand} />
      </LeftIcon>
      <StyledInputLabel>{label}</StyledInputLabel>

      {isDate && (
        <TouchableOpacity onPress={showDatePicker}>
          <StyledTextInput {...props} />
        </TouchableOpacity>
      )}
      {!isDate && <StyledTextInput {...props} />}

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

export default Signup;
