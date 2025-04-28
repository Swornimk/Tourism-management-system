import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { paymentService } from '../config/services';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentSuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [hasVerified, setHasVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState({
    success: false,
    message: '',
    data: null
  });

  useEffect(() => {
    // Skip verification if we've already done it
    if (hasVerified) {
      return;
    }
    
    const verifyPayment = async () => {
      try {
        // Get payment params from route or parse from URL
        const params = route.params || {};
        console.log('❗ Payment success screen loaded with params:', params);
        setHasVerified(true);
        
        // Extract parameters from route params
        // eSewa v1 API uses 'oid', not 'pid', for the transaction ID
        const pid = params.pid || params.oid || params.transactionId || '';
        const refId = params.refId || '';
        const amount = params.amount || params.amt || 0;
        const bookingId = params.bookingId || await paymentService.getPendingBookingId();
        
        console.log('❗ Retrieved payment details:', { pid, refId, amount, bookingId });
        
        if (!pid || !refId || !bookingId) {
          console.error('❗ Missing payment information', { pid, refId, bookingId });
          setVerificationStatus({
            success: false,
            message: 'Missing payment information. Please contact support.',
            data: null
          });
          setLoading(false);
          return;
        }
        
        console.log('❗ Verifying payment with backend:', { pid, refId, amount, bookingId });
        
        // Verify payment with backend
        const response = await paymentService.verifyEsewaPayment({
          pid,
          refId,
          amount,
          bookingId
        });
        
        console.log('❗ Payment verification response:', response);
        
        // Clear the pending booking ID
        await paymentService.clearPendingBookingId();
        console.log('❗ Cleared pending booking ID from storage');
        
        setVerificationStatus({
          success: true,
          message: response.message,
          data: response.data
        });
      } catch (error) {
        console.error('❗ Payment verification error:', error);
        if (error.response) {
          console.error('❗ Error response status:', error.response.status);
          console.error('❗ Error response data:', error.response.data);
        }
        setVerificationStatus({
          success: false,
          message: error.response?.data?.message || 'Payment verification failed',
          data: null
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [route, hasVerified]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Verifying payment...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {verificationStatus.success ? (
        <View style={styles.successContainer}>
          <LottieView
            source={require('../assets/payment-success.json')}
            autoPlay
            loop={false}
            style={styles.animation}
          />
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successMessage}>
            Your booking has been confirmed. Thank you for your payment.
          </Text>
          
          <View style={styles.bookingDetails}>
            <Text style={styles.bookingTitle}>Booking Details</Text>
            {verificationStatus.data && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID:</Text>
                  <Text style={styles.detailValue}>{verificationStatus.data.paymentId || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>NPR {verificationStatus.data.totalAmount || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, styles.statusSuccess]}>
                    {verificationStatus.data.paymentStatus || 'completed'}
                  </Text>
                </View>
              </>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }], 
            })}
          >
            <Text style={styles.buttonText}>Return to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => navigation.navigate('MyBookings')} // Keep this as is if MyBookings screen exists
          >
            <Text style={styles.outlineButtonText}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={80} color="#e74c3c" />
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{verificationStatus.message}</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }], // Replace 'Main' with your app's main screen name
            })}
          >
            <Text style={styles.outlineButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  animation: {
    width: 200,
    height: 200,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
  },
  bookingDetails: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#777',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSuccess: {
    color: '#2ecc71',
    textTransform: 'capitalize',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
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
});

export default PaymentSuccess;