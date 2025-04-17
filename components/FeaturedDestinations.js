import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_URL = 'http://10.0.2.2:8000';

const FeaturedDestinations = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [approvedTrips, setApprovedTrips] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApprovedTrips();
  }, []);

  const fetchApprovedTrips = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      // Fetch all trips and filter for approved ones
      const response = await axios.get(`${API_URL}/trips/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Filter for approved trips
      const approved = response.data.filter(trip => trip.status === 'approved');
      
      // Randomize the order of trips
      const shuffled = [...approved].sort(() => 0.5 - Math.random());
      
      setApprovedTrips(shuffled);
      setError(null);
    } catch (err) {
      console.error('Error fetching approved trips:', err);
      setError('Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDestination = (trip) => {
    navigation.navigate('Destination', { destination: {
      id: trip._id,
      title: trip.title,
      location: trip.location,
      image: { uri: trip.tripImageUrl },
      price: trip.price,
      rating: "4.8", // Default rating since it's not in the trip data
      reviews: "24", // Default reviews since it's not in the trip data
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate
    }});
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (approvedTrips.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No featured destinations available</Text>
      </View>
    );
  }

  // Take up to 5 trips for featured section
  const featuredTrips = approvedTrips.slice(0, 5);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Destinations</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AllDestinations')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {featuredTrips.map((trip) => (
          <TouchableOpacity 
            key={trip._id} 
            style={styles.featuredCard}
            onPress={() => handleViewDestination(trip)}
          >
            {trip.tripImageUrl ? (
              <Image 
                source={{ uri: trip.tripImageUrl }} 
                style={styles.featuredImage} 
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.featuredImage, styles.noImagePlaceholder]}>
                <Icon name="image" size={40} color="#ccc" />
              </View>
            )}
            <View style={styles.featuredDetails}>
              <Text style={styles.featuredTitle}>{trip.title}</Text>
              <View style={styles.locationContainer}>
                <Icon name="location-on" size={16} color="#888" />
                <Text style={styles.locationText}>{trip.location}</Text>
              </View>
              <Text style={styles.featuredPrice}>Rs. {trip.price}/night</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    color: '#3498db',
    fontSize: 14,
  },
  featuredCard: {
    width: 250,
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 15,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredImage: {
    width: '100%',
    height: 150,
  },
  noImagePlaceholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredDetails: {
    padding: 15,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 5,
  },
  featuredPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
  },
});

export default FeaturedDestinations; 