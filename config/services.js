import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

// Create a navigation reference since we can't use hooks outside components
let navigationRef = null;

export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

// API base URL
const API_URL = 'https://tourism-tfph.onrender.com';

console.log('API URL configured as:', API_URL);

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request logging interceptor
api.interceptors.request.use(
  async (config) => {
    console.log(`🟢 REQUEST: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, 
      { 
        headers: config.headers,
        data: config.data, 
        params: config.params
      }
    );
    return config;
  },
  (error) => {
    console.log('🔴 REQUEST ERROR:', error);
    return Promise.reject(error);
  }
);

// Add response logging interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`🟢 RESPONSE: ${response.status} from ${response.config.url}`, 
      { 
        data: response.data,
        headers: response.headers
      }
    );
    return response;
  },
  (error) => {
    console.log('🔴 RESPONSE ERROR:', error.response ? {
      status: error.response.status,
      url: error.config.url,
      data: error.response.data,
      headers: error.response.headers
    } : error.message);
    return Promise.reject(error);
  }
);

// Add interceptor to add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error accessing token:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Booking service
export const bookingService = {
  // Create a new booking
  createBooking: async (bookingData) => {
    try {
      const response = await api.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  // Get user bookings
  getUserBookings: async (userId) => {
    try {
      const response = await api.get(`/bookings/user?userId=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    try {
      // Get userId from AsyncStorage if available
      let userId;
      try {
        userId = await AsyncStorage.getItem('userId');
      } catch (storageError) {
        console.warn('Could not retrieve userId, continuing anyway:', storageError);
      }
      
      const response = await api.delete(`/bookings/${bookingId}`, { 
        data: { userId } // Add userId to request body
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  },
};

// Payment service
export const paymentService = {
  // Open eSewa WebView payment
  processEsewaPayment: async (params) => {
    try {
      // Check if we received an object with paymentData property or just paymentData
      const paymentData = params.paymentData || params;
      const bookingId = params.bookingId || null;
      
      console.log('Processing eSewa payment with data:', { 
        bookingId, 
        paymentData
      });
      
      if (!navigationRef) {
        throw new Error('Navigation reference not available');
      }
      
      // Small delay before navigation to ensure previous screens have fully unmounted
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate to the payment screen
      navigationRef.navigate('EsewaPayment', { paymentData, bookingId });
      return true;
    } catch (error) {
      console.error('Error processing eSewa payment:', error);
      throw error;
    }
  },

  // Store pending booking ID
  setPendingBookingId: async (bookingId) => {
    try {
      await AsyncStorage.setItem('pendingBookingId', bookingId);
      return true;
    } catch (error) {
      console.error('Error storing pending booking ID:', error);
      return false;
    }
  },

  // Get pending booking ID
  getPendingBookingId: async () => {
    try {
      return await AsyncStorage.getItem('pendingBookingId');
    } catch (error) {
      console.error('Error retrieving pending booking ID:', error);
      return null;
    }
  },

  // Clear pending booking ID
  clearPendingBookingId: async () => {
    try {
      await AsyncStorage.removeItem('pendingBookingId');
      return true;
    } catch (error) {
      console.error('Error clearing pending booking ID:', error);
      return false;
    }
  },

  // Verify eSewa payment
  verifyEsewaPayment: async (data) => {
    try {
      // Accept both V1 and V2 API parameter formats
      // V1 API uses pid/oid and refId
      // V2 API uses transaction_uuid and transaction_code
      const pid = data.pid || data.oid || data.transactionId || data.transaction_uuid || '';
      const refId = data.refId || data.transaction_code || '';
      const amount = data.amount || data.amt || 0;
      const { bookingId, status } = data;
      
      console.log('🔄 Verifying eSewa payment:', { 
        pid,
        refId, 
        amount, 
        bookingId,
        status 
      });
      
      // Make API call to verify the payment - adapt to backend expectations
      const response = await api.post('/payments/esewa/verify', {
        pid, // backend expects pid
        refId,
        amount,
        bookingId,
        status
      });
      
      console.log('✅ eSewa payment verified:', response.data);
      
      // If verification successful, update the booking
      if (response.data.success) {
        try {
          const updateResponse = await api.post('/payments/esewa/update-booking', {
            bookingId,
            transactionId: pid,
            transactionCode: refId,
            status: status || 'COMPLETE'
          });
          console.log('✅ Booking updated after payment:', updateResponse.data);
        } catch (updateError) {
          console.error('Error updating booking after payment:', updateError);
          // We continue even if update fails, as payment was successful
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error verifying eSewa payment:', error);
      throw error;
    }
  }
};

export default {
  api,
  bookingService,
  paymentService,
}; 