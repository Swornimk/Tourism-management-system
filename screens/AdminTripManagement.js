import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import notificationService from '../config/notificationService';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTrips } from '../contexts/TripContext';
import socketService from '../config/socketService';

const API_URL = 'https://tourism-tfph.onrender.com';

const AdminTripManagement = ({ navigation, route }) => {
  // Get trips from context
  const { 
    allTrips, 
    fetchAllTrips, 
    updateTripStatus, 
    createTrip,
    isLoading: tripsLoading 
  } = useTrips();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  
  // New trip modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newTrip, setNewTrip] = useState({
    title: '',
    location: '',
    description: '',
    price: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    status: 'approved'
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tripImage, setTripImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Log when this component is mounted (for debugging)
  useEffect(() => {
    console.log('AdminTripManagement mounted');
  }, []);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);
  
  // Listen for navigation params to refresh
  useEffect(() => {
    if (route.params?.refresh) {
      fetchAllTrips();
      // Clear the parameter to prevent multiple refreshes
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  // Add a listener to refresh data when the screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Always refresh data when screen comes into focus
      console.log('AdminTripManagement focused, refreshing data...');
      fetchAllTrips();
    });

    // Return the cleanup function to unsubscribe from the event
    return unsubscribe;
  }, [navigation]);

  const checkAuthAndFetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      
      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }
      
      // Verify this is an admin account
      if (isAdmin !== 'true') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        return;
      }
      
      // Set access token in state and fetch data
      setAccessToken(token);
      setLoading(true);
      await fetchAllTrips();
      setLoading(false);
    } catch (error) {
      console.error('Error checking auth status:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllTrips();
    setRefreshing(false);
  };

  const handleUpdateTripStatus = async (tripId, newStatus) => {
    try {
      // Show a loading indicator or disable buttons while processing
      const loadingMessage = newStatus === 'approved' ? 'Approving trip...' : 'Rejecting trip...';
      Alert.alert('Processing', loadingMessage, [], { cancelable: false });
      
      // Use updateTripStatus from context
      const response = await updateTripStatus(tripId, newStatus);
      
      if (response.trip) {
        // Join the admin notification room to ensure we get updates
        await socketService.joinTripRoom('admin:notifications');
        
        // Refresh trip list
        await fetchAllTrips();
        
        // Show success message
        Alert.alert(
          'Success', 
          `Trip has been ${newStatus}`, 
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error(`Error ${newStatus} trip:`, error);
      Alert.alert('Error', `Failed to ${newStatus} trip. Please try again.`);
    }
  };

  const handleViewTripDetails = (trip) => {
    console.log('Navigating to TripApproval with trip:', trip._id);
    
    // Check if navigation is available
    if (!navigation) {
      console.error('Navigation object is undefined');
      Alert.alert('Error', 'Navigation not available. Please try again.');
      return;
    }
    
    // Make sure trip data is valid
    if (!trip || !trip._id) {
      console.error('Invalid trip data:', trip);
      Alert.alert('Error', 'Invalid trip data. Please try again.');
      return;
    }
    
    // Navigate to the TripApproval screen with trip data
    try {
      navigation.navigate('TripApproval', { 
        trip: trip,
        from: 'AdminTripManagement'
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open trip details. Please try again.');
    }
  };

  const renderStatusFilter = () => {
    const filterOptions = [
      { label: 'All', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' }
    ];

    return (
      <View style={styles.filterContainer}>
        {filterOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterButton,
              filterStatus === option.value && styles.activeFilterButton
            ]}
            onPress={() => setFilterStatus(option.value)}
          >
            <Text 
              style={[
                styles.filterButtonText,
                filterStatus === option.value && styles.activeFilterButtonText
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const filteredTrips = filterStatus === 'all' 
    ? allTrips 
    : allTrips.filter(trip => trip.status === filterStatus);

  // Debug output for rendering
  useEffect(() => {
    console.log(`Filter status: ${filterStatus}`);
    console.log(`Total trips: ${allTrips.length}`);
    console.log(`Filtered trips: ${filteredTrips.length}`);
  }, [filterStatus, allTrips, filteredTrips]);

  const renderTrip = ({ item: trip }) => {
    const getStatusColor = (status) => {
      if (status === 'approved') return '#2ecc71';
      if (status === 'rejected') return '#e74c3c';
      return '#f1c40f'; // pending
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };

    return (
      <View style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <Text style={styles.tripTitle}>{trip.title}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(trip.status) }
          ]}>
            <Text style={styles.statusText}>{trip.status}</Text>
          </View>
        </View>
        
        {trip.tripImageUrl && (
          <Image 
            source={{ uri: trip.tripImageUrl }} 
            style={styles.tripImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.tripInfoRow}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.tripInfoText}>{trip.location || 'No location specified'}</Text>
        </View>
        
        <View style={styles.tripInfoRow}>
          <Icon name="date-range" size={16} color="#666" />
          <Text style={styles.tripInfoText}>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </Text>
        </View>
        
        <View style={styles.tripInfoRow}>
          <Icon name="attach-money" size={16} color="#666" />
          <Text style={styles.tripInfoText}>Rs. {trip.price || 'N/A'}</Text>
        </View>
        
        <Text 
          style={styles.tripDescription}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {trip.description || 'No description provided'}
        </Text>
        
        <View style={styles.tripActionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleViewTripDetails(trip)}
          >
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {trip.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleUpdateTripStatus(trip._id, 'approved')}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleUpdateTripStatus(trip._id, 'rejected')}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Function to pick an image from the gallery
  const pickTripImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'You need to grant permission to access your photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTripImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  // Functions to handle date pickers
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setNewTrip(prev => ({ ...prev, startDate: selectedDate }));
      
      // If end date is before the new start date, update it
      if (newTrip.endDate < selectedDate) {
        setNewTrip(prev => ({ 
          ...prev, 
          endDate: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000) 
        }));
      }
    }
  };
  
  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setNewTrip(prev => ({ ...prev, endDate: selectedDate }));
    }
  };
  
  // Function to create a new trip
  const handleCreateTrip = async () => {
    try {
      setSubmitting(true);
      
      // Use createTrip from context
      await createTrip(
        {
          title: newTrip.title,
          location: newTrip.location,
          description: newTrip.description,
          price: newTrip.price,
          startDate: newTrip.startDate,
          endDate: newTrip.endDate,
          status: 'approved'
        },
        tripImage
      );
      
      // Reset form and close modal
      setNewTrip({
        title: '',
        location: '',
        description: '',
        price: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'approved'
      });
      setTripImage(null);
      setModalVisible(false);
      
      // Show success message
      Alert.alert('Success', 'Trip created and automatically approved!');
      
    } catch (error) {
      console.error('Error creating trip:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render the form modal
  const renderTripFormModal = () => {
    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add New Trip</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.imageSection}>
                {tripImage ? (
                  <Image 
                    source={{ uri: tripImage }} 
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Icon name="add-photo-alternate" size={40} color="#fff" />
                    <Text style={styles.placeholderText}>Add Trip Photo</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.imagePickerButton}
                  onPress={pickTripImage}
                >
                  <Icon name="photo-camera" size={20} color="#fff" />
                  <Text style={styles.imagePickerText}>Choose Image</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Trip Details</Text>
                
                <Text style={styles.inputLabel}>Trip Title*</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTrip.title}
                  onChangeText={text => setNewTrip(prev => ({ ...prev, title: text }))}
                  placeholder="Enter trip title"
                />
                
                <Text style={styles.inputLabel}>Location*</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTrip.location}
                  onChangeText={text => setNewTrip(prev => ({ ...prev, location: text }))}
                  placeholder="Enter location"
                />
                
                <Text style={styles.inputLabel}>Price (Rs.)*</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTrip.price}
                  onChangeText={text => setNewTrip(prev => ({ ...prev, price: text }))}
                  placeholder="Enter price"
                  keyboardType="numeric"
                />
                
                <Text style={styles.sectionTitle}>Trip Dates</Text>
                
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerContainer}>
                    <Text style={styles.inputLabel}>Start Date*</Text>
                    <TouchableOpacity 
                      style={styles.datePicker}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text>{newTrip.startDate.toLocaleDateString()}</Text>
                      <Icon name="event" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.datePickerContainer}>
                    <Text style={styles.inputLabel}>End Date*</Text>
                    <TouchableOpacity 
                      style={styles.datePicker}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text>{newTrip.endDate.toLocaleDateString()}</Text>
                      <Icon name="event" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {showStartDatePicker && (
                  <DateTimePicker
                    value={newTrip.startDate}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                    minimumDate={new Date()}
                  />
                )}
                
                {showEndDatePicker && (
                  <DateTimePicker
                    value={newTrip.endDate}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                    minimumDate={newTrip.startDate}
                  />
                )}
                
                <Text style={styles.sectionTitle}>Trip Description</Text>
                
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newTrip.description}
                  onChangeText={text => setNewTrip(prev => ({ ...prev, description: text }))}
                  placeholder="Enter detailed trip description"
                  multiline
                  numberOfLines={6}
                />
                
                <View style={styles.bottomSection}>
                  <Text style={styles.adminNoteText}>
                    Note: Trips created by admin are automatically approved.
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleCreateTrip}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Icon name="add-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.submitButtonText}>Create Trip</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // Add socket listeners for admin notifications
  useEffect(() => {
    const setupAdminNotificationListeners = async () => {
      try {
        // Join admin notification room
        await socketService.joinTripRoom('admin:notifications');
        
        // Set up notification handler for admin updates
        const unsubscribeFromNotifications = socketService.onNotification((notification) => {
          console.log('Admin notification received:', notification);
          
          // If it's an admin trip status change notification, refresh trips
          if (notification.data && notification.data.type === 'admin_trip_status_change') {
            console.log('Admin trip status notification received, refreshing trips');
            fetchAllTrips();
            
            // Show toast notification
            Alert.alert(
              notification.title,
              notification.body,
              [{ text: 'OK' }]
            );
          }
        });
        
        // Listen for all trip status changes
        socketService.socket?.on('tripStatusUpdated', (data) => {
          console.log('Trip status update received in AdminTripManagement:', data);
          fetchAllTrips();
        });
        
        // Return cleanup function
        return () => {
          socketService.leaveTripRoom('admin:notifications');
          if (unsubscribeFromNotifications) unsubscribeFromNotifications();
          socketService.socket?.off('tripStatusUpdated');
        };
      } catch (error) {
        console.error('Error setting up admin notification listeners:', error);
      }
    };
    
    setupAdminNotificationListeners();
  }, [fetchAllTrips]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStatusFilter()}

      {loading || tripsLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{ marginTop: 10 }}>Loading trips...</Text>
        </View>
      ) : filteredTrips.length > 0 ? (
        <FlatList
          data={filteredTrips}
          renderItem={renderTrip}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.tripList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3498db']}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="beach-access" size={64} color="#ddd" />
          <Text style={styles.emptyText}>
            {filterStatus === 'all' 
              ? 'No trips found' 
              : `No ${filterStatus} trips found`
            }
          </Text>
        </View>
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Trip Form Modal */}
      {renderTripFormModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#3498db',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeFilterButton: {
    backgroundColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripList: {
    padding: 15,
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
  tripLocation: {
    fontSize: 14,
    color: '#666',
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
  tripImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  tripInfoRow: {
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
    marginBottom: 10,
  },
  tripActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  viewButton: {
    backgroundColor: '#3498db',
  },
  approveButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },
  // FAB styles
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#3498db',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  datePickerContainer: {
    width: '48%',
  },
  datePicker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imagePickerButton: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: -25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  imagePickerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  formSection: {
    flex: 1,
  },
  bottomSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  adminNoteText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminTripManagement; 