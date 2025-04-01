import React, { useState } from 'react';
import { 
  StatusBar,
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Linking,
  TextInput
} from "react-native";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Destination } from "../config/data";
import {
  Avatar,
  WelcomeImage,
  PageTitle,
  SubTitle,
  StyledFormArea,
  StyledButton,
  InnerContainer,
  WelcomeContainer,
  ButtonText,
  Line,
  Colors,
} from '../components/styles';

// Home Screen Component
const Home = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Popular', 'Adventure', 'Beach', 'Mountain'];
  const featuredDestinations = Destination.slice(0, 3);
  const recommendedDestinations = Destination.slice(3, 6);

  return (
    <ScrollView style={styles.homeContainer}>
      <StatusBar style="dark" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello, Swornim!</Text>
          <Text style={styles.subGreeting}>Where do you want to explore today?</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image 
            source={require('./../assets/img/logo.jpg')} 
            style={styles.profileIcon}
          />
        </TouchableOpacity>
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

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              activeCategory === category && styles.activeCategoryButton
            ]}
            onPress={() => setActiveCategory(category)}
          >
            <Text 
              style={[
                styles.categoryText,
                activeCategory === category && styles.activeCategoryText
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured Destinations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Destinations</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredDestinations.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.featuredCard}
              onPress={() => navigation.navigate('Destination', { destination: item })}
            >
              <Image source={item.image} style={styles.featuredImage} />
              <View style={styles.featuredDetails}>
                <Text style={styles.featuredTitle}>{item.title}</Text>
                <View style={styles.locationContainer}>
                  <Icon name="location-on" size={16} color="#888" />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
                <Text style={styles.featuredPrice}>${item.price}/night</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recommended For You */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended For You</Text>
        {recommendedDestinations.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.recommendedCard}
            onPress={() => navigation.navigate('Destination', { destination: item })}
          >
            <Image source={item.image} style={styles.recommendedImage} />
            <View style={styles.recommendedDetails}>
              <Text style={styles.recommendedTitle}>{item.title}</Text>
              <View style={styles.locationContainer}>
                <Icon name="location-on" size={16} color="#888" />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating}</Text>
                <Text style={styles.reviewsText}>({item.reviews} reviews)</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.actionIcon, { backgroundColor: '#FF6B6B' }]}>
            <Icon name="flight" size={24} color="#fff" />
          </View>
          <Text style={styles.actionText}>Flights</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.actionIcon, { backgroundColor: '#4ECDC4' }]}>
            <Icon name="hotel" size={24} color="#fff" />
          </View>
          <Text style={styles.actionText}>Hotels</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.actionIcon, { backgroundColor: '#45B7D1' }]}>
            <Icon name="restaurant" size={24} color="#fff" />
          </View>
          <Text style={styles.actionText}>Restaurants</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.actionIcon, { backgroundColor: '#A78BFA' }]}>
            <Icon name="local-activity" size={24} color="#fff" />
          </View>
          <Text style={styles.actionText}>Activities</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Updated Profile Screen Component with Add Trip functionality
