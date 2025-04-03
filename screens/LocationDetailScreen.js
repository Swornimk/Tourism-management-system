import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LocationDetailScreen = () => {
  // Sample static data - replace with your actual data
  const locationData = {
    id: '1',
    title: 'Main Destination',
    location: 'Location',
    description: 'Itenary',
    price: 20000,
    rating: 4.8,
    reviews: 124,
    images: [
      require('./../assets/img/Img.jpg'),
      require('./../assets/img/Img2.jpg'),
      require('./../assets/img/img3.jpg')
    ],
    startDate: '2023-06-15',
    endDate: '2023-06-22'
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <Image 
            source={locationData.images[currentImageIndex]} 
            style={styles.mainImage}
            resizeMode="cover"
          />
          <View style={styles.imageIndicatorContainer}>
            {locationData.images.map((_, index) => (
              <View 
                key={index}
                style={[
                  styles.imageIndicator,
                  index === currentImageIndex && styles.activeIndicator
                ]}
              />
            ))}
          </View>
        </View>

        {/* Location Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{locationData.title}</Text>
          
          <View style={styles.locationRow}>
            <Icon name="location-on" size={18} color="#666" />
            <Text style={styles.locationText}>{locationData.location}</Text>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{locationData.rating}</Text>
              <Text style={styles.reviewsText}>({locationData.reviews} reviews)</Text>
            </View>
            <Text style={styles.priceText}>RS{locationData.price} /Per Person</Text>
          </View>

          {/* Date Section */}
          <View style={styles.dateSection}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <View style={styles.dateValueContainer}>
                <Icon name="calendar-today" size={18} color="#666" />
                <Text style={styles.dateValue}>{formatDate(locationData.startDate)}</Text>
              </View>
            </View>
            
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>End Date</Text>
              <View style={styles.dateValueContainer}>
                <Icon name="calendar-today" size={18} color="#666" />
                <Text style={styles.dateValue}>{formatDate(locationData.endDate)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.description}>{locationData.description}</Text>
        </View>
      </ScrollView>

      {/* Booking Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 15,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 12,
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 5,
    marginRight: 10,
  },
  reviewsText: {
    fontSize: 14,
    color: '#888',
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  dateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateItem: {
    width: '48%',
  },
  dateLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  dateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  bookButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LocationDetailScreen;