import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// WebSocket server URL (same as API base URL)
const WS_URL = 'https://tourism-tfph.onrender.com'; // Main socket server
const BACKUP_WS_URL = 'wss://tourism-tfph.onrender.com'; // Backup with explicit WSS protocol
let CURRENT_URL = WS_URL;

// Create socket instance with auto-connect disabled
let socket = null;
let activeListeners = new Map();
let activeTrips = new Set();
let reconnectAttempts = 0;
let reconnectTimer = null;
let isConnecting = false;
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max delay

// Near the top of file, add a notification cache to track recent notifications
let notificationCache = new Map(); // Maps notification type+id to timestamp
const CACHE_EXPIRY = 120000; // 2 minutes in milliseconds

// Add a function to check and update cache
const isDuplicateNotification = (notificationType, itemId) => {
  const cacheKey = `${notificationType}:${itemId}`;
  const now = Date.now();
  
  // Clean expired cache entries
  for (const [key, timestamp] of notificationCache.entries()) {
    if (now - timestamp > CACHE_EXPIRY) {
      notificationCache.delete(key);
    }
  }
  
  // Check if this is a duplicate notification
  if (notificationCache.has(cacheKey)) {
    console.log(`Duplicate notification detected: ${cacheKey}, ignoring`);
    return true;
  }
  
  // Not a duplicate, add to cache
  notificationCache.set(cacheKey, now);
  console.log(`New notification cached: ${cacheKey}`);
  return false;
};

// Add socket.io path and options
const socketOptions = {
  path: '/socket.io', // Standard Socket.IO path
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
  reconnectionDelay: 1000,
  reconnectionDelayMax: MAX_RECONNECT_DELAY,
  randomizationFactor: 0.5,
  timeout: 20000,
  transports: ['websocket', 'polling'],
};

// Store for notification handlers
let notificationHandlers = [];

/**
 * Register a notification handler
 * @param {Function} handler - The function to call when a notification is received
 * @returns {Function} - Function to unregister the handler
 */
export const onNotification = (handler) => {
  notificationHandlers.push(handler);
  
  // Return a function to unregister the handler
  return () => {
    notificationHandlers = notificationHandlers.filter(h => h !== handler);
  };
};

/**
 * Initialize WebSocket connection
 */
