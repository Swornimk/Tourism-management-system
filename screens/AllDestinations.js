import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  ActivityIndicator,
  TextInput,
  Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';

const API_URL = 'https://tourism-tfph.onrender.com';
const { width } = Dimensions.get('window');

const AllDestinations = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDestinations();
  }, []);

  useEffect(() => {
    // Filter destinations based on search query
    if (destinations.length > 0) {
      const query = searchQuery.toLowerCase();
      const filtered = destinations.filter(
        destination => 
          destination.title.toLowerCase().includes(query) ||
          destination.location.toLowerCase().includes(query)
      );
      setFilteredDestinations(filtered);
    }
  }, [searchQuery, destinations]);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/trips/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Filter for approved trips only
      const approvedTrips = response.data.filter(trip => trip.status === 'approved');
      
      setDestinations(approvedTrips);
      setFilteredDestinations(approvedTrips);
      setError(null);
    } catch (err) {
      console.error('Error fetching destinations:', err);
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
      rating: "4.8", // Default rating
      reviews: "24", // Default reviews
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate
    }});
  };

  const renderDestinationItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.destinationCard}
        onPress={() => handleViewDestination(item)}
      >
        {item.tripImageUrl ? (
          <Image 
            source={{ uri: item.tripImageUrl }} 
            style={styles.destinationImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.destinationImage, styles.noImagePlaceholder]}>
            <Icon name="image" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.locationRow}>
            <Icon name="location-on" size={14} color="#888" />
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
          <Text style={styles.priceText}>Rs. {item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Destinations</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search destinations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#888"
        />
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredDestinations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-off" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No destinations match your search' : 'No destinations available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDestinations}
          renderItem={renderDestinationItem}
          keyExtractor={item => item._id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  destinationCard: {
    width: (width - 40) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  destinationImage: {
    width: '100%',
    height: 150,
  },
  noImagePlaceholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationInfo: {
    padding: 12,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
    flex: 1,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
  },
});

export default AllDestinations; 