import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';
import axios from 'axios';

const API_URL = 'https://tourism-management-system-wdu4.onrender.com';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get(`${API_URL}/bookings/all`);
        setBookings(response.data);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>{item.tripDetails.title}</Text>
            <Text style={styles.bookingDetails}>User: {item.userId}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bookingCard: { padding: 20, margin: 10, backgroundColor: '#fff', borderRadius: 10 },
  bookingTitle: { fontSize: 18, fontWeight: 'bold' },
  bookingDetails: { fontSize: 14, color: '#555' },
});

export default AdminBookings;