export const initSocket = async () => {
  // If already trying to connect, return the existing promise
  if (isConnecting) {
    console.log('Socket connection already in progress');
    return socket;
  }
  
  // If already connected, just return the socket
  if (socket && socket.connected) {
    console.log('Socket already connected');
    return socket;
  }
  
  try {
    isConnecting = true;
    
    // Clean up any existing socket instance
    if (socket) {
      socket.off();
      socket.disconnect();
    }
    
    // Get authentication token
    const token = await AsyncStorage.getItem('accessToken');
    const userId = await AsyncStorage.getItem('userId');
    
    // Create new socket instance with the current URL
    const options = {
      ...socketOptions,
      auth: { token, userId },
      query: { token, userId }
    };
    
    socket = io(CURRENT_URL, options);
    
    // Set up the socket connection and event handlers safely
    socket.on('connect', () => {
      try {
        console.log('WebSocket connected! Socket ID:', socket.id);
        reconnectAttempts = 0;
        
        // Reset URL to primary on successful connection
        CURRENT_URL = WS_URL;
        
        // Clear any pending reconnect timers
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        
        // Rejoin all active trip rooms after reconnection
        activeTrips.forEach(tripId => {
          joinTripRoom(tripId);
        });
        
        // Join user-specific room if userId is available
        if (userId) {
          joinTripRoom(`user:${userId}`);
        }
        
        // Also join trip approvals channel to get updates on new trip approvals
        joinTripRoom('trip:approvals');
      } catch (error) {
        console.error('Error in socket connect handler:', error);
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      
      // If we've reached max attempts, stop trying
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Max reconnection attempts reached, giving up');
        if (socket) {
          socket.disconnect();
        }
        return;
      }
      
      // Try alternate URL if main URL fails on first attempt
      if (reconnectAttempts === 1 && CURRENT_URL === WS_URL) {
        console.log('Trying alternate WebSocket URL...');
        CURRENT_URL = BACKUP_WS_URL;
        socket.io.uri = CURRENT_URL;
      }
      
      // Implement exponential backoff
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
      
      console.log(`Will attempt reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts})`);
      
      // Schedule a reconnection
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        console.log('Attempting reconnection...');
        if (socket) socket.connect();
      }, delay);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      
      // If the server disconnected us, don't auto reconnect
      if (reason === 'io server disconnect') {
        console.log('Server disconnected the socket, will not reconnect automatically');
      }
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Handle fallback to polling if websocket fails
    socket.on('upgradeError', () => {
      console.log('WebSocket upgrade failed, falling back to polling');
    });
    
    // Set up notification handler
    socket.on('notification', (notificationData) => {
      console.log('Received notification via WebSocket:', notificationData);
      
      // Check for duplicates if this is a trip notification
      if (notificationData.data && 
          (notificationData.data.type === 'trip_approval' || notificationData.data.type === 'trip_rejection') &&
          notificationData.data.tripId) {
        
        if (isDuplicateNotification(notificationData.data.type, notificationData.data.tripId)) {
          // Skip duplicate notification
          console.log('Skipping duplicate socket notification');
          return;
        }
      }
      
      // Call all registered notification handlers
      notificationHandlers.forEach(handler => {
        try {
          handler(notificationData);
        } catch (error) {
          console.error('Error in notification handler:', error);
        }
      });
      
      // If it's a trip status update notification, trigger a trip status update
      if (notificationData.data && 
         (notificationData.data.type === 'trip_approval' || notificationData.data.type === 'trip_rejection') &&
         notificationData.data.tripId) {
        console.log('Trip status notification received, triggering status update');
        socket.emit('tripStatusUpdated', {
          tripId: notificationData.data.tripId,
          status: notificationData.data.status,
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    // Listen for tripApproved events
    socket.on('tripApproved', (tripData) => {
      console.log('Trip approved notification received:', tripData);
      
      // Check if this is a duplicate notification
      if (isDuplicateNotification('trip_approval', tripData.tripId)) {
        console.log('Skipping duplicate tripApproved notification');
        return;
      }
      
      // Check if user is admin before showing notification
      AsyncStorage.getItem('isAdmin').then(isAdmin => {
        // Skip notification for admins
        if (isAdmin === 'true') {
          console.log('User is admin, skipping trip approval notification');
          return;
        }
        
        // Notify any registered handlers for non-admin users
        notificationHandlers.forEach(handler => {
          try {
            handler({
              title: 'Trip Approved',
              body: `Trip "${tripData.title}" has been approved`,
              data: {
                type: 'trip_approval',
                tripId: tripData.tripId,
                status: 'approved'
              },
              timestamp: tripData.updatedAt || new Date().toISOString()
            });
          } catch (error) {
            console.error('Error in trip approval notification handler:', error);
          }
        });
      }).catch(error => {
        console.error('Error checking admin status for trip approval:', error);
      });
    });
    
    // Listen for tripRejected events
    socket.on('tripRejected', (tripData) => {
      console.log('Trip rejected notification received:', tripData);
      
      // Check if this is a duplicate notification
      if (isDuplicateNotification('trip_rejection', tripData.tripId)) {
        console.log('Skipping duplicate tripRejected notification');
        return;
      }
      
      // Check if user is admin before showing notification
      AsyncStorage.getItem('isAdmin').then(isAdmin => {
        // Skip notification for admins
        if (isAdmin === 'true') {
          console.log('User is admin, skipping trip rejection notification');
          return;
        }
        
        // Notify any registered handlers for non-admin users
        notificationHandlers.forEach(handler => {
          try {
            handler({
              title: 'Trip Rejected',
              body: `Trip "${tripData.title}" has been rejected`,
              data: {
                type: 'trip_rejection',
                tripId: tripData.tripId,
                status: 'rejected'
              },
              timestamp: tripData.updatedAt || new Date().toISOString()
            });
          } catch (error) {
            console.error('Error in trip rejection notification handler:', error);
          }
        });
      }).catch(error => {
        console.error('Error checking admin status for trip rejection:', error);
      });
    });
    
    // Listen for profileUpdate events (handles profile-specific real-time updates)
    socket.on('profileUpdate', (data) => {
      console.log('Profile update notification received:', data);
      
      if (data.type === 'tripStatusChanged') {
        // Check if this is a duplicate notification
        if (isDuplicateNotification(
          data.newStatus === 'approved' ? 'trip_approval' : 'trip_rejection', 
          data.tripId
        )) {
          console.log('Skipping duplicate profile update notification');
          return;
        }
        
        // Check if user is admin before showing notification
        AsyncStorage.getItem('isAdmin').then(isAdmin => {
          // Skip notification for admins
          if (isAdmin === 'true') {
            console.log('User is admin, skipping profile update notification');
            return;
          }
          
          // Notify any registered handlers with a custom notification
          notificationHandlers.forEach(handler => {
            try {
              const isApproved = data.newStatus === 'approved';
              handler({
                title: isApproved ? 'Trip Approved' : 'Trip Status Update',
                body: `Your trip has been ${data.newStatus}`,
                data: {
                  type: isApproved ? 'trip_approval' : 'trip_rejection',
                  tripId: data.tripId,
                  status: data.newStatus
                },
                timestamp: data.timestamp || new Date().toISOString()
              });
            } catch (error) {
              console.error('Error in profile update notification handler:', error);
            }
          });
        }).catch(error => {
          console.error('Error checking admin status for profile update:', error);
        });
      }
    });
    
    // Listen for admin-specific trip status change events
    socket.on('adminTripStatusChanged', (data) => {
      console.log('Admin trip status change received:', data);
      
      // Notify any registered handlers
      notificationHandlers.forEach(handler => {
        try {
          // Create a notification specifically for admin users
          handler({
            title: `Trip ${data.status === 'approved' ? 'Approved' : 'Rejected'} - Admin`,
            body: `Trip "${data.title}" has been ${data.status} ${data.adminAction === 'self' ? 'by you' : 'by another admin'}`,
            data: {
              type: 'admin_trip_status_change',
              tripId: data.tripId,
              status: data.status,
              adminAction: data.adminAction
            },
            timestamp: data.timestamp || new Date().toISOString()
          });
        } catch (error) {
          console.error('Error in admin trip status change handler:', error);
        }
      });
    });
    
    // Listen for global trip status updates
    socket.on('globalTripStatusUpdate', (data) => {
      console.log('Global trip status update received:', data);
      
      // This event is meant to be caught by all clients, regardless of rooms
      // Emit a trip status updated event for any components listening specifically
      if (data && data.tripId) {
        // Forward the event to all our active listeners
        activeListeners.forEach((listener, key) => {
          if (key.startsWith('tripStatusUpdated:') && key.includes(data.tripId)) {
            listener(data);
          }
        });
        
        // Check if user is admin - don't forward notifications to admins
        AsyncStorage.getItem('isAdmin').then(isAdmin => {
          // Skip notification for admins, but continue with listeners for UI updates
          if (isAdmin === 'true') {
            console.log('User is admin, skipping notification popup but updating UI');
            return;
          }
          
          // Only notify general handlers for non-admin users
          notificationHandlers.forEach(handler => {
            try {
              const title = data.status === 'approved' ? 'Trip Approved' : 
                            data.status === 'rejected' ? 'Trip Rejected' : 'Trip Status Updated';
              
              // Create body message with trip title if available
              let body = `A trip${data.tripTitle ? ` "${data.tripTitle}"` : ''} has been ${data.status}`;
              
              handler({
                title: title,
                body: body,
                data: {
                  type: data.status === 'approved' ? 'trip_approval' : 
                        data.status === 'rejected' ? 'trip_rejection' : 'trip_status_change',
                  tripId: data.tripId,
                  tripTitle: data.tripTitle,
                  status: data.status
                },
                timestamp: data.updatedAt || new Date().toISOString()
              });
            } catch (error) {
              console.error('Error in global trip status update handler:', error);
            }
          });
        }).catch(error => {
          console.error('Error checking admin status in socket handler:', error);
        });
      }
    });
    
    return socket;
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
    return null;
  } finally {
    isConnecting = false;
  }
};

/**
 * Get the socket instance (initializes if not already connected)
 */
export const getSocket = async () => {
  if (!socket || !socket.connected) {
    return await initSocket();
  }
  return socket;
};

/**
 * Join a trip room to receive real-time updates
 */
export const joinTripRoom = async (tripId) => {
  try {
    const socket = await getSocket();
    if (!socket) return false;
    
    socket.emit('joinTrip', tripId);
    activeTrips.add(tripId);
    console.log(`Joined trip room for trip ${tripId}`);
    return true;
  } catch (error) {
    console.error(`Error joining trip room ${tripId}:`, error);
    return false;
  }
};

/**
 * Leave a trip room when no longer needed
 */
export const leaveTripRoom = async (tripId) => {
  try {
    if (!socket) return false;
    
    socket.emit('leaveTrip', tripId);
    activeTrips.delete(tripId);
    console.log(`Left trip room for trip ${tripId}`);
    return true;
  } catch (error) {
    console.error(`Error leaving trip room ${tripId}:`, error);
    return false;
  }
};

/**
 * Listen for trip status updates
 * @param {string} tripId - The trip ID to listen for updates
 * @param {function} callback - Function to call when a status update is received
 */
export const listenToTripStatusUpdates = async (tripId, callback) => {
  try {
    // Join the trip room first
    await joinTripRoom(tripId);
    
    const socket = await getSocket();
    if (!socket) return false;
    
    // Remove any existing listeners for this trip to avoid duplicates
    if (activeListeners.has(`tripStatusUpdated:${tripId}`)) {
      socket.off('tripStatusUpdated', activeListeners.get(`tripStatusUpdated:${tripId}`));
    }
    
    // Create the listener function
    const statusListener = (data) => {
      if (data.tripId === tripId) {
        console.log(`Received status update for trip ${tripId}:`, data);
        callback(data);
      }
    };
    
    // Save the listener for later removal if needed
    activeListeners.set(`tripStatusUpdated:${tripId}`, statusListener);
    
    // Register the listener for multiple event types
    socket.on('tripStatusUpdated', statusListener);
    socket.on('globalTripStatusUpdate', statusListener);
    
    // Also listen for profile updates specific to this trip
    socket.on('profileUpdate', (data) => {
      if (data.type === 'tripStatusChanged' && data.tripId === tripId) {
        console.log(`Received profile update for trip ${tripId}:`, data);
        callback({
          tripId: data.tripId,
          status: data.newStatus,
          updatedAt: data.timestamp
        });
      }
    });
    
    console.log(`Listening for status updates on trip ${tripId}`);
    
    return true;
  } catch (error) {
    console.error(`Error setting up trip status listener for ${tripId}:`, error);
    return false;
  }
};

/**
 * Stop listening for trip status updates
 */
export const stopListeningToTripStatusUpdates = async (tripId) => {
  try {
    if (!socket) return false;
    
    // Remove listeners
    if (activeListeners.has(`tripStatusUpdated:${tripId}`)) {
      const listener = activeListeners.get(`tripStatusUpdated:${tripId}`);
      socket.off('tripStatusUpdated', listener);
      socket.off('globalTripStatusUpdate', listener);
      socket.off('profileUpdate'); // Remove profile update listener for this trip
      activeListeners.delete(`tripStatusUpdated:${tripId}`);
    }
    
    // Leave the trip room
    await leaveTripRoom(tripId);
    
    console.log(`Stopped listening for status updates on trip ${tripId}`);
    return true;
  } catch (error) {
    console.error(`Error removing trip status listener for ${tripId}:`, error);
    return false;
  }
};

/**
 * Reconnect socket with a new authentication token
 * @param {string} token - The new JWT token for authentication
 */
export const reconnectWithToken = async (token) => {
  try {
    console.log('Reconnecting socket with new authentication token');
    
    // Disconnect existing socket
    if (socket) {
      socket.disconnect();
    }
    
    // Store token in AsyncStorage
    if (token) {
      await AsyncStorage.setItem('socketAuthToken', token);
    }
    
    // Reset connection state
    isConnecting = false;
    reconnectAttempts = 0;
    
    // Get user ID
    const userId = await AsyncStorage.getItem('userId');
    
    // Prepare connection options
    const options = {
      ...socketOptions,
      auth: { token, userId },
      query: { token, userId }
    };
    
    // Create new socket
    socket = io(CURRENT_URL, options);
    
    // Set up basic event handlers
    socket.on('connect', () => {
      console.log('Socket reconnected with new token! Socket ID:', socket.id);
      
      // Rejoin active rooms
      activeTrips.forEach(tripId => {
        joinTripRoom(tripId);
      });
      
      // Join user-specific room
      if (userId) {
        joinTripRoom(`user:${userId}`);
      }
      
      // Join trip approvals channel
      joinTripRoom('trip:approvals');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Error reconnecting socket with new token:', error.message);
    });
    
    return socket;
  } catch (error) {
    console.error('Failed to reconnect socket with new token:', error);
    throw error;
  }
};

/**
 * Disconnect WebSocket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeListeners.clear();
    activeTrips.clear();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;
    console.log('WebSocket disconnected and cleaned up');
  }
};

export default {
  initSocket,
  getSocket,
  joinTripRoom,
  leaveTripRoom,
  listenToTripStatusUpdates,
  stopListeningToTripStatusUpdates,
  disconnectSocket,
  onNotification,
  reconnectWithToken,
  socket
}; 