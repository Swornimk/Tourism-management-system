import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AdminDashboard = ({ navigation }) => {
  // Sample data - replace with your actual data
  const [users, setUsers] = useState([
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'User', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Admin', status: 'Active' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
  ]);

  const [listings, setListings] = useState([
    { id: '1', title: 'Beach Resort', location: 'Bali', status: 'Approved' },
    { id: '2', title: 'Mountain Cabin', location: 'Switzerland', status: 'Pending' },
    { id: '3', title: 'City Apartment', location: 'New York', status: 'Rejected' },
  ]);

  const [activeTab, setActiveTab] = useState('users');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => navigation.navigate('Login'),
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const toggleUserStatus = (id) => {
    setUsers(users.map(user => 
      user.id === id 
        ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' } 
        : user
    ));
  };

  const updateListingStatus = (id, status) => {
    setListings(listings.map(listing => 
      listing.id === id ? { ...listing, status } : listing
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Logout Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.notificationIcon}>
            <Icon name="notifications" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Icon name="logout" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>



      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'listings' && styles.activeTab]}
          onPress={() => setActiveTab('listings')}
        >
          <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {activeTab === 'users' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Management</Text>
                  {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#888"
        />
      </View>
            <FlatList
              data={users}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.userInfo}>
                    <Image 
                      source={require('./../assets/img/class.jpg')} 
                      style={styles.avatar} 
                    />
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                      <View style={styles.userMeta}>
                        <Text style={styles.userRole}>{item.role}</Text>
                        <Text style={[
                          styles.userStatus,
                          item.status === 'Active' ? styles.activeStatus : styles.inactiveStatus
                        ]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.statusButton}
                    onPress={() => toggleUserStatus(item.id)}
                  >
                    <Text style={styles.statusButtonText}>
                      {item.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {activeTab === 'listings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listing Approvals</Text>
                  {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#888"
        />
      </View>
            <FlatList
              data={listings}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.listingInfo}>
                    <Image 
                      source={require('./../assets/img/logo.jpg')} 
                      style={styles.listingImage} 
                    />
                    <View style={styles.listingDetails}>
                      <Text style={styles.listingTitle}>{item.title}</Text>
                      <Text style={styles.listingLocation}>{item.location}</Text>
                      <Text style={[
                        styles.listingStatus,
                        item.status === 'Approved' ? styles.approvedStatus :
                        item.status === 'Pending' ? styles.pendingStatus :
                        styles.rejectedStatus
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  {item.status === 'Pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => updateListingStatus(item.id, 'Approved')}
                      >
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => updateListingStatus(item.id, 'Rejected')}
                      >
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            />
          </View>
        )}

        {activeTab === 'analytics' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analytics Overview</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>1,248</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>568</Text>
                <Text style={styles.statLabel}>Active Listings</Text>
              </View>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>87</Text>
                <Text style={styles.statLabel}>Pending Approvals</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    padding: 15,
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
  notificationIcon: {
    marginRight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  userMeta: {
    flexDirection: 'row',
  },
  userRole: {
    fontSize: 12,
    color: '#555',
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  userStatus: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeStatus: {
    backgroundColor: '#E3F7E7',
    color: '#4CAF50',
  },
  inactiveStatus: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  statusButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  listingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listingImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
  },
  listingDetails: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  listingLocation: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  listingStatus: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  approvedStatus: {
    backgroundColor: '#E3F7E7',
    color: '#4CAF50',
  },
  pendingStatus: {
    backgroundColor: '#FFF8E1',
    color: '#FFA000',
  },
  rejectedStatus: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#E3F7E7',
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default AdminDashboard;