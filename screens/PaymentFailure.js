import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingService } from '../config/services';
import { paymentService } from '../config/services';

const PaymentFailure = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [hasCancelled, setHasCancelled] = useState(false);
  
  // Extract error message and params from route
  const params = route.params || {};
  const errorMessage = params.errorMessage || 'Your payment could not be processed.';

  useEffect(() => {
    // Use a state variable to track if we've already tried to cancel
    if (hasCancelled) {
      return;
    }

    const handleFailedPayment = async () => {
      try {
        console.log('❗ Payment failure screen loaded with params:', params);
        setHasCancelled(true);
        
        // Get the booking ID from params or service
        const bookingId = params.bookingId || await paymentService.getPendingBookingId();
        console.log('❗ Retrieved booking details for cancellation:', { bookingId });
        
        if (bookingId) {
          console.log('❗ Attempting to cancel booking after payment failure:', bookingId);
          
          // Attempt to cancel the booking
          try {
            const response = await bookingService.cancelBooking(bookingId);
            console.log('❗ Booking cancellation response:', response);
            console.log('❗ Successfully cancelled booking after payment failure');
          } catch (cancelError) {
            console.error('❗ Failed to cancel booking:', cancelError);
            if (cancelError.response) {
              console.error('❗ Cancel error response status:', cancelError.response.status);
              console.error('❗ Cancel error response data:', cancelError.response.data);
            }
            // Even if cancellation fails, we should still clear the pending booking
          }
          
          // Clear the pending booking ID
          await paymentService.clearPendingBookingId();
          console.log('❗ Cleared pending booking ID from storage');
        } else {
          console.warn('❗ No pending booking ID found in params or storage');
        }
      } catch (error) {
        console.error('❗ Error handling failed payment:', error);
        if (error.response) {
          console.error('❗ Error response status:', error.response.status);
          console.error('❗ Error response data:', error.response.data);
        }
      }
    };
    
    handleFailedPayment();
  }, [params, hasCancelled]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <LottieView
          source={require('../assets/payment-failed.json')}
          autoPlay
          loop={false}
          style={styles.animation}
        />
        
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.message}>{errorMessage}</Text>
        
        <View style={styles.infoBox}>
          <Icon name="info-outline" size={20} color="#e74c3c" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Don't worry, no payment has been charged from your account. You can try again or choose a different payment method.
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],  // Using 'Welcome' as in PaymentSuccess.js
          })}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={() => navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],  // Using 'Welcome' as in PaymentSuccess.js
          })}
        >
          <Text style={styles.outlineButtonText}>Return to Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => navigation.navigate('Support')} // Replace with your actual support screen name
        >
          <Text style={styles.helpButtonText}>Need help?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  animation: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  outlineButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpButton: {
    marginTop: 15,
    padding: 10,
  },
  helpButtonText: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default PaymentFailure;