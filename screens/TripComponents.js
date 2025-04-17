import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:8000';

// TripDetails Screen Component for normal users
export const TripDetails = ({ route, navigation }) => {
  const { trip, from } = route.params;

  useEffect(() => {
    console.log('TripDetails mounted with trip:', trip._id);
    console.log('Navigated from:', from || 'unknown');
  }, []);

  const handleGoBack = () => {
    // Use simple goBack for more reliable navigation
    navigation.goBack();
  };

  const formatItinerary = (description) => {
    // Simple logic to format description as itinerary
    if (!description) return [];
    
    // Split by newlines or periods as a simple approach
    const items = description.split(/\.\s|\n/).filter(item => item.trim().length > 0);
    
    // For demo purposes, prefix each item with "Day X: " if not already
    return items.map((item, index) => {
      if (item.startsWith('Day')) return item;
      return `Day ${index + 1}: ${item}`;
    });
  };

  const itinerary = formatItinerary(trip.description);

  return (
    <View style={styles.tripApprovalContainer}>
      <View style={styles.tripApprovalHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.tripApprovalTitle}>Trip Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.tripApprovalContent}>
        <View style={styles.tripApprovalImageContainer}>
          <Image 
            source={{ uri: trip.tripImageUrl || 'https://via.placeholder.com/400x200' }}
            style={styles.tripApprovalImage}
            resizeMode="cover"
          />
          <View style={[
            styles.statusBadgeLarge,
            { backgroundColor: trip.status === 'approved' ? '#2ecc71' : trip.status === 'rejected' ? '#e74c3c' : '#f1c40f' }
          ]}>
            <Text style={styles.statusTextLarge}>{trip.status}</Text>
          </View>
        </View>

        <View style={styles.tripApprovalDetails}>
          <Text style={styles.tripApprovalName}>{trip.title}</Text>
          <Text style={styles.tripApprovalLocation}>{trip.location}</Text>
          
          <View style={styles.tripApprovalDate}>
            <Icon name="date-range" size={20} color="#666" />
            <Text style={styles.tripApprovalDateText}>
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </Text>
          </View>
          
          <Text style={styles.tripApprovalPrice}>Rs{trip.price}</Text>
          
          <Text style={styles.tripApprovalSectionTitle}>Itinerary</Text>
          {itinerary.map((item, index) => (
            <View key={index} style={styles.itineraryItem}>
              <Icon name="schedule" size={20} color="#3498db" />
              <Text style={styles.itineraryText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// TripApproval Screen Component (only for admins)
export const TripApproval = ({ route, navigation }) => {
  const { trip, from } = route.params;
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log('TripApproval mounted with trip:', trip._id);
    console.log('Navigated from:', from || 'unknown');
  }, []);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const adminStatus = await AsyncStorage.getItem('isAdmin');
        setIsAdmin(adminStatus === 'true');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, []);

  // Handle going back
  const handleGoBack = () => {
    // Use simple goBack for more reliable navigation
    navigation.goBack();
  };

  // Handle approve action
  const handleApprove = async () => {
    try {
      setApproving(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await axios.patch(`${API_URL}/trips/${trip._id}/status`, 
        { status: 'approved' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.message) {
        Alert.alert('Success', 'Trip approved successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error approving trip:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve trip');
    } finally {
      setApproving(false);
    }
  };

  // Handle reject action
  const handleReject = async () => {
    try {
      setRejecting(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await axios.patch(`${API_URL}/trips/${trip._id}/status`, 
        { status: 'rejected' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.message) {
        Alert.alert('Success', 'Trip rejected.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error rejecting trip:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject trip');
    } finally {
      setRejecting(false);
    }
  };

  const formatItinerary = (description) => {
    // Simple logic to format description as itinerary
    if (!description) return [];
    
    // Split by newlines or periods as a simple approach
    const items = description.split(/\.\s|\n/).filter(item => item.trim().length > 0);
    
    // For demo purposes, prefix each item with "Day X: " if not already
    return items.map((item, index) => {
      if (item.startsWith('Day')) return item;
      return `Day ${index + 1}: ${item}`;
    });
  };

  const itinerary = formatItinerary(trip.description);

  // If not admin, redirect to trip details
  if (!isAdmin) {
    return <TripDetails route={route} navigation={navigation} />;
  }

  return (
    <View style={styles.tripApprovalContainer}>
      <View style={styles.tripApprovalHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.tripApprovalTitle}>Trip Approval</Text>
        <Text style={styles.tripApprovalPageNum}>1/2</Text>
      </View>

      <ScrollView style={styles.tripApprovalContent}>
        <View style={styles.tripApprovalImageContainer}>
          <Image 
            source={{ uri: trip.tripImageUrl || 'https://via.placeholder.com/400x200' }}
            style={styles.tripApprovalImage}
            resizeMode="cover"
          />
          <View style={[
            styles.statusBadgeLarge,
            { backgroundColor: trip.status === 'approved' ? '#2ecc71' : trip.status === 'rejected' ? '#e74c3c' : '#f1c40f' }
          ]}>
            <Text style={styles.statusTextLarge}>{trip.status}</Text>
          </View>
        </View>

        <View style={styles.tripApprovalDetails}>
          <Text style={styles.tripApprovalName}>{trip.title}</Text>
          <Text style={styles.tripApprovalLocation}>{trip.location}</Text>
          
          <View style={styles.tripApprovalDate}>
            <Icon name="date-range" size={20} color="#666" />
            <Text style={styles.tripApprovalDateText}>
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </Text>
          </View>
          
          <Text style={styles.tripApprovalPrice}>Rs{trip.price}</Text>
          
          <Text style={styles.tripApprovalSectionTitle}>Itinerary</Text>
          {itinerary.map((item, index) => (
            <View key={index} style={styles.itineraryItem}>
              <Icon name="schedule" size={20} color="#3498db" />
              <Text style={styles.itineraryText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.tripApprovalButtons}>
        <TouchableOpacity 
          style={[styles.tripApprovalButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={rejecting || approving || trip.status === 'rejected'}
        >
          {rejecting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.tripApprovalButtonText}>Reject</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tripApprovalButton, styles.approveButton]}
          onPress={handleApprove}
          disabled={rejecting || approving || trip.status === 'approved'}
        >
          {approving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.tripApprovalButtonText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // TripApproval Screen Styles
  tripApprovalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tripApprovalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tripApprovalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tripApprovalPageNum: {
    fontSize: 14,
    color: '#888',
  },
  tripApprovalContent: {
    flex: 1,
  },
  tripApprovalImageContainer: {
    position: 'relative',
  },
  tripApprovalImage: {
    width: '100%',
    height: 250,
  },
  statusBadgeLarge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  tripApprovalDetails: {
    padding: 16,
  },
  tripApprovalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tripApprovalLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  tripApprovalDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripApprovalDateText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tripApprovalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 20,
  },
  tripApprovalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  itineraryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itineraryText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    flex: 1,
  },
  tripApprovalButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tripApprovalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    marginRight: 8,
  },
  approveButton: {
    backgroundColor: '#2ecc71',
    marginLeft: 8,
  },
  tripApprovalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
});

export default { TripApproval, TripDetails }; 