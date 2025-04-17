import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:8000';

const AdminDashboard = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    // Check for token and redirect to login if not found
    const checkAuthAndFetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const isAdmin = await AsyncStorage.getItem('isAdmin');
        
        console.log('AdminDashboard token check:', token ? 'Token exists' : 'No token found');
        console.log('isAdmin check:', isAdmin === 'true' ? 'Is admin' : 'Not admin');
        
        if (!token) {
          console.log('No token found, redirecting to Login screen');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return;
        }
        
        // Verify this is an admin account
        if (isAdmin !== 'true') {
          console.log('Non-admin user attempting to access admin dashboard, redirecting to Welcome');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
          return;
        }
        
        // Verify token validity with backend
        try {
          console.log('Verifying token with backend...');
          await axios.get(`${API_URL}/getuser`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('Token validated successfully');
        } catch (error) {
          console.error('Token validation failed:', error.message);
          // Clear tokens and redirect to login
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return;
        }
        
        // Set access token in state and fetch data
        setAccessToken(token);
        fetchData(token);
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Redirect to login on error
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };
    
    checkAuthAndFetchData();
  }, [navigation]);

  // Add a listener to refresh data when the screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Always refresh data when screen comes into focus
      console.log('AdminDashboard focused, refreshing data...');
      fetchData(accessToken);
    });

    // Return the cleanup function to unsubscribe from the event
    return unsubscribe;
  }, [navigation, accessToken]);

  const fetchData = async (token) => {
    console.log('Starting fetchData...');
    setLoading(true);
    try {
      // Skip if no token is provided and none is available
      const authToken = token || await AsyncStorage.getItem('accessToken');
      
      if (!authToken) {
        console.log('No token available, skipping fetch');
        setLoading(false);
        return;
      }
      
      console.log('Using token for API requests');

      // Fetch trips
      console.log('Fetching trips...');
      const tripsResponse = await axios.get(`${API_URL}/trips/all`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).catch(error => {
        console.error('Error fetching trips:', error.message);
        if (error.response && error.response.status === 401) {
          throw new Error('Unauthorized - token invalid or expired');
        }
        throw error;
      });
      
      console.log(`Fetched ${tripsResponse.data.length} trips`);
      
      // Fetch users
      let userData = [];
      try {
        console.log('Fetching users...');
        const usersResponse = await axios.get(`${API_URL}/users`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        userData = usersResponse.data;
        console.log(`Fetched ${userData.length} users`);
      } catch (error) {
        console.error('Error fetching users:', error.message);
        if (error.response && error.response.status === 401) {
          throw new Error('Unauthorized - token invalid or expired');
        }
        
        // Mock data for users if endpoint doesn't exist
        userData = [
          { _id: '1', userName: 'John Doe', email: 'john@example.com', isAdmin: false, isActive: true },
          { _id: '2', userName: 'Jane Smith', email: 'jane@example.com', isAdmin: true, isActive: true },
          { _id: '3', userName: 'Bob Johnson', email: 'bob@example.com', isAdmin: false, isActive: false }
        ];
        console.log('Using mock user data instead');
      }
      
      // Update state with fetched data
      console.log('Updating state with fetched data...');
      setTrips(tripsResponse.data);
      setUsers(userData);
      
      // Calculate real stats from API data
      const pendingTrips = tripsResponse.data.filter(trip => trip.status === 'pending');
      const approvedTrips = tripsResponse.data.filter(trip => trip.status === 'approved');
      
      setStats({
        totalUsers: userData.length || 0,
        activeListings: approvedTrips.length || 0,
        pendingApprovals: pendingTrips.length || 0
      });
      console.log('Stats updated successfully');

    } catch (error) {
      console.error('Error in fetchData:', error.message);
      
      // Handle unauthorized errors by clearing tokens and redirecting to login
      if (error.message.includes('Unauthorized') || 
          (error.response && (error.response.status === 401 || error.response.status === 403))) {
        console.log('Unauthorized access detected, clearing tokens and redirecting to login');
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        // For other errors, just show an alert
        Alert.alert('Error', 'Failed to fetch data. Please try again later.');
      }
    } finally {
      console.log('Finished fetchData, setting loading to false');
      setLoading(false);
    }
  };

  const handleUpdateTripStatus = async (tripId, newStatus) => {
    try {
      if (!accessToken) {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          navigation.navigate('Login');
          return;
        }
        setAccessToken(token);
      }

      await axios.put(
        `${API_URL}/trips/${tripId}/status`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Update local state
      setTrips(prevTrips =>
        prevTrips.map(trip =>
          trip._id === tripId ? { ...trip, status: newStatus } : trip
        )
      );

      // Get the updated trips array for correct counts
      const updatedTrips = trips.map(trip =>
        trip._id === tripId ? { ...trip, status: newStatus } : trip
      );
      
      // Recalculate stats
      const pendingTrips = updatedTrips.filter(trip => trip.status === 'pending');
      const approvedTrips = updatedTrips.filter(trip => trip.status === 'approved');
      
      setStats(prevStats => ({
        ...prevStats,
        activeListings: approvedTrips.length,
        pendingApprovals: pendingTrips.length
      }));

      Alert.alert('Success', `Trip ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating trip status:', error);
      Alert.alert('Error', 'Failed to update trip status');
    }
  };

  const handleUpdateUserStatus = async (userId, isCurrentlyActive) => {
    try {
      if (!accessToken) {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          navigation.navigate('Login');
          return;
        }
        setAccessToken(token);
      }
      
      // New status will be the opposite of current status
      const newStatus = !isCurrentlyActive;
      
      // Confirm before deactivating
      if (!newStatus) {
        Alert.alert(
          'Confirm Deactivation',
          'Are you sure you want to deactivate this user? They will not be able to log in.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Deactivate', 
              style: 'destructive',
              onPress: async () => await updateUserStatusOnServer(userId, newStatus)
            }
          ]
        );
      } else {
        // Activate without confirmation
        await updateUserStatusOnServer(userId, newStatus);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };
  
  const updateUserStatusOnServer = async (userId, isActive) => {
    try {
      await axios.put(
        `${API_URL}/user/${userId}/status`,
        { isActive },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId ? { ...user, isActive } : user
        )
      );

      // Update stats if needed (not needed for user status changes as total users remains the same)
      
      Alert.alert(
        'Success', 
        `User ${isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          onPress: async () => {
            console.log('Logging out...');
            try {
              // Clear all auth-related data from AsyncStorage
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isAdmin']);
              console.log('Auth tokens cleared from storage');
              
              // Reset navigation state and go to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to log out properly. Please try again.');
            }
          }
        }
      ]
    );
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
        from: 'AdminDashboard'
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open trip details. Please try again.');
    }
  };

  const renderTrip = (trip) => {
    const getStatusColor = (status) => {
      if (status === 'approved') return '#2ecc71';
      if (status === 'rejected') return '#e74c3c';
      return '#f1c40f'; // pending
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
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
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.infoText}>{trip.location || 'No location'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="date-range" size={16} color="#666" />
            <Text style={styles.infoText}>
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="attach-money" size={16} color="#666" />
            <Text style={styles.infoText}>Rs{trip.price}</Text>
          </View>
        </View>
        
        <View style={styles.cardActions}>
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

  const renderUser = (user) => {
    // Helper function to get the correct profile picture URL
    const getProfilePictureUrl = () => {
      if (user.profilePictureUrl) {
        return user.profilePictureUrl;
      } else if (user.profilePicture) {
        return `${API_URL}/profile/picture?userId=${user._id}&token=${Date.now()}`;
      }
      return null;
    };

    const profilePictureUrl = getProfilePictureUrl();
    console.log('User profile picture URL:', profilePictureUrl);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userHeaderInfo}>
            <Text style={styles.userFullName}>{user.userName}</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: user.isActive ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusText}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.isAdmin ? 'Admin' : 'User'}</Text>
          </View>
        </View>
        
        <View style={styles.userInfo}>
          <Image 
            source={
              profilePictureUrl && accessToken
                ? { 
                    uri: profilePictureUrl,
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  }
                : require('./../assets/img/default-avatar.jpg')
            }
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone && <Text style={styles.userMeta}>{user.phone}</Text>}
            {user.createdAt && (
              <Text style={styles.userMeta}>
                Joined: {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        
        {!user.isAdmin && (
          <TouchableOpacity
            style={[
              styles.userActionButton,
              user.isActive ? styles.deactivateButton : styles.activateButton
            ]}
            onPress={() => handleUpdateUserStatus(user._id, user.isActive)}
          >
            <Text style={styles.actionButtonText}>
              {user.isActive ? 'Deactivate User' : 'Activate User'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const navigateToTripManagement = () => {
    navigation.navigate('AdminTripManagement');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="notifications" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['Users', 'Analytics'].map((tab) => (
        <TouchableOpacity 
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
                    </Text>
                  </TouchableOpacity>
        ))}
      </View>

      {/* Content based on active tab */}
      <ScrollView style={styles.content}>
        {activeTab === 'Analytics' && (
          <View>
            <Text style={styles.sectionTitle}>Analytics Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.activeListings}</Text>
                <Text style={styles.statLabel}>Active Listings</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.pendingApprovals}</Text>
                <Text style={styles.statLabel}>Pending Approvals</Text>
              </View>
            </View>
            <View style={styles.dashboardCardRow}>
              <TouchableOpacity style={styles.dashboardCard} onPress={navigateToTripManagement}>
                <View style={[styles.cardIcon, { backgroundColor: '#9b59b6' }]}>
                  <Icon name="card-travel" size={24} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>Trip Management</Text>
                <Text style={styles.cardValue}>
                  {stats.pendingApprovals} pending
                </Text>
                <Text style={styles.cardDescription}>
                  Manage user-submitted trips
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'Users' && (
          <View>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>User Management</Text>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#888" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
            
            {users
              .filter(user => 
                user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(user => (
                <View key={user._id}>
                  {renderUser(user)}
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#777',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
  },
  listHeader: {
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
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
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardContent: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 5,
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
    fontWeight: 'bold',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userDetails: {
    flex: 1,
  },
  userFullName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userMeta: {
    fontSize: 12,
    color: '#888',
  },
  roleBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    color: '#555',
  },
  userHeaderInfo: {
    flex: 1,
  },
  userActionButton: {
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#F44336',
  },
  dashboardCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardValue: {
    fontSize: 14,
    color: '#777',
  },
  cardDescription: {
    fontSize: 12,
    color: '#888',
  },
});

export default AdminDashboard;