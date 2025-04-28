import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { bookingService, paymentService } from '../config/services';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useEsewaPayment from '../hooks/useEsewaPayment';

const BookingForm = ({ trip, onClose, navigation }) => {
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const { initiatePayment } = useEsewaPayment();

  // Debug: Log trip object structure
  console.log('Trip object being used for booking:', JSON.stringify(trip, null, 2));

  // Get userId on component mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error('Error getting userId from storage:', error);
      }
    };
    
    getUserId();
  }, []);

  const totalAmount = trip.price * numberOfPeople;

  const incrementPeople = () => {
    setNumberOfPeople(prev => prev + 1);
  };

  const decrementPeople = () => {
    if (numberOfPeople > 1) {
      setNumberOfPeople(prev => prev - 1);
    }
  };

  const handleBookNow = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the trip id from the trip object
      if (!trip) {
        throw new Error('Invalid trip data');
      }
      
      const tripId = trip.id || trip._id;
      
      if (!tripId) {
        throw new Error('Trip ID not found in trip data');
      }
      
      // Create booking data
      const bookingData = {
        tripId,
        numberOfPeople,
        userId: userId || 'guest-user' // Use guest-user if no userId available
      };
      
      console.log('Creating booking with data:', bookingData);
      
      // Create booking first
      const bookingResponse = await bookingService.createBooking(bookingData);
      
      if (!bookingResponse.success) {
        throw new Error(bookingResponse.message || 'Failed to create booking');
      }
      
      console.log('Booking created successfully:', bookingResponse);
      const bookingId = bookingResponse.data._id || bookingResponse.data.id;
      
      // Store booking ID for verification after payment
      if (bookingId) {
        await paymentService.setPendingBookingId(bookingId);
      } else {
        console.error('No booking ID found in response', bookingResponse);
      }
      
      // Calculate total amount
      const totalAmount = (trip.price * numberOfPeople).toString();
      
      // Initialize eSewa payment
      const paymentResponse = initiatePayment(
        totalAmount,
        `Booking for ${trip.title}`,
        bookingId
      );
      
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || 'Failed to initialize payment');
      }
      
      // Navigate to payment screen with eSewa payment data
      navigation.navigate('EsewaPayment', { 
        paymentData: paymentResponse.data,
        bookingId: bookingId
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Booking failed:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book Your Trip</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="#777" />
        </TouchableOpacity>
      </View>

      <View style={styles.tripInfo}>
        <Text style={styles.tripName}>{trip.title}</Text>
        <Text style={styles.tripLocation}>
          <Icon name="place" size={16} color="#3498db" /> {trip.location}
        </Text>
        <Text style={styles.tripDuration}>
          <Icon name="event" size={16} color="#3498db" /> {trip.duration} days
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Number of People</Text>
        <View style={styles.quantitySelector}>
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={decrementPeople}
            disabled={numberOfPeople <= 1}
          >
            <Icon 
              name="remove" 
              size={20} 
              color={numberOfPeople <= 1 ? '#ccc' : '#3498db'} 
            />
          </TouchableOpacity>
          
          <TextInput
            style={styles.quantityInput}
            value={numberOfPeople.toString()}
            onChangeText={(text) => {
              const num = parseInt(text);
              if (!isNaN(num) && num > 0) {
                setNumberOfPeople(num);
              } else if (text === '') {
                setNumberOfPeople(1); // Default to 1 if empty
              }
            }}
            keyboardType="numeric"
          />
          
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={incrementPeople}
          >
            <Icon name="add" size={20} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.priceContainer}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price per person</Text>
          <Text style={styles.priceValue}>NPR {trip.price.toLocaleString()}</Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Number of people</Text>
          <Text style={styles.priceValue}>{numberOfPeople}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>NPR {totalAmount.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.paymentInfo}>
        <Icon name="info-outline" size={20} color="#3498db" />
        <Text style={styles.paymentInfoText}>
          Payment will be processed securely through eSewa. You will be redirected to the eSewa payment gateway to complete your transaction.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={20} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={styles.bookButton}
        onPress={handleBookNow}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name="payment" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.bookButtonText}>Pay with eSewa</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  tripInfo: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    margin: 15,
  },
  tripName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tripLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  tripDuration: {
    fontSize: 14,
    color: '#666',
  },
  formGroup: {
    margin: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
  quantityInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
  },
  priceContainer: {
    margin: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: '#777',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  paymentInfo: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  paymentInfoText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  errorText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: '#e74c3c',
    lineHeight: 20,
  },
  bookButton: {
    backgroundColor: '#3498db',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingForm; 