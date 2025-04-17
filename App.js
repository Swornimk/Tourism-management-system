import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import RootStack from './navigators/RootStack';
import { setNavigationRef } from './config/services';

export default function App() {
  const linking = {
    prefixes: ['tourismapp://', 'https://your-app-domain.com'],
    config: {
      screens: {
        PaymentSuccess: {
          path: 'payment/success',
          parse: {
            pid: String,
            refId: String,
            amount: Number,
            bookingId: String,
          }
        },
        PaymentFailure: {
          path: 'payment/failure',
          parse: {
            pid: String,
            bookingId: String,
            errorMessage: String,
          }
        },
      },
    },
    // Custom function to get the URL which was used to open the app
    getInitialURL: async () => {
      // First, you may want to do the default deep link handling
      const url = await Linking.getInitialURL();
      
      // Check if app was opened from a deep link
      console.log('Initial URL:', url);
      return url;
    },
    // Custom function that will get called when the app is opened from a deep link
    subscribe: (listener) => {
      // Listen to incoming links from deep linking
      const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        console.log('Incoming URL:', url);
        listener(url);
      });
      
      return () => {
        // Clean up the event listeners
        linkingSubscription.remove();
      };
    },
  };

  return (
    <NavigationContainer
      ref={(navigatorRef) => {
        setNavigationRef(navigatorRef);
      }}
      linking={linking}
    >
      <RootStack />
    </NavigationContainer>
  );
}