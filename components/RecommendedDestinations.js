
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_URL = 'http://10.0.2.2:8000';

const RecommendedDestinations = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [recommendedTrips, setRecommendedTrips] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecommendedTrips();
  }, []);

  const fetchRecommendedTrips = async () => {
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
      
      // Randomize the order of trips differently from featured
      const shuffled = [...approved].sort(() => 0.5 - Math.random());
      
      // Take a different subset than what might be shown in FeaturedDestinations
      setRecommendedTrips(shuffled.slice(0, 3));
      setError(null);
    } catch (err) {
      console.error('Error fetching recommended trips:', err);
      setError('Failed to load recommendations');
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

  if (recommendedTrips.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recommendations available</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Popular Trips</Text>
      
      {recommendedTrips.map((trip) => (
        <TouchableOpacity 
          key={trip._id} 
          style={styles.recommendedCard}
          onPress={() => handleViewDestination(trip)}
        >
          {trip.tripImageUrl ? (
            <Image 
              source={{ uri: trip.tripImageUrl }} 
              style={styles.recommendedImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.recommendedImage, styles.noImagePlaceholder]}>
              <Icon name="image" size={30} color="#ccc" />
            </View>
          )}
          
          <View style={styles.recommendedDetails}>
            <Text style={styles.recommendedTitle}>{trip.title}</Text>
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={16} color="#888" />
              <Text style={styles.locationText}>{trip.location}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.reviewsText}>(24 reviews)</Text>
            </View>
            <Text style={styles.recommendedPrice}>Rs. {trip.price}/night</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recommendedCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  recommendedImage: {
    width: 100,
    height: 100,
  },
  noImagePlaceholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedDetails: {
    flex: 1,
    padding: 12,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
  },
  reviewsText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 5,
  },
  recommendedPrice: {
    fontSize: 15,
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

export default RecommendedDestinations; 
