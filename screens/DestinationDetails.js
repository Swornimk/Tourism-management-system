import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Share,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const DestinationDetails = ({ route, navigation }) => {
  const { destination } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatItinerary = (description) => {
    if (!description) return [];
    
    // Split by newlines or periods as a simple approach
    const items = description.split(/\.\s|\n/).filter(item => item.trim().length > 0);
    
    // For demo purposes, prefix each item with "Day X: " if not already
    return items.map((item, index) => {
      if (item.startsWith('Day')) return item;
      return `Day ${index + 1}: ${item}`;
    });
  };

  const itinerary = formatItinerary(destination.description);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing destination: ${destination.title} in ${destination.location}!`,
        title: `${destination.title} Travel Package`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share this destination');
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement saving favorites to AsyncStorage or backend
  };

  const handleBookNow = () => {
    // Navigate to booking screen or show booking form
    Alert.alert(
      'Booking Confirmation',
      `Would you like to book the ${destination.title} package?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          onPress: () => Alert.alert('Success', 'Booking information has been sent to your email!') 
        },
      ]
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.descriptionText}>{destination.description}</Text>
            
            <View style={styles.highlightsContainer}>
              <Text style={styles.highlightsTitle}>Package Highlights</Text>
              <View style={styles.highlightsGrid}>
                <View style={styles.highlightItem}>
                  <Icon name="hotel" size={24} color="#3498db" />
                  <Text style={styles.highlightText}>Premium Stay</Text>
                </View>
                <View style={styles.highlightItem}>
                  <Icon name="directions-car" size={24} color="#3498db" />
                  <Text style={styles.highlightText}>Transportation</Text>
                </View>
                <View style={styles.highlightItem}>
                  <Icon name="restaurant" size={24} color="#3498db" />
                  <Text style={styles.highlightText}>Meals Included</Text>
                </View>
                <View style={styles.highlightItem}>
                  <Icon name="photo-camera" size={24} color="#3498db" />
                  <Text style={styles.highlightText}>Sightseeing</Text>
                </View>
              </View>
            </View>
          </View>
        );
      
      case 'itinerary':
        return (
          <View style={styles.tabContent}>
            {itinerary.length > 0 ? (
              itinerary.map((item, index) => (
                <View key={index} style={styles.itineraryItem}>
                  <View style={styles.itineraryDay}>
                    <Text style={styles.itineraryDayText}>Day {index + 1}</Text>
                  </View>
                  <View style={styles.itineraryContent}>
                    <Text style={styles.itineraryText}>{item.replace(/^Day \d+:\s*/i, '')}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noContentText}>No itinerary information available</Text>
            )}
          </View>
        );
      
      case 'location':
        return (
          <View style={styles.tabContent}>
            <View style={styles.locationInfoContainer}>
              <Icon name="place" size={24} color="#3498db" />
              <Text style={styles.locationInfoText}>{destination.location}</Text>
            </View>
            
            <View style={styles.mapPlaceholder}>
              <Icon name="map" size={80} color="#ccc" />
              <Text style={styles.mapPlaceholderText}>Map View</Text>
            </View>
            
            <View style={styles.weatherContainer}>
              <Text style={styles.weatherTitle}>Weather Information</Text>
              <View style={styles.weatherInfo}>
                <Icon name="wb-sunny" size={24} color="#f39c12" />
                <Text style={styles.weatherText}>Average 25°C during this season</Text>
              </View>
            </View>
          </View>
        );
      
      case 'reviews':
        return (
          <View style={styles.tabContent}>
            <View style={styles.ratingOverview}>
              <View style={styles.ratingCircle}>
                <Text style={styles.ratingValue}>{destination.rating}</Text>
                <Text style={styles.ratingLabel}>Rating</Text>
              </View>
              <View style={styles.ratingBars}>
                <Text style={styles.ratingBarLabel}>Based on {destination.reviews} reviews</Text>
              </View>
            </View>
            
            {/* Sample Reviews */}
            <View style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewUser}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>J</Text>
                  </View>
                  <View>
                    <Text style={styles.reviewName}>John D.</Text>
                    <Text style={styles.reviewDate}>Visited in June 2023</Text>
                  </View>
                </View>
                <View style={styles.reviewRating}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.reviewRatingText}>4.9</Text>
                </View>
              </View>
              <Text style={styles.reviewText}>
                Amazing experience! The location was beautiful and the service was excellent.
                Would definitely recommend to others.
              </Text>
            </View>
            
            <View style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewUser}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>S</Text>
                  </View>
                  <View>
                    <Text style={styles.reviewName}>Sarah M.</Text>
                    <Text style={styles.reviewDate}>Visited in April 2023</Text>
                  </View>
                </View>
                <View style={styles.reviewRating}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.reviewRatingText}>4.7</Text>
                </View>
              </View>
              <Text style={styles.reviewText}>
                Great value for money. The trip was well organized and we had a wonderful time exploring!
              </Text>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Header Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={destination.image} 
          style={styles.headerImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        />
        
        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerRightControls}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleShare}
            >
              <Icon name="share" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={toggleFavorite}
            >
              <Icon 
                name={isFavorite ? "favorite" : "favorite-border"} 
                size={24} 
                color={isFavorite ? "#ff6b6b" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{destination.title}</Text>
          <View style={styles.locationRow}>
            <Icon name="place" size={18} color="#fff" />
            <Text style={styles.locationText}>{destination.location}</Text>
          </View>
          
          <View style={styles.ratingRow}>
            <Icon name="star" size={18} color="#FFD700" />
            <Text style={styles.ratingText}>{destination.rating}</Text>
            <Text style={styles.reviewsText}>({destination.reviews} reviews)</Text>
          </View>
        </View>
      </View>
      
      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Price and Date Section */}
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>Rs. {destination.price}</Text>
            <Text style={styles.priceUnit}>per person</Text>
          </View>
          
          <View>
            <Text style={styles.dateLabel}>Travel Dates</Text>
            <Text style={styles.dateValue}>
              {formatDate(destination.startDate)} - {formatDate(destination.endDate)}
            </Text>
          </View>
        </View>
        
        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'itinerary' && styles.activeTab]}
            onPress={() => setActiveTab('itinerary')}
          >
            <Text style={[styles.tabText, activeTab === 'itinerary' && styles.activeTabText]}>Itinerary</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'location' && styles.activeTab]}
            onPress={() => setActiveTab('location')}
          >
            <Text style={[styles.tabText, activeTab === 'location' && styles.activeTabText]}>Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tab Content */}
        <ScrollView style={styles.scrollContent}>
          {renderTabContent()}
        </ScrollView>
      </View>
      
      {/* Book Now Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleBookNow}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  headerControls: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerRightControls: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  reviewsText: {
    color: '#ddd',
    fontSize: 14,
    marginLeft: 5,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceLabel: {
    fontSize: 14,
    color: '#999',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  priceUnit: {
    fontSize: 12,
    color: '#999',
  },
  dateLabel: {
    fontSize: 14,
    color: '#999',
    textAlign: 'right',
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  tabContent: {
    paddingTop: 20,
    paddingBottom: 80,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 20,
  },
  highlightsContainer: {
    marginTop: 10,
  },
  highlightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  highlightItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f8fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  highlightText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },
  itineraryItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  itineraryDay: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itineraryDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itineraryContent: {
    flex: 1,
    backgroundColor: '#f5f8fa',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
  },
  itineraryText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  locationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationInfoText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 10,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#f5f8fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  weatherContainer: {
    backgroundColor: '#f5f8fa',
    borderRadius: 10,
    padding: 15,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  ratingOverview: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  ratingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#fff',
  },
  ratingBars: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingBarLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  reviewItem: {
    backgroundColor: '#f5f8fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    marginLeft: 5,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  noContentText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  bookButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DestinationDetails; 