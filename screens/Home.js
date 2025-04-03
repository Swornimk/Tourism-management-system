import React, { useState, useEffect } from 'react';
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
  TextInput,
  ActivityIndicator,
  Platform
} from "react-native";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://10.0.2.2:8000';

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

// Enhanced Profile Screen Component
const Profile = ({ navigation }) => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [profileImageKey, setProfileImageKey] = useState(Date.now());
  const [tripFormVisible, setTripFormVisible] = useState(false);
  const [tripData, setTripData] = useState({
    title: '',
    location: '',
    description: '',
    price: '',
    startDate: '',
    endDate: ''
  });
  const [userTrips, setUserTrips] = useState([]);
  const [userData, setUserData] = useState({
    userName: '',
    email: '',
    bio: '',
    profilePicture: null,
    profileImageData: null
  });

  // Request camera permissions and get token
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          navigation.navigate('Login');
          return;
        }
        setAuthToken(token);

        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Sorry, we need camera roll permissions to update your profile picture!');
          }
        }

        await fetchUserData();
        await fetchUserTrips();
      } catch (error) {
        console.error('Error in initialization:', error);
        setLoading(false);
      }
    })();
  }, []);

  // Fetch user trips
  const fetchUserTrips = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await axios.get(`${API_URL}/trips/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setUserTrips(response.data);
    } catch (error) {
      console.error('Error fetching user trips:', error);
      Alert.alert('Error', 'Failed to load trips');
    }
  };

  // Handle trip submission
  const handleTripSubmit = async () => {
    try {
      setUpdating(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await axios.post(`${API_URL}/trips`, tripData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Trip creation response:', response.data);

      // Check if the trip was created successfully
      if (response.data.message === "Trip created successfully") {
        // Create a new trip object with the response data
        const newTrip = {
          _id: response.data.tripId,
          ...tripData,
          status: 'pending',
          userId: token // Add any other default fields needed
        };
        
        // Add the new trip to the userTrips state
        setUserTrips(prevTrips => [...prevTrips, newTrip]);
        
        // Close the trip form and reset form data
        setTripFormVisible(false);
        setTripData({
          title: '',
          location: '',
          description: '',
          price: '',
          startDate: '',
          endDate: ''
        });
        
        Alert.alert('Success', 'Trip created successfully! Waiting for admin approval.');
      } else {
        throw new Error('Failed to create trip');
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create trip');
    } finally {
      setUpdating(false);
    }
  };

  // Fetch user data from API
  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      console.log('Fetching user data...');
      const response = await axios.get(`${API_URL}/getuser`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('User data response:', response.data);

      if (response.data && response.data[0]) {
        const user = response.data[0];
        console.log('Profile image data exists:', !!user.profileImageData);
        
        setUserData({
          userName: user.userName || '',
          email: user.email || '',
          bio: user.bio || 'No bio added yet.',
          profilePicture: user.profilePicture,
          profileImageData: user.profileImageData
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('accessToken');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', 'Failed to load user data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (newName, newEmail, newBio, imageUri) => {
    try {
      setUpdating(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const formData = new FormData();

      // Add text fields if provided
      if (newName) formData.append('userName', newName);
      if (newEmail) formData.append('email', newEmail);
      if (newBio) formData.append('bio', newBio);

      // Add image if provided
      if (imageUri) {
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('profilePicture', {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      const response = await axios.put(`${API_URL}/profile/update`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.message) {
        // Immediately fetch updated user data after successful update
        const userResponse = await axios.get(`${API_URL}/getuser`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (userResponse.data && userResponse.data[0]) {
          const updatedUser = userResponse.data[0];
          setUserData({
            userName: updatedUser.userName || '',
            email: updatedUser.email || '',
            bio: updatedUser.bio || 'No bio added yet.',
            profilePicture: updatedUser.profilePicture,
            profileImageData: updatedUser.profileImageData
          });

          if (imageUri) {
            Alert.alert('Success', 'Profile picture updated successfully!');
          } else {
    Alert.alert('Success', 'Profile updated successfully!');
            setEditMode(false);
          }
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('accessToken');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  // Handle image loading error
  const handleImageError = () => {
    console.error('Error loading profile image');
    setUserData(prev => ({
      ...prev,
      profileImageData: null
    }));
  };

  // Handle image selection
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        // Handle the selected image
        const selectedAsset = result.assets[0];
        await handleProfileUpdate(null, null, null, selectedAsset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Handle save button press
  const handleSave = async () => {
    await handleProfileUpdate(
      userData.userName,
      userData.email,
      userData.bio
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored tokens and user data
              await AsyncStorage.multiRemove([
                'accessToken',
                'refreshToken',
                'isAdmin'
              ]);
              
              // Navigate to Login screen with reset to prevent going back
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        }
      ]
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
            key={profileImageKey}
            source={
              userData.profileImageData 
                ? { uri: `data:image/jpeg;base64,${userData.profileImageData}` }
                : require('./../assets/img/default-avatar.jpg')
            }
            style={styles.avatar}
          />
          {editMode && (
            <TouchableOpacity 
              style={styles.editPhotoButton}
              onPress={pickImage}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
            <Icon name="edit" size={18} color="#fff" />
              )}
          </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.profileName}>{userData.userName}</Text>
        <Text style={styles.profileEmail}>{userData.email}</Text>
      </View>

      {/* Profile Content */}
      <View style={styles.profileContent}>
        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {editMode ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={userData.userName}
                  onChangeText={(text) => setUserData({...userData, userName: text})}
                  editable={!updating}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={userData.email}
                  onChangeText={(text) => setUserData({...userData, email: text})}
                  keyboardType="email-address"
                  editable={!updating}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  value={userData.bio}
                  onChangeText={(text) => setUserData({...userData, bio: text})}
                  multiline
                  editable={!updating}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoItem}>
                <Icon name="person" size={20} color="#555" />
                <Text style={styles.infoText}>{userData.userName}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="email" size={20} color="#555" />
                <Text style={styles.infoText}>{userData.email}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="info" size={20} color="#555" />
                <Text style={styles.infoText}>{userData.bio}</Text>
              </View>
            </>
          )}
        </View>

        {/* Hosted Trips Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Hosted Trips</Text>
            <TouchableOpacity 
              style={styles.addTripButton}
              onPress={() => setTripFormVisible(true)}
            >
              <Icon name="add" size={24} color="#3498db" />
            </TouchableOpacity>
          </View>

          {userTrips.length > 0 ? (
            userTrips.map((trip) => (
              <View key={trip._id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripTitle}>{trip.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: trip.status === 'approved' ? '#2ecc71' : trip.status === 'rejected' ? '#e74c3c' : '#f1c40f' }
                  ]}>
                    <Text style={styles.statusText}>{trip.status}</Text>
                  </View>
                </View>
                <View style={styles.tripDetails}>
                  <View style={styles.tripInfo}>
                    <Icon name="location-on" size={16} color="#666" />
                    <Text style={styles.tripInfoText}>{trip.location}</Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Icon name="date-range" size={16} color="#666" />
                    <Text style={styles.tripInfoText}>
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Icon name="attach-money" size={16} color="#666" />
                    <Text style={styles.tripInfoText}>Rs. {trip.price}</Text>
                  </View>
                </View>
                <Text style={styles.tripDescription}>{trip.description}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noTripsText}>No trips hosted yet</Text>
          )}
        </View>

        {/* Trip Form Modal */}
        {tripFormVisible && (
          <View style={styles.tripFormContainer}>
            <View style={styles.tripFormHeader}>
              <Text style={styles.tripFormTitle}>Create New Trip</Text>
              <TouchableOpacity 
                onPress={() => setTripFormVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={tripData.title}
                onChangeText={(text) => setTripData({...tripData, title: text})}
                placeholder="Enter trip title"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={tripData.location}
                onChangeText={(text) => setTripData({...tripData, location: text})}
                placeholder="Enter location"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 100 }]}
                value={tripData.description}
                onChangeText={(text) => setTripData({...tripData, description: text})}
                placeholder="Enter trip description"
                multiline
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Price (Rs.)</Text>
              <TextInput
                style={styles.input}
                value={tripData.price}
                onChangeText={(text) => setTripData({...tripData, price: text})}
                placeholder="Enter price"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.dateContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  value={tripData.startDate}
                  onChangeText={(text) => setTripData({...tripData, startDate: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.dateInput}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  style={styles.input}
                  value={tripData.endDate}
                  onChangeText={(text) => setTripData({...tripData, endDate: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, updating && styles.disabledButton]}
              onPress={handleTripSubmit}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Trip</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {editMode ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditMode(false)}
                disabled={updating}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.editButton]}
                onPress={() => setEditMode(true)}
              >
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={styles.buttonText}>Log Out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

// Location Screen Component
const Location = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <StatusBar style="light" />
    <InnerContainer>
      <WelcomeImage resizeMode="cover" source={require('./../assets/img/Img2.jpg')} />

      <WelcomeContainer>
        <PageTitle welcome={true}>Welcome! Traveller</PageTitle>
        <SubTitle welcome={true}>Swornim KC</SubTitle>
        <SubTitle welcome={true}>swornimkc@gmail.com</SubTitle>

        <StyledFormArea>
          <Avatar resizeMode="cover" source={require('./../assets/img/logo.jpg')} />
          <Line />
          <StyledButton onPress={() => {navigation.navigate('Login')}}>
            <ButtonText>Logout</ButtonText>
          </StyledButton>
        </StyledFormArea>
      </WelcomeContainer>
    </InnerContainer>
  </View>
);

// Settings Screen Component
const Setting = ({ navigation }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored tokens and user data
              await AsyncStorage.multiRemove([
                'accessToken',
                'refreshToken',
                'isAdmin'
              ]);
              
              // Navigate to Login screen with reset to prevent going back
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        }
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
const HomeNavigator = ({ navigation }) => {
  useEffect(() => {
    // Check if the user is an admin and redirect if needed
    const checkAdminStatus = async () => {
      try {
        const isAdmin = await AsyncStorage.getItem('isAdmin');
        if (isAdmin === 'true') {
          // If user is admin, redirect to admin dashboard
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminDashboard' }],
          });
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, [navigation]);

  return (
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
  );
};

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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },

  // Trip related styles
  addTripButton: {
    padding: 5,
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
  tripDetails: {
    marginBottom: 10,
  },
  tripInfo: {
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
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  noTripsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  tripFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  tripFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tripFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    width: '48%',
  },
  submitButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeNavigator;