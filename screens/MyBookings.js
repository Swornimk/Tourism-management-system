import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar // Import React Native's StatusBar for height
} from 'react-native';
import { StatusBar } from 'expo-status-bar'; // Keep Expo's StatusBar for styling
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:8000';

// Get status bar height
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0;

const MyBookings = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/bookings/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
      case 'complete':
        return '#2ecc71'; // Green
      case 'pending':
        return '#f39c12'; // Orange
      case 'cancelled':
      case 'failed':
        return '#e74c3c'; // Red
      default:
        return '#7f8c8d'; // Gray
    }
  };

  const handleCancelBooking = async (bookingId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken');
              await axios.delete(`${API_URL}/bookings/${bookingId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setBookings(bookings.filter(booking => booking._id !== bookingId));
              Alert.alert('Success', 'Booking cancelled successfully');
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  };

  const renderPaymentMethod = (method) => {
    switch(method?.toLowerCase()) {
      case 'esewa':
        return (
          <View style={styles.paymentMethodContainer}>
            <Icon name="account-balance-wallet" size={16} color="#60BB46" />
            <Text style={[styles.paymentMethod, {color: '#60BB46'}]}>eSewa</Text>
          </View>
        );
      case 'cashonarrival':
        return (
          <View style={styles.paymentMethodContainer}>
            <Icon name="payments" size={16} color="#3498db" />
            <Text style={[styles.paymentMethod, {color: '#3498db'}]}>Cash on Arrival</Text>
          </View>
        );
      default:
        return (
          <View style={styles.paymentMethodContainer}>
            <Icon name="payment" size={16} color="#7f8c8d" />
            <Text style={styles.paymentMethod}>{method || 'Unknown'}</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.statusBarPlaceholder} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3498db']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            {/* Header with trip title and status */}
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingTitle} numberOfLines={1}>
                {item.tripDetails?.title || 'Unknown Trip'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.paymentStatus) }]}>
                <Text style={styles.statusText}>{item.paymentStatus}</Text>
              </View>
            </View>
            
            {/* Trip location if available */}
            {item.tripDetails?.location && (
              <View style={styles.locationRow}>
                <Icon name="place" size={16} color="#666" />
                <Text style={styles.locationText}>{item.tripDetails.location}</Text>
              </View>
            )}
            
            {/* Booking details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking Date:</Text>
                <Text style={styles.detailValue}>{formatDate(item.bookingDate)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>People:</Text>
                <Text style={styles.detailValue}>{item.numberOfPeople}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>NPR {item.totalAmount?.toLocaleString()}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment:</Text>
                {renderPaymentMethod(item.paymentMethod)}
              </View>
              
              {item.paymentId && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{item.paymentId}</Text>
                </View>
              )}
            </View>
            
            {/* Cancel button - only show for pending bookings */}
            {item.paymentStatus === 'pending' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelBooking(item._id)}
              >
                <Icon name="cancel" size={16} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBarPlaceholder: {
    height: STATUSBAR_HEIGHT,
    backgroundColor: '#fff', // Match header color
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    maxWidth: '60%',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 5,
  },
});

export default MyBookings;