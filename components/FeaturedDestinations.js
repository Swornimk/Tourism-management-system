import React, { useState, useEffect, useCallback } from 'react';
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
import { useTrips } from '../contexts/TripContext';
import socketService from '../config/socketService';

const API_URL = 'https://tourism-tfph.onrender.com';

const FeaturedDestinations = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [approvedTrips, setApprovedTrips] = useState([]);
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
      
      // Randomize the order of trips
      const shuffled = [...approved].sort(() => 0.5 - Math.random());
      
      setApprovedTrips(shuffled);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error processing trips data:', err);
      setError('Failed to process destinations');
      setLoading(false);
    }
  }, [allTrips]);

  // Fetch trips when component mounts or lastUpdated changes
  useEffect(() => {
    if (allTrips && allTrips.length > 0) {
      processTripData();
    } else if (!tripsContextLoading) {
      // Only fetch if we're not already loading
      fetchApprovedTrips();
    }
  }, [lastUpdated, processTripData, allTrips, tripsContextLoading]);
  
  // Set up WebSocket listener for real-time trip approval updates
  useEffect(() => {
    const setupTripApprovalListener = async () => {
      try {
        // Subscribe to global trip approval events 
        await socketService.initSocket();
        await socketService.joinTripRoom('trip:approvals');
        
        // Set up listener for trip approval events
        socketService.socket?.on('tripApproved', (data) => {
          console.log('Real-time trip approval received in FeaturedDestinations:', data);
          
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
            
            // Add this trip to our list if it's not already there
            setApprovedTrips(prevTrips => {
              // Check if trip already exists
              const exists = prevTrips.some(trip => trip._id === newTrip._id);
              if (exists) {
                // Update the existing trip if necessary
                return prevTrips.map(trip => 
                  trip._id === newTrip._id ? { ...trip, ...newTrip } : trip
                );
              } else {
                // Add the new trip to the beginning so it's visible first
                console.log('Adding new approved trip to featured list:', newTrip.title);
                return [newTrip, ...prevTrips];
              }
            });
          }
        });

        // Also listen for globalTripStatusUpdate events which are broadcast to all connected clients
        socketService.socket?.on('globalTripStatusUpdate', (data) => {
          console.log('Global trip status update received in FeaturedDestinations:', data);
          if (data && data.status === 'approved') {
            // Fetch all trips to ensure we have the latest data
            fetchAllTrips();
          }
        });
      } catch (error) {
        console.error('Error setting up trip approval listener:', error);
      }
    };
    
    setupTripApprovalListener();
    
    // Clean up the listener when component unmounts
    return () => {
      const cleanupListener = async () => {
        try {
          await socketService.leaveTripRoom('trip:approvals');
          socketService.socket?.off('tripApproved');
          socketService.socket?.off('globalTripStatusUpdate');
        } catch (error) {
          console.error('Error cleaning up trip approval listener:', error);
        }
      };
      
      cleanupListener();
    };
  }, [fetchAllTrips]);

  const fetchApprovedTrips = async () => {
    try {
      setLoading(true);
      // Use the context fetchAllTrips function
      await fetchAllTrips();
    } catch (err) {
      console.error('Error fetching approved trips:', err);
      setError('Failed to load destinations');
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
          <Icon name="explore" size={60} color="#3498db" />
        </View>
        <Text style={styles.emptyText}>No Trips Available Yet</Text>
        <Text style={styles.emptySubText}>
          Be the first to add a destination and start your hosting journey!
        </Text>
        <TouchableOpacity 
          style={styles.createTripButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.createTripButtonText}>Create a Trip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (approvedTrips.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="travel-explore" size={60} color="#3498db" />
        </View>
        <Text style={styles.emptyText}>No Featured Destinations Yet</Text>
        <Text style={styles.emptySubText}>
          Our team is reviewing new destinations. Check back soon for exciting places to visit!
        </Text>
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
    alignItems: 'center',
  },
  createTripButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FeaturedDestinations; 