const Profile = ({ navigation }) => {
  const [editMode, setEditMode] = useState(false);
  const [tripFormVisible, setTripFormVisible] = useState(false);
  const [tripData, setTripData] = useState({
    title: '',
    location: '',
    description: '',
    price: '',
    startDate: '',
    endDate: ''
  });

  const [userData, setUserData] = useState({
    name: 'Swornim KC',
    email: 'swornimkc@gmail.com',
    phone: '+977 9841234567',
    bio: 'Travel enthusiast and adventure seeker',
    hostedTrips: [
      { id: '1', title: 'Bali Adventure', location: 'Bali, Indonesia', date: '15-20 June 2023' },
      { id: '2', title: 'Himalayan Trek', location: 'Nepal', date: '1-10 October 2023' }
    ]
  });

  const handleSave = () => {
    setEditMode(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleTripSubmit = () => {
    // In a real app, you would save this to your backend
    const newTrip = {
      id: Date.now().toString(),
      title: tripData.title,
      location: tripData.location,
      date: `${tripData.startDate} to ${tripData.endDate}`
    };
    
    setUserData({
      ...userData,
      hostedTrips: [...userData.hostedTrips, newTrip]
    });
    
    setTripFormVisible(false);
    setTripData({
      title: '',
      location: '',
      description: '',
      price: '',
      startDate: '',
      endDate: ''
    });
    
    Alert.alert('Success', 'Trip created successfully!');
  };

  return (
    <ScrollView style={styles.profileContainer}>
      <StatusBar style="light" />
      
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.avatarContainer}>
          <Image 
            source={require('./../assets/img/class.jpg')} 
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editPhotoButton}>
            <Icon name="edit" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.profileName}>{userData.name}</Text>
        <Text style={styles.profileEmail}>{userData.email}</Text>
      </View>

      {/* Profile Content */}
      <View style={styles.profileContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {editMode ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={userData.name}
                  onChangeText={(text) => setUserData({...userData, name: text})}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={userData.email}
                  onChangeText={(text) => setUserData({...userData, email: text})}
                  keyboardType="email-address"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={userData.phone}
                  onChangeText={(text) => setUserData({...userData, phone: text})}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  value={userData.bio}
                  onChangeText={(text) => setUserData({...userData, bio: text})}
                  multiline
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoItem}>
                <Icon name="person" size={20} color="#555" />
                <Text style={styles.infoText}>{userData.name}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="email" size={20} color="#555" />
                <Text style={styles.infoText}>{userData.email}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="phone" size={20} color="#555" />
                <Text style={styles.infoText}>{userData.phone}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="info" size={20} color="#555" />
                <Text style={styles.infoText}>{userData.bio}</Text>
              </View>
            </>
          )}
        </View>
{/* Action Buttons */}
<View style={styles.buttonContainer}>
          {editMode ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditMode(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.editButton]}
              onPress={() => setEditMode(true)}
            >
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Hosted Trips Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Hosted Trips</Text>
            <TouchableOpacity onPress={() => setTripFormVisible(true)}>
              <Text style={styles.addTripText}>+ Add Trip</Text>
            </TouchableOpacity>
          </View>
          
          {userData.hostedTrips.length > 0 ? (
            <FlatList
              data={userData.hostedTrips}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.tripCard}>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle}>{item.title}</Text>
                    <View style={styles.tripMeta}>
                      <Icon name="location-on" size={14} color="#888" />
                      <Text style={styles.tripLocation}>{item.location}</Text>
                    </View>
                    <View style={styles.tripMeta}>
                      <Icon name="calendar-today" size={14} color="#888" />
                      <Text style={styles.tripDate}>{item.date}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.tripActionButton}>
                    <Text style={styles.tripActionText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            <Text style={styles.noTripsText}>You haven't hosted any trips yet</Text>
          )}
        </View>

        {/* Add Trip Form Modal */}
        {tripFormVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Host a New Trip</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Trip Title"
                value={tripData.title}
                onChangeText={(text) => setTripData({...tripData, title: text})}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Location"
                value={tripData.location}
                onChangeText={(text) => setTripData({...tripData, location: text})}
              />
              
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Description"
                value={tripData.description}
                onChangeText={(text) => setTripData({...tripData, description: text})}
                multiline
              />
              
              <TextInput
                style={styles.input}
                placeholder="Price per person"
                value={tripData.price}
                onChangeText={(text) => setTripData({...tripData, price: text})}
                keyboardType="numeric"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Start Date (DD/MM/YYYY)"
                value={tripData.startDate}
                onChangeText={(text) => setTripData({...tripData, startDate: text})}
              />
              
              <TextInput
                style={styles.input}
                placeholder="End Date (DD/MM/YYYY)"
                value={tripData.endDate}
                onChangeText={(text) => setTripData({...tripData, endDate: text})}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setTripFormVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleTripSubmit}
                >
                  <Text style={styles.modalButtonText}>Create Trip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        
      </View>
    </ScrollView>
  );
};

// Location Screen Component
const Location = ({ navigation }) => {
  // Sample data - replace with your actual data source
  const locationData = [
    { 
      id: '1', 
      title: 'Bali Resort', 
      location: 'Bali, Indonesia', 
      price: 120,
      rating: 4.8,
      image: require('./../assets/img/Img.jpg') 
    },
    { 
      id: '2', 
      title: 'Mountain Lodge', 
      location: 'Himalayas, Nepal', 
      price: 90,
      rating: 4.6,
      image: require('./../assets/img/Img2.jpg') 
    },
    // Add more locations as needed
  ];

  const renderLocationCard = ({ item }) => (
    <TouchableOpacity style={styles.locationCard}>
      <Image source={item.image} style={styles.locationImage} />
      <View style={styles.locationDetails}>
        <Text style={styles.locationTitle}>{item.title}</Text>
        <View style={styles.locationInfo}>
          <Icon name="location-on" size={14} color="#888" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
        <View style={styles.locationFooter}>
          <Text style={styles.locationPrice}>${item.price}/night</Text>
          <View style={styles.locationRating}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <InnerContainer>
        {/* Keep your welcome section */}
        <WelcomeContainer>
          <PageTitle welcome={true}>Explore Locations</PageTitle>
          <SubTitle welcome={true}>Find your next adventure</SubTitle>
        </WelcomeContainer>

        {/* 2-column grid of location cards */}
        <FlatList
          data={locationData}
          renderItem={renderLocationCard}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.locationGrid}
          columnWrapperStyle={styles.columnWrapper}
        />
      </InnerContainer>
    </View>
  );
};

// Settings Screen Component
const Setting = ({ navigation }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', onPress: () => navigation.navigate('Login') }
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://yourwebsite.com/privacy');
  };

  const openTerms = () => {
    Linking.openURL('https://yourwebsite.com/terms');
  };

  const openContact = () => {
    Linking.openURL('mailto:support@Traveller.com');
  };

  return (
    <ScrollView style={styles.settingsContainer}>
      {/* App Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>App Settings</Text>
        
        <View style={styles.settingsItem}>
          <Icon name="brightness-4" size={24} color="#555" />
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={darkMode ? "#f5dd4b" : "#f4f3f4"}
          />
        </View>

        <View style={styles.settingsItem}>
          <Icon name="notifications" size={24} color="#555" />
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Notifications</Text>
            <Text style={styles.settingsSubtitle}>Receive app notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
          />
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Account</Text>
        
        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person" size={24} color="#555" />
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Edit Profile</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Icon name="lock" size={24} color="#555" />
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Change Password</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Support</Text>
        
        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={openPrivacyPolicy}
        >
          <Icon name="privacy-tip" size={24} color="#555" />
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Privacy Policy</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={openTerms}
        >
          <Icon name="description" size={24} color="#555" />
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Terms of Service</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={openContact}
        >
          <Icon name="contact-support" size={24} color="#555" />
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Contact Support</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Logout Section */}
      <TouchableOpacity 
        style={[styles.settingsItem, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Icon name="logout" size={24} color="#e74c3c" />
        <View style={styles.settingsText}>
          <Text style={[styles.settingsTitle, { color: '#e74c3c' }]}>Log Out</Text>
        </View>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.versionText}>App Version 1.0.0</Text>
    </ScrollView>
  );
};

// Create Tab Navigator
const Tab = createBottomTabNavigator();

// Main App Component with Navigation
const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'Location') {
              iconName = focused ? 'location-on' : 'location-on';
            } else if (route.name === 'Setting') {
              iconName = focused ? 'settings' : 'settings';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Profile" component={Profile} />
        <Tab.Screen name="Location" component={Location} />
        <Tab.Screen name="Setting" component={Setting} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // Home Screen Styles
  homeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  activeCategoryButton: {
    backgroundColor: '#3498db',
  },
  categoryText: {
    color: '#888',
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#fff',
  },
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  locationGrid: {
    padding: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  locationCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 15,
  },
  locationImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  locationDetails: {
    padding: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 5,
  },
  locationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  locationRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginLeft: 3,
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 30,
  },
  quickAction: {
    alignItems: 'center',
    width: '23%',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },

  // Profile Screen Styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileHeader: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3498db',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  profileEmail: {
    fontSize: 16,
    color: '#f0f0f0',
    marginBottom: 10,
  },
  profileContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  tripInfo: {
    marginBottom: 10,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  tripLocation: {
    fontSize: 14,
    color: '#888',
    marginLeft: 5,
  },
  tripDate: {
    fontSize: 14,
    color: '#888',
    marginLeft: 5,
  },
  tripActionButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  tripActionText: {
    color: '#333',
    fontWeight: 'bold',
  },
  addTripText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  noTripsText: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#2ecc71',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  saveButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  logoutButton: {
    backgroundColor: '#f39c12',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Settings Screen Styles
  settingsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  settingsSection: {
    backgroundColor: 'white',
    marginBottom: 20,
    borderRadius: 10,
    marginHorizontal: 15,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  settingsSectionTitle: {
    padding: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingsText: {
    flex: 1,
    marginLeft: 15,
  },
  settingsTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingsSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
    fontSize: 12,
  },
});

export default App;