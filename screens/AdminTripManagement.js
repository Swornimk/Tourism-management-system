import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:8000';

const AdminTripManagement = ({ navigation, route }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);
  
  // Listen for navigation params to refresh
  useEffect(() => {
    if (route.params?.refresh) {
      fetchTrips();
      // Clear the parameter to prevent multiple refreshes
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  const checkAuthAndFetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      
      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }
      
      // Verify this is an admin account
      if (isAdmin !== 'true') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        return;
      }
      
      // Set access token in state and fetch data
      setAccessToken(token);
      fetchTrips(token);
    } catch (error) {
      console.error('Error checking auth status:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const fetchTrips = async (token) => {
    setLoading(true);
    try {
      const authToken = token || await AsyncStorage.getItem('accessToken');
      
      if (!authToken) {
        setLoading(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const tripsResponse = await axios.get(`${API_URL}/trips/all`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      setTrips(tripsResponse.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
      
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert('Error', 'Failed to fetch trips. Please try again later.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const handleUpdateTripStatus = async (tripId, newStatus) => {
    try {
      if (!accessToken) {
        Alert.alert('Session Expired', 'Please log in again to continue.');
        // Navigate to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const response = await axios.patch(
        `${API_URL}/trips/${tripId}/status`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.message) {
        // Update the local trip status
        setTrips(trips.map(trip => 
          trip._id === tripId 
            ? { ...trip, status: newStatus, updatedAt: new Date() }
            : trip
        ));
        
        Alert.alert('Success', `Trip ${newStatus} successfully!`);
      }
    } catch (error) {
      console.error('Error updating trip status:', error);
      
      let errorMessage = 'Failed to update trip status. Please try again.';
      
      if (error.response) {
        // Handle specific error responses from the server
        if (error.response.status === 401) {
          // Token expired or invalid
          Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
          // Clear stored tokens
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
          // Navigate to login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return;
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.response.data && error.response.data.error) {
          // Only show user-friendly messages, not technical errors
          if (error.response.data.error.includes('jwt expired')) {
            Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
            // Clear stored tokens
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
            // Navigate to login
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            return;
          } else {
            errorMessage = 'Unable to update trip status. Please try again.';
          }
        }
      } else if (error.message && (
        error.message.includes('expired') || 
        error.message.includes('invalid token') || 
        error.message.includes('jwt')
      )) {
        // Handle token-related errors in the error message
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        // Clear stored tokens
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
        // Navigate to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }
      
      // Show a user-friendly error message
      Alert.alert('Error', errorMessage);
    }
  };

  const handleViewTripDetails = (trip) => {
    navigation.navigate('TripApproval', { trip });
  };

  const renderStatusFilter = () => {
    const filterOptions = [
      { label: 'All', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' }
    ];

    return (
      <View style={styles.filterContainer}>
        {filterOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterButton,
              filterStatus === option.value && styles.activeFilterButton
            ]}
            onPress={() => setFilterStatus(option.value)}
          >
            <Text 
              style={[
                styles.filterButtonText,
                filterStatus === option.value && styles.activeFilterButtonText
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const filteredTrips = filterStatus === 'all' 
    ? trips 
    : trips.filter(trip => trip.status === filterStatus);

  const renderTrip = ({ item: trip }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'approved': return '#2ecc71';
        case 'rejected': return '#e74c3c';
        default: return '#f1c40f';
      }
    };

    const formatDate = (dateString) => {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
      <View style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <View>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            <Text style={styles.tripLocation}>{trip.location}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(trip.status) }
          ]}>
            <Text style={styles.statusText}>{trip.status}</Text>
          </View>
        </View>

        {trip.tripImageUrl && (
          <TouchableOpacity onPress={() => handleViewTripDetails(trip)}>
            <Image
              source={{ uri: trip.tripImageUrl }}
              style={styles.tripImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        <View style={styles.tripInfoRow}>
          <Icon name="person" size={16} color="#666" />
          <Text style={styles.tripInfoText}>Host: {trip.userName}</Text>
        </View>
        
        <View style={styles.tripInfoRow}>
          <Icon name="date-range" size={16} color="#666" />
          <Text style={styles.tripInfoText}>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </Text>
        </View>
        
        <View style={styles.tripInfoRow}>
          <Icon name="attach-money" size={16} color="#666" />
          <Text style={styles.tripInfoText}>Rs. {trip.price}</Text>
        </View>

        <View style={styles.tripDescription}>
          <Text numberOfLines={2} style={styles.tripDescriptionText}>
            {trip.description}
          </Text>
        </View>

        {trip.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleUpdateTripStatus(trip._id, 'rejected')}
            >
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleUpdateTripStatus(trip._id, 'approved')}
            >
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStatusFilter()}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          renderItem={renderTrip}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.tripList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3498db']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="beach-access" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                {filterStatus === 'all' 
                  ? 'No trips found' 
                  : `No ${filterStatus} trips found`
                }
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#3498db',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeFilterButton: {
    backgroundColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripList: {
    padding: 15,
  },
  tripCard: {
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
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tripLocation: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  tripImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  tripInfoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  tripDescription: {
    marginTop: 5,
    marginBottom: 10,
  },
  tripDescriptionText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    marginRight: 5,
  },
  approveButton: {
    backgroundColor: '#2ecc71',
    marginLeft: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },
});

export default AdminTripManagement; 