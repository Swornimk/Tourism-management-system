import React, { useState, useEffect, useCallback } from 'react';
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
import { useTrips } from '../contexts/TripContext';
import socketService from '../config/socketService';

const API_URL = 'https://tourism-management-system-wdu4.onrender.com';

const RecommendedDestinations = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [recommendedTrips, setRecommendedTrips] = useState([]);
  const [error, setError] = useState(null);
  
  // Use the TripContext
  const { 
    allTrips, 
    fetchAllTrips, 
    isLoading: tripsContextLoading,
    lastUpdated 
  } = useTrips();

  // Memoize the processTripData function to avoid recreating it on every render
  const processTripData = useCallback(() => {
    try {
      if (!allTrips) return;
      
      // Filter for approved trips
      const approved = allTrips.filter(trip => trip.status === 'approved');
      
      // Randomize the order of trips differently from featured
      const shuffled = [...approved].sort(() => 0.5 - Math.random());
      
      // Take a different subset than what might be shown in FeaturedDestinations
      setRecommendedTrips(shuffled.slice(0, 3));
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error processing trips data:', err);
      setError('Failed to process recommendations');
      setLoading(false);
    }
  }, [allTrips]);

  // Single useEffect for handling trips data
  useEffect(() => {
    if (allTrips && allTrips.length > 0) {
      processTripData();
    } else if (!tripsContextLoading) {
      // Only fetch if we're not already loading
      fetchRecommendedTrips();
    }
  }, [lastUpdated, processTripData, allTrips, tripsContextLoading]);
  
  // Add socket listener for real-time trip approvals
  useEffect(() => {
    const setupTripApprovalListener = async () => {
      try {
        // Initialize socket and join approval room
        await socketService.initSocket();
        await socketService.joinTripRoom('trip:approvals');
        
        // Listen for trip approval events
        socketService.socket?.on('tripApproved', (data) => {
          console.log('Real-time trip approval received in RecommendedDestinations:', data);
          
          if (data && data.tripId && data.title) {
            // Create a trip object from the socket data
            const newTrip = {
              _id: data.tripId,
              title: data.title,
              location: data.location || 'Unknown Location',
              price: data.price || '0',
              tripImageUrl: data.tripImageUrl,
              status: 'approved',
              updatedAt: data.updatedAt || new Date().toISOString()
            };
            
            // Update the recommended trips list
            setRecommendedTrips(prevTrips => {
              // Check if trip already exists
              const exists = prevTrips.some(trip => trip._id === newTrip._id);
              if (exists) {
                // Update existing trip
                return prevTrips.map(trip => 
                  trip._id === newTrip._id ? { ...trip, ...newTrip } : trip
                );
              } else {
                // Add new trip - but keep array size limited 
                const updatedTrips = [newTrip, ...prevTrips];
                // Keep only first 3 items to match original implementation
                return updatedTrips.slice(0, 3);
              }
            });
          }
        });
        
        // Also listen for global trip status updates
        socketService.socket?.on('globalTripStatusUpdate', (data) => {
          console.log('Global trip status update received in RecommendedDestinations:', data);
          if (data && data.status === 'approved') {
            // Fetch all trips to ensure we have the latest data
            fetchAllTrips();
          }
        });
      } catch (error) {
        console.error('Error setting up trip approval listener in RecommendedDestinations:', error);
      }
    };
    
    setupTripApprovalListener();
    
    // Clean up listeners when component unmounts
    return () => {
      const cleanupListener = async () => {
        try {
          await socketService.leaveTripRoom('trip:approvals');
          socketService.socket?.off('tripApproved');
          socketService.socket?.off('globalTripStatusUpdate');
        } catch (error) {
          console.error('Error cleaning up trip approval listener in RecommendedDestinations:', error);
        }
      };
      
      cleanupListener();
    };
  }, [fetchAllTrips]);

  const fetchRecommendedTrips = async () => {
    try {
      setLoading(true);
      // Use the context fetchAllTrips function
      await fetchAllTrips();
    } catch (err) {
      console.error('Error fetching recommended trips:', err);
      setError('Failed to load recommendations');
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

  if (loading || tripsContextLoading) {
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

  if (allTrips && allTrips.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="add-location" size={60} color="#3498db" />
        </View>
        <Text style={styles.emptyText}>No Trips Available Yet</Text>
        <Text style={styles.emptySubText}>
          No destinations have been added yet. Be among the first to add your favorite spot!
        </Text>
        <TouchableOpacity 
          style={styles.createTripButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.createTripButtonText}>Host a Destination</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (recommendedTrips.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="recommend" size={60} color="#3498db" />
        </View>
        <Text style={styles.emptyText}>No Recommendations Yet</Text>
        <Text style={styles.emptySubText}>
          We're working on curating the perfect recommendations for you. 
          Visit our featured destinations in the meantime!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Destinations</Text>
      
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
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 25,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  emptySubText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 5,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  createTripButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  createTripButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RecommendedDestinations; 