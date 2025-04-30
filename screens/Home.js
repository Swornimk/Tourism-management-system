import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Modal,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';
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
import notificationService from '../config/notificationService';
import { useTrips } from '../contexts/TripContext';
import socketService from '../config/socketService';
import * as Notifications from 'expo-notifications';

// Import the new components
import FeaturedDestinations from '../components/FeaturedDestinations';
import RecommendedDestinations from '../components/RecommendedDestinations';
import AllDestinations from './AllDestinations';
import DestinationDetails from './DestinationDetails';
import MyBookings from './MyBookings';
import DebugPanel from '../components/DebugPanel';

// Import DateTimePicker at the top with other imports
import DateTimePicker from '@react-native-community/datetimepicker';

// First, find the import section at the top of the file and add this import
import { useNotifications } from '../contexts/NotificationContext';

const API_URL = 'https://tourism-management-system-wdu4.onrender.com';

// Home Screen Component
const Home = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [userName, setUserName] = useState('Traveller');
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const { fetchAllTrips } = useTrips();
  // Get unreadCount from NotificationContext
  const { unreadCount, loadNotifications } = useNotifications();
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Fetch user name and notifications when component mounts
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const response = await axios.get(`${API_URL}/getuser`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.data && response.data[0]) {
            setUserName(response.data[0].userName);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserName();
    // Use loadNotifications from context instead of local function
    loadNotifications();
    
    // Set up notification listeners for real-time updates
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // Update the notification badge count
      loadNotifications();
      
      // Check if this is a trip approval/rejection notification
      const data = notification.request.content.data;
      if (data && (data.type === 'trip_approval' || data.type === 'trip_rejection')) {
        console.log('Trip status notification received:', data);
        // Refresh trips data 
        fetchAllTrips();
        setRefreshTrigger(Date.now());
        
        // Show an alert if in the foreground (optional)
        Alert.alert(
          notification.request.content.title,
          notification.request.content.body
        );
      }
    });

    // Handle notification response (when user taps the notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (data && data.type === 'trip_approval' || data.type === 'trip_rejection') {
        // Navigate to Profile/My Trips tab
        navigation.navigate('Profile');
      } else {
        // Default to notifications screen
        navigation.navigate('Notifications');
      }
    });
    
    // Clean up the listeners on component unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [loadNotifications]);

  // Also check notifications when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Use loadNotifications from context
      if (typeof loadNotifications === 'function') loadNotifications();
      // Trigger a refresh when returning to Home screen
      setRefreshTrigger(Date.now());
      // Also refresh all trips
      if (typeof fetchAllTrips === 'function') fetchAllTrips();
    });

    return unsubscribe;
  }, [navigation]); // Only depend on navigation
  
  // Set up global trip status listener for real-time updates
  useEffect(() => {
    const setupGlobalTripListener = async () => {
      try {
        // Initialize socket connection if not already done
        await socketService.initSocket();
        
        // Join the trip approvals room
        await socketService.joinTripRoom('trip:approvals');
        
        // Listen for trip approved events
        socketService.socket?.on('tripApproved', (data) => {
          console.log('Home screen received tripApproved event:', data);
          // Trigger a refresh of the home screen components
          setRefreshTrigger(Date.now());
          // Also refresh all trips in the context
          if (typeof fetchAllTrips === 'function') fetchAllTrips();
          // Check for unread notifications as this should have created one
          if (typeof loadNotifications === 'function') loadNotifications();
        });
        
        // Listen for trip rejection events
        socketService.socket?.on('tripRejected', (data) => {
          console.log('Home screen received tripRejected event:', data);
          // Check for unread notifications as this should have created one
          if (typeof loadNotifications === 'function') loadNotifications();
        });
        
        // Listen for global trip status updates
        socketService.socket?.on('globalTripStatusUpdate', (data) => {
          console.log('Home screen received globalTripStatusUpdate event:', data);
          if (data) {
            console.log('Trip status changed, refreshing home screen');
            // Trigger a refresh
            setRefreshTrigger(Date.now());
            // Refresh all trips in the context
            if (typeof fetchAllTrips === 'function') fetchAllTrips();
            // Check for new notifications
            if (typeof loadNotifications === 'function') loadNotifications();
            
            // Force a reload of child components via key change
            setTimeout(() => {
              console.log('Forcing refresh of FeaturedDestinations and RecommendedDestinations');
              setRefreshTrigger(Date.now()); // Set again after a short delay to ensure child components update
            }, 1000);
          }
        });
        
        // Listen for notification events
        socketService.socket?.on('notification', (data) => {
          console.log('Home screen received notification event:', data);
          // Check for unread notifications
          if (typeof loadNotifications === 'function') loadNotifications();
        });
      } catch (error) {
        console.error('Error setting up Home socket listener:', error);
      }
    };
    
    setupGlobalTripListener();
    
    // Cleanup function
    return () => {
      const cleanup = async () => {
        try {
          await socketService.leaveTripRoom('trip:approvals');
          socketService.socket?.off('tripApproved');
          socketService.socket?.off('tripRejected');
          socketService.socket?.off('globalTripStatusUpdate');
          socketService.socket?.off('notification');
        } catch (error) {
          console.error('Error cleaning up Home socket listener:', error);
        }
      };
      
      cleanup();
    };
  }, []); // Remove all dependencies to prevent infinite loop

  return (
    <ScrollView style={styles.homeContainer}>
      <StatusBar style="dark" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello, {userName}!</Text>
          <Text style={styles.headerSubtitle}>Where do you want to explore today?</Text>
        </View>
        <View style={styles.headerIcons}>
          {/* Debug button - long press to show debug panel */}
          <TouchableOpacity 
            style={styles.debugButton} 
            onLongPress={() => setDebugPanelVisible(true)}
          >
            <Ionicons name="bug-outline" size={22} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.notificationIcon} 
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={26} color="#333" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image 
              source={require('./../assets/img/logo.jpg')} 
              style={styles.profileIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Destinations - Using the new component */}
      <FeaturedDestinations navigation={navigation} key={`featured-${refreshTrigger}`} />

      {/* Recommended For You - Using the new component */}
      <RecommendedDestinations navigation={navigation} key={`recommended-${refreshTrigger}`} />
      
      {/* Debug Panel */}
      <DebugPanel 
        visible={debugPanelVisible} 
        onClose={() => setDebugPanelVisible(false)} 
      />
    </ScrollView>
  );
};

// TripDetails Screen Component for normal users
const TripDetails = ({ route, navigation }) => {
  const { trip } = route.params;

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
          onPress={() => navigation.goBack()}
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
const TripApproval = ({ route, navigation }) => {
  const { trip } = route.params;
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
        // Remove redundant notification code - server already handles this
        
        Alert.alert('Success', 'Trip approved successfully!');
        // Navigate back with refreshed status
        navigation.navigate('AdminTripManagement', { refresh: true });
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
        // Get the trip creator's ID from the trip object
        const creatorId = trip.createdBy;
        
        // Send a notification to the creator
        if (creatorId) {
          await notificationService.sendTripRejectionNotification(
            trip.title,
            creatorId,
            trip._id
          );
        }
        
        Alert.alert('Success', 'Trip rejected.');
        // Navigate back to the trip management screen
        navigation.navigate('AdminTripManagement', { refresh: true });
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
          onPress={() => navigation.goBack()}
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

// Update the TripCard component to properly handle status updates
const TripCard = ({ trip, navigation }) => {
  // Create local state for each trip to allow immediate UI updates
  const [tripStatus, setTripStatus] = useState(trip.status || 'pending');
  const [statusBgColor, setStatusBgColor] = useState(
    trip.status === 'approved' ? '#2ecc71' : 
    trip.status === 'rejected' ? '#e74c3c' : '#f1c40f'
  );
  
  // Add a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Set up trip-specific listener for real-time updates
  useEffect(() => {
    // Function to update UI based on status
    const updateStatusUI = (status) => {
      if (!isMounted.current) return;
      
      console.log(`Updating trip ${trip._id} UI with status: ${status}`);
      setTripStatus(status);
      setStatusBgColor(
        status === 'approved' ? '#2ecc71' : 
        status === 'rejected' ? '#e74c3c' : '#f1c40f'
      );
    };
    
    const setupTripListener = async () => {
      try {
        // Join room for this specific trip
        await socketService.joinTripRoom(`trip:${trip._id}`);
        
        // Listen for status updates for this specific trip
        const handleTripStatusUpdate = (data) => {
          if (data.tripId === trip._id) {
            console.log(`Trip ${trip._id} status updated to ${data.status}`);
            updateStatusUI(data.status);
          }
        };
        
        // Set up listeners for all status update events
        socketService.socket?.on('tripStatusUpdated', handleTripStatusUpdate);
        socketService.socket?.on('globalTripStatusUpdate', (data) => {
          if (data.tripId === trip._id) {
            console.log(`Global update for trip ${trip._id}: ${data.status}`);
            updateStatusUI(data.status);
          }
        });
        socketService.socket?.on('profileUpdate', (data) => {
          if (data.type === 'tripStatusChanged' && data.tripId === trip._id) {
            console.log(`Profile update for trip ${trip._id}: ${data.newStatus}`);
            updateStatusUI(data.newStatus);
          }
        });
        
        // Also register for notification events that might contain status updates
        socketService.socket?.on('notification', (data) => {
          if (data.data && 
             (data.data.type === 'trip_approval' || data.data.type === 'trip_rejection') && 
             data.data.tripId === trip._id) {
            console.log(`Notification update for trip ${trip._id}: ${data.data.status}`);
            updateStatusUI(data.data.status);
          }
        });
        
        // Set up specific trip status listener
        socketService.listenToTripStatusUpdates(trip._id, (updatedTripData) => {
          if (updatedTripData.tripId === trip._id) {
            console.log(`Direct status update for trip ${trip._id}: ${updatedTripData.status}`);
            updateStatusUI(updatedTripData.status);
          }
        });
        
        // Return cleanup function
        return () => {
          try {
            socketService.socket?.off('tripStatusUpdated', handleTripStatusUpdate);
            socketService.leaveTripRoom(`trip:${trip._id}`);
            socketService.stopListeningToTripStatusUpdates(trip._id);
          } catch (err) {
            console.error(`Error cleaning up listeners for trip ${trip._id}:`, err);
          }
        };
      } catch (error) {
        console.error(`Error setting up listener for trip ${trip._id}:`, error);
      }
    };
    
    setupTripListener();
    
    // Return cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [trip._id]); // Only re-run if trip ID changes
  
  // Watch for changes to trip.status from parent and update local state if needed
  useEffect(() => {
    if (trip.status !== tripStatus) {
      console.log(`Trip ${trip._id} status prop changed from ${tripStatus} to ${trip.status}`);
      setTripStatus(trip.status);
      setStatusBgColor(
        trip.status === 'approved' ? '#2ecc71' : 
        trip.status === 'rejected' ? '#e74c3c' : '#f1c40f'
      );
    }
  }, [trip.status]);
  
  return (
    <View key={trip._id} style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>{trip.title}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: statusBgColor }
        ]}>
          <Text style={styles.statusText}>{tripStatus}</Text>
        </View>
      </View>
      
      {trip.tripImageUrl && (
        <TouchableOpacity onPress={() => navigation.navigate('TripDetails', { trip: {
          ...trip,
          status: tripStatus // Pass the updated status
        }})}>
          <Image 
            source={{ uri: trip.tripImageUrl }}
            style={styles.tripImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
      
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
    </View>
  );
};

// PROFILE_COMPONENT_MARKER - Enhanced Profile Screen Component
const Profile = ({ navigation }) => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [profileImageKey, setProfileImageKey] = useState(Date.now());
  const [tripFormVisible, setTripFormVisible] = useState(false);
  // Add a state to force refresh when trip status changes
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
 
  // Add date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState([]);
  const [tripData, setTripData] = useState({
    title: '',
    location: '',
    description: '',
    price: '',
    startDate: '',
    endDate: '',
    image: null
  });
  
  const [userData, setUserData] = useState({
    userName: '',
    email: '',
    bio: '',
    profilePicture: null,
    profileImageData: null
  });
  
  // Get notification context
  const { loadNotifications } = useNotifications();
  
  // Get trips from context with lastUpdated
  const { userTrips, fetchUserTrips, isLoading: tripsLoading, createTrip, lastUpdated } = useTrips();
  
  // Update the notification listener useEffect to use the notification context
  useEffect(() => {
    // Register a notification handler for real-time updates
    const unsubscribeFromNotifications = socketService.onNotification((notification) => {
      console.log('Notification received in Profile:', notification);
      
      // If it's a trip status notification, refresh trips
      if (notification.data && 
         (notification.data.type === 'trip_approval' || notification.data.type === 'trip_rejection')) {
        console.log('Trip status notification received, refreshing trips');
        // Trigger a refresh by updating the refresh trigger
        setRefreshTrigger(Date.now());
        if (fetchUserTrips) fetchUserTrips(); // Add safety check
        
        // Also refresh notification count
        if (loadNotifications) loadNotifications();
        
        // Show a toast or notification here if you want
        Alert.alert(
          notification.title,
          notification.body,
          [{ text: 'OK' }]
        );
      }
    });
    
    return () => {
      // Clean up the notification handler when the component unmounts
      if (unsubscribeFromNotifications) {
        unsubscribeFromNotifications();
      }
    };
  }, []); // Remove all dependencies
  
  // Update the setupTripStatusListeners to use notification context
  const setupTripStatusListeners = async () => {
    try {
      // Initialize socket
      await socketService.initSocket();
      
      // Join user's personal room for updates
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        await socketService.joinTripRoom(`user:${userId}`);
      }
      
      // Listen for general trip status events
      socketService.socket?.on('tripStatusUpdated', (data) => {
        console.log('Trip status updated event received:', data);
        // This will trigger a refresh of all trips when any trip status changes
        setRefreshTrigger(Date.now());
        if (typeof fetchUserData === 'function') fetchUserData();
        if (typeof fetchUserTrips === 'function') fetchUserTrips();
        
        // Also refresh notifications
        if (typeof loadNotifications === 'function') loadNotifications();
      });
      
      // Also listen for profile-specific updates
      socketService.socket?.on('profileUpdate', (data) => {
        console.log('Profile update event received:', data);
        if (data.type === 'tripStatusChanged') {
          console.log('Trip status changed from profileUpdate event');
          setRefreshTrigger(Date.now());
          if (typeof fetchUserData === 'function') fetchUserData();
          if (typeof fetchUserTrips === 'function') fetchUserTrips();
          
          // Also refresh notifications
          if (typeof loadNotifications === 'function') loadNotifications();
        }
      });
      
      // Listen for direct notification events
      socketService.socket?.on('notification', (data) => {
        console.log('Profile received notification event:', data);
        
        // Check if this is related to trip approval/rejection
        if (data.data && (data.data.type === 'trip_approval' || data.data.type === 'trip_rejection')) {
          console.log('Trip status notification received, refreshing trips');
          setRefreshTrigger(Date.now());
          if (typeof fetchUserData === 'function') fetchUserData();
          if (typeof fetchUserTrips === 'function') fetchUserTrips();
          
          // Refresh notifications
          if (typeof loadNotifications === 'function') loadNotifications();
          
          // Display in-app alert for better UX
          Alert.alert(data.title, data.body);
        }
      });
    } catch (error) {
      console.error('Error setting up trip status listeners:', error);
    }
  };

  // Note: We're relying on real-time socket notifications to update trips
  // rather than refreshing on screen focus, which provides a more efficient
  // update mechanism that only triggers when data actually changes.

  // Request camera permissions and get token
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          navigation.navigate('Login');
          return;
        }

        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Sorry, we need camera roll permissions to update your profile picture!');
          }
        }

        await fetchUserData();
      } catch (error) {
        console.error('Error in initialization:', error);
        setLoading(false);
      }
    })();
  }, []);
  
  // Add effect to refresh trips when screen is focused
  useEffect(() => {
    let isMounted = true;
    let lastFetchTime = 0;
    const DEBOUNCE_TIME = 2000; // 2 seconds debounce
    
    const unsubscribe = navigation.addListener('focus', () => {
      const now = Date.now();
      // Only fetch if we haven't fetched recently
      if (now - lastFetchTime > DEBOUNCE_TIME && isMounted) {
        console.log('Profile screen focused, refreshing trips...');
        lastFetchTime = now;
        fetchUserTrips();
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation, fetchUserTrips]);

  // Handle trip submission
  const handleTripSubmit = async () => {
    try {
      setUpdating(true);
      
      // Use createTrip from context
      await createTrip(
        {
          title: tripData.title,
          location: tripData.location,
          description: tripData.description,
          price: tripData.price,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
        }, 
        tripData.image
      );
      
      // Close the trip form and reset form data
      setTripFormVisible(false);
      setTripData({
        title: '',
        location: '',
        description: '',
        price: '',
        startDate: '',
        endDate: '',
        image: null
      });
      
      const isAdmin = await AsyncStorage.getItem('isAdmin') === 'true';
      Alert.alert(
        'Success', 
        isAdmin 
          ? 'Trip created and approved successfully!' 
          : 'Trip created successfully! Waiting for admin approval.'
      );
      
      // Important: Refresh the trips list immediately after creating a new trip
      console.log('Refreshing trips list after creating new trip');
      setRefreshTrigger(Date.now());
      
      // Fetch user data immediately to get the new trip
      setTimeout(() => {
        fetchUserData();
      }, 500);
      
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
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      // Fetch user profile
      const response = await axios.get(`${API_URL}/getuser`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('User data response:', response.data);

      if (response.data && response.data[0]) {
        const user = response.data[0];
        setUserData({
          userName: user.userName || '',
          email: user.email || '',
          bio: user.bio || 'No bio added yet.',
          profilePicture: user.profilePicture,
          profileImageData: user.profileImageData
        });
      }

      // Now fetch user's trips separately
      try {
        console.log('Fetching user trips...');
        const tripsResponse = await axios.get(`${API_URL}/trips/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (tripsResponse.data) {
          console.log(`Profile: Fetched ${tripsResponse.data.length} trips for user:`, tripsResponse.data);
          
          // Make sure all trips have a status (default to 'pending' if null or undefined)
          const processedTrips = tripsResponse.data.map(trip => ({
            ...trip,
            status: trip.status || 'pending'
          }));
          
          // Important: Store the most up-to-date trip data in local state
          setTrips(processedTrips);
          
          // Trigger refresh to ensure UI updates immediately
          setRefreshTrigger(Date.now());
        }
      } catch (tripError) {
        console.error('Error fetching user trips:', tripError);
        // Try to get trips from the context as a fallback
        if (userTrips && userTrips.length > 0) {
          console.log('Using trips from context instead:', userTrips);
          setTrips(userTrips.map(trip => ({
            ...trip,
            status: trip.status || 'pending'
          })));
          
          // Trigger refresh even with fallback data
          setRefreshTrigger(Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('accessToken');
        navigation.navigate('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    try {
      console.log('Starting logout process...');
      // Clear saved tokens and data
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('isAdmin');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userEmail');
      
      // No need to deregister tokens anymore - removed Firebase
      // console.log('Deregistering push tokens before logout...');
      // await notificationService.deregisterTokenWithServer();

      // Close socket connection when logging out
      socketService.disconnectSocket();
      
      // Navigate back to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still try to navigate to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  // Handle image picking for trip
  const pickTripImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });

      if (!result.canceled) {
        // Handle the selected image
        const selectedAsset = result.assets[0];
        setTripData({...tripData, image: selectedAsset.uri});
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Handle start date change
  const handleStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    setShowStartDatePicker(Platform.OS === 'ios');
    setStartDate(currentDate);
    setTripData({ ...tripData, startDate: currentDate.toISOString().split('T')[0] });
  };

  // Handle end date change
  const handleEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || endDate;
    setShowEndDatePicker(Platform.OS === 'ios');
    setEndDate(currentDate);
    setTripData({ ...tripData, endDate: currentDate.toISOString().split('T')[0] });
  };

  // Add a pull-to-refresh functionality
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, []);

  // Add this useEffect after the useTrips destructuring and before the existing effect
  useEffect(() => {
    // Fetch user trips on component mount and when refreshTrigger changes
    if (fetchUserTrips) {
      console.log('Profile: fetching user trips on mount or refresh trigger change');
      fetchUserTrips();
    }
  }, [refreshTrigger]); // Remove fetchUserTrips from the dependency array

  // Add this useEffect directly after the setupTripStatusListeners function
  // This will set up socket listeners with proper dependency tracking
  useEffect(() => {
    // Set up socket listeners for real-time updates
    console.log('Setting up socket listeners for trip status updates');
    setupTripStatusListeners();
    
    // Clean up listeners on unmount
    return () => {
      // Clean up all listeners
      try {
        const cleanup = async () => {
          const userId = await AsyncStorage.getItem('userId');
          if (userId) {
            // Leave the user room
            await socketService.leaveTripRoom(`user:${userId}`);
          }
          
          // Remove socket event listeners
          socketService.socket?.off('tripStatusUpdated');
          socketService.socket?.off('profileUpdate');
          socketService.socket?.off('notification');
        };
        
        cleanup();
      } catch (error) {
        console.error('Error cleaning up Profile socket listeners:', error);
      }
    };
  }, []); // Remove all dependencies

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.profileContainer}
        contentContainerStyle={styles.profileScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            </View>

            {trips.length > 0 ? (
              trips.map((trip) => (
                <TripCard key={trip._id} trip={trip} navigation={navigation} />
              ))
            ) : (
              <View style={styles.noTripsContainer}>
                <Icon name="add-business" size={48} color="#ccc" />
                <Text style={styles.noTripsText}>No trips hosted yet</Text>
                <Text style={styles.noTripsSubText}>Create a trip to share your destination with others!</Text>
                <TouchableOpacity 
                  style={styles.createTripButton}
                  onPress={() => setTripFormVisible(true)}
                >
                  <Text style={styles.createTripButtonText}>Create Your First Trip</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

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
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button for adding new trip */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setTripFormVisible(true)}
        activeOpacity={0.7} // More responsive touch feedback
      >
        <View style={styles.fabInner}>
          <Icon name="add" size={28} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Trip Form Modal */}
      <Modal
        visible={tripFormVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTripFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.tripFormHeader}>
              <Text style={styles.tripFormTitle}>Create New Trip</Text>
              <TouchableOpacity 
                onPress={() => setTripFormVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScrollView}>
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
                  <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
                    <TextInput
                      style={styles.input}
                      value={tripData.startDate}
                      placeholder="YYYY-MM-DD"
                      editable={false}
                    />
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={handleStartDateChange}
                    />
                  )}
                </View>

                <View style={styles.dateInput}>
                  <Text style={styles.label}>End Date</Text>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(true)}>
                    <TextInput
                      style={styles.input}
                      value={tripData.endDate}
                      placeholder="YYYY-MM-DD"
                      editable={false}
                    />
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={handleEndDateChange}
                    />
                  )}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Trip Image</Text>
                <View style={styles.imageUploadContainer}>
                  {tripData.image ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image 
                        source={{ uri: tripData.image }} 
                        style={styles.imagePreview} 
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setTripData({...tripData, image: null})}
                      >
                        <Icon name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.imageUploadButton} 
                      onPress={pickTripImage}
                    >
                      <Icon name="photo-camera" size={24} color="#666" />
                      <Text style={styles.imageUploadText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
              console.log('Starting logout process...');
              
              // Clear all stored tokens and user data
              await AsyncStorage.removeItem('accessToken');
              await AsyncStorage.removeItem('userData');
              await AsyncStorage.removeItem('userId');
              await AsyncStorage.removeItem('isAdmin');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('userEmail');
              
              // No need to deregister tokens anymore - removed Firebase
              // console.log('Deregistering push tokens before logout...');
              // await notificationService.deregisterTokenWithServer();
              
              // Close socket connection when logging out
              socketService.disconnectSocket();
              
              // Navigate to Login screen with reset to prevent going back
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              
              console.log('Logout successful');
            } catch (error) {
              console.error('Error during logout:', error);
              // Still try to navigate to login
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
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

// Custom TabBar component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        // Skip hidden tabs (TripApproval, TripDetails, AllDestinations, and Destination)
        if (route.name === 'TripApproval' || route.name === 'TripDetails' || route.name === 'AllDestinations' || route.name === 'Destination') {
          return null;
        }

        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Get the icon name based on the route name
        let iconName;
        if (route.name === 'Home') {
          iconName = isFocused ? 'home' : 'home';
        } else if (route.name === 'Profile') {
          iconName = isFocused ? 'person' : 'person-outline';
        } else if (route.name === 'My Bookings') {
          iconName = isFocused ? 'book-online' : 'book-online';
        } else if (route.name === 'Setting') {
          iconName = isFocused ? 'settings' : 'settings';
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabBarButton}
          >
            <Icon 
              name={iconName} 
              size={24} 
              color={isFocused ? 'tomato' : 'gray'} 
            />
            <Text style={[
              styles.tabBarLabel,
              { color: isFocused ? 'tomato' : 'gray' }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Create Tab Navigator
const Tab = createBottomTabNavigator();

// Main App Component with Navigation
const HomeNavigator = ({ navigation }) => {
  const screenWidth = Dimensions.get('window').width;
  
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
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: true,
          tabBarShowLabel: true,
        }}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="My Bookings" component={MyBookings} />
        <Tab.Screen name="Profile" component={Profile} />
        <Tab.Screen name="Setting" component={Setting} />
        <Tab.Screen 
          name="TripApproval" 
          component={TripApproval} 
          options={{ 
            tabBarButton: () => null,
            headerShown: false 
          }} 
        />
        <Tab.Screen 
          name="TripDetails" 
          component={TripDetails} 
          options={{ 
            tabBarButton: () => null,
            headerShown: false 
          }} 
        />
        <Tab.Screen 
          name="AllDestinations" 
          component={AllDestinations} 
          options={{ 
            tabBarButton: () => null,
            headerShown: false,
            tabBarStyle: { display: 'none' } 
          }} 
        />
        <Tab.Screen 
          name="Destination" 
          component={DestinationDetails} 
          options={{ 
            tabBarButton: () => null,
            headerShown: false,
            tabBarStyle: { display: 'none' } 
          }} 
        />
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
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugButton: {
    marginRight: 12,
    padding: 4,
  },
  notificationIcon: {
    marginRight: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  profileScrollContent: {
    paddingBottom: 120, // Increased padding to prevent overlap with FAB
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
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    textAlign: 'center',
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
  noTripsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 30,
    marginTop: 10,
    alignItems: 'center',
  },
  noTripsText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  noTripsSubText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  createTripButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  createTripButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  tripImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  imageUploadContainer: {
    marginTop: 10,
  },
  imageUploadButton: {
    height: 150,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadText: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

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

  // Custom TabBar styles
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    width: '100%'
  },
  tabBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  formScrollView: {
    width: '100%',
    paddingHorizontal: 20,
  },
  tripFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  tripFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#3498db',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3498db',
  },
});

export default HomeNavigator;