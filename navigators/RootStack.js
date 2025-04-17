import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Colors } from './../components/styles';
const { tertiary } = Colors;

// React Navigation
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// screens
import Login from './../screens/Login';
import Signup from './../screens/Signup';
import HomeNavigator from './../screens/Home';
import AdminDashboard from './../screens/Adminpanel';
import AdminTripManagement from './../screens/AdminTripManagement';
import PaymentSuccess from './../screens/PaymentSuccess';
import PaymentFailure from './../screens/PaymentFailure';
import EsewaPaymentScreen from './../screens/EsewaPaymentScreen';
import MyBookings from './../screens/MyBookings';
import AdminBookings from './../screens/AdminBookings';
import { TripApproval } from './../screens/TripComponents';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:8000';

const Stack = createStackNavigator();

// Authentication loading screen
const AuthLoadingScreen = ({ navigation }) => {
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('Checking authentication status...');
      try {
        // Get tokens from storage
        const accessToken = await AsyncStorage.getItem('accessToken');
        const isAdmin = await AsyncStorage.getItem('isAdmin');
        
        console.log('Auth check:', accessToken ? 'Token exists' : 'No token');
        console.log('Is admin?', isAdmin === 'true' ? 'Yes' : 'No');

        if (!accessToken) {
          // No token found, redirect to login
          console.log('No access token found, redirecting to Login');
          navigation.replace('Login');
          return;
        }

        // Verify token is valid with backend
        try {
          console.log('Verifying token with backend...');
          await axios.get(`${API_URL}/getuser`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          // Token is valid, navigate based on admin status
          if (isAdmin === 'true') {
            console.log('Valid admin token, navigating to AdminDashboard');
            navigation.replace('AdminDashboard');
          } else {
            console.log('Valid user token, navigating to Welcome');
            navigation.replace('Welcome');
          }
        } catch (error) {
          console.error('Token validation error:', error.message);
          // Token is invalid, clear storage and redirect to login
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigation.replace('Login');
      }
    };

    checkAuthStatus();
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color={tertiary} />
      <Text style={{ marginTop: 15, color: '#555' }}>Checking authentication...</Text>
    </View>
  );
};

const RootStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: tertiary,
        headerTransparent: true,
        headerTitle: '',
        headerLeftContainerStyle: {
          paddingLeft: 20,
        },
        headerShown: false,
      }}
      initialRouteName="AuthLoading"
    >
      <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen 
        name="Welcome" 
        component={HomeNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdminTripManagement" 
        component={AdminTripManagement}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TripApproval" 
        component={TripApproval}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccess}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PaymentFailure" 
        component={PaymentFailure}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EsewaPayment" 
        component={EsewaPaymentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MyBookings" 
        component={MyBookings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdminBookings" 
        component={AdminBookings}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default RootStack;