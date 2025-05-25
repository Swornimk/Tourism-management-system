import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../config/socketService';

const API_URL = 'https://tourism-management-system-wdu4.onrender.com';

// Create the context
export const TripContext = createContext();

// Custom hook to use the trip context
export const useTrips = () => useContext(TripContext);

export const TripProvider = ({ children }) => {
  const [allTrips, setAllTrips] = useState([]);
  const [userTrips, setUserTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Set up socket connection and listeners
  useEffect(() => {
    // Connect to socket and set up global listeners
    const setupSocketListeners = async () => {
      try {
        // Initialize socket
        await socketService.initSocket();

        // Join the trip approvals channel
        await socketService.joinTripRoom('trip:approvals');

        // Set up listener for newly approved trips
        socketService.socket?.on('tripApproved', (data) => {
          console.log('TripContext received tripApproved event:', data);

          if (data && data.tripId) {
            // Create a new trip object from the socket data
            const newTrip = {
              _id: data.tripId,
              title: data.title,
              location: data.location || 'Unknown Location',
              price: data.price || '0',
              tripImageUrl: data.tripImageUrl,
              status: 'approved',
              updatedAt: data.updatedAt || new Date().toISOString()
            };

            // Update allTrips list with the new trip if not already there
            setAllTrips(prevTrips => {
              // Check if trip already exists in the list
              const exists = prevTrips.some(trip => trip._id === newTrip._id);

              if (exists) {
                // If it exists, update it with the new data
                return prevTrips.map(trip =>
                  trip._id === newTrip._id ? { ...trip, ...newTrip } : trip
                );
              } else {
                // Otherwise, add it to the list
                console.log('Adding new approved trip to context:', newTrip.title);
                return [newTrip, ...prevTrips];
              }
            });

            // Trigger the lastUpdated timestamp to notify subscribers
            setLastUpdated(Date.now());
          }
        });

        // Set up listener for rejected trips
        socketService.socket?.on('tripRejected', (data) => {
          if (data && data.tripId) {
            // Update the status of the rejected trip in both lists
            const updateTripStatus = (trips) =>
              trips.map(trip =>
                trip._id === data.tripId ? { ...trip, status: 'rejected' } : trip
              );

            setAllTrips(updateTripStatus);
            setUserTrips(updateTripStatus);

            // Update the lastUpdated timestamp
            setLastUpdated(Date.now());
          }
        });
      } catch (error) {
        console.error('Error setting up socket listeners in TripContext:', error);
      }
    };

    setupSocketListeners();

    // Clean up socket listeners
    return () => {
      try {
        socketService.leaveTripRoom('trip:approvals');
        socketService.socket?.off('tripApproved');
        socketService.socket?.off('tripRejected');
      } catch (error) {
        console.error('Error cleaning up socket listeners in TripContext:', error);
      }
    };
  }, []);


  // Fetch all trips (for admin panels)
  const fetchAllTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(`${API_URL}/trips/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setAllTrips(response.data || []);
      setLastUpdated(Date.now());
      return response.data;
    } catch (error) {
      console.error('Error fetching all trips:', error);
      setError('Failed to load trips');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch user's trips
  const fetchUserTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(`${API_URL}/trips/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const newTrips = response.data || [];

      // Only update state and lastUpdated if the data has actually changed
      const tripsChanged = JSON.stringify(newTrips) !== JSON.stringify(userTrips);
      if (tripsChanged) {
        setUserTrips(newTrips);
        setLastUpdated(Date.now());
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching user trips:', error);
      setError('Failed to load trips');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [userTrips]);

  // Update trip status
  const updateTripStatus = useCallback(async (tripId, newStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Get the current user's ID and role
      const currentUserId = await AsyncStorage.getItem('userId');
      const isAdmin = await AsyncStorage.getItem('isAdmin') === 'true';

      // Get the trip details first to identify the creator
      const tripDetails = allTrips.find(trip => trip._id === tripId);

      if (!tripDetails) {
        console.error('Trip not found in local state:', tripId);
        throw new Error('Trip not found');
      }

      const creatorUserId = tripDetails.userId || null;
      const tripTitle = tripDetails.title || 'Unknown Trip';

      console.log(`Updating trip "${tripTitle}" (${tripId}) to status: ${newStatus}`);
      console.log(`Trip creator: ${creatorUserId}, Current user: ${currentUserId}, Is Admin: ${isAdmin}`);

      // Determine if notifications should be sent
      const notifyCreator = creatorUserId !== currentUserId; // Only notify if updater is not the creator
      const shouldSendAdminNotification = false; // Explicitly disable admin notifications for trip updates

      const response = await axios.patch(
        `${API_URL}/trips/${tripId}/status`,
        {
          status: newStatus,
          creatorUserId, // Include the creator's user ID for targeted notifications
          updaterIsAdmin: isAdmin, // Include whether the updater is an admin
          updaterUserId: currentUserId, // Include the ID of the user making the update
          notifyCreator, // Only notify if updater is not the creator
          shouldSendAdminNotification, // Explicitly disable admin notifications
          tripTitle, // Include trip title for notification content
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.trip) {
        // Update both trip lists to ensure consistency
        setAllTrips(prevTrips =>
          prevTrips.map(trip =>
            trip._id === tripId ? { ...trip, status: newStatus } : trip
          )
        );

        setUserTrips(prevTrips =>
          prevTrips.map(trip =>
            trip._id === tripId ? { ...trip, status: newStatus } : trip
          )
        );

        // Update timestamp to trigger re-renders in components watching lastUpdated
        setLastUpdated(Date.now());

        // Log notification path to help with debugging
        if (notifyCreator) {
          console.log(`Trip status update: notification should be sent to user ${creatorUserId} about their trip "${tripTitle}" status change to ${newStatus}`);
        } else {
          console.log(`No notification needed as user is updating their own trip "${tripTitle}"`);
        }
      }

      return response.data;
    } catch (error) {
      console.error('Error updating trip status:', error);
      setError('Failed to update trip status');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [allTrips]);

  // Create a new trip
  const createTrip = useCallback(async (tripData, image) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      const userId = await AsyncStorage.getItem('userId');

      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();

      // Add text fields
      Object.keys(tripData).forEach(key => {
        formData.append(key, tripData[key]);
      });

      // If user is admin, auto-approve the trip
      // if (isAdmin === 'true') {
      //   formData.append('status', 'approved');
      // }

      // Add image if provided
      if (image) {
        const filename = image.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('tripImage', {
          uri: image,
          name: filename,
          type,
        });
      }

      const response = await axios.post(
        `${API_URL}/trips`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
  
      // If trip creation was successful
      if (response.data.message === "Trip created successfully") {
        // Create a new trip object with response data
        const newTrip = {
          _id: response.data.tripId,
          ...tripData,
  
          // status: isAdmin ? 'approved' : 'pending',

          tripImageUrl: response.data.tripImageUrl,
          userId: userId, // Add the user ID for reference
          createdAt: new Date().toISOString()
        };

        // Add to relevant trip lists
        setUserTrips(prevTrips => [...prevTrips, newTrip]);

        if (isAdmin === 'true') {
          setAllTrips(prevTrips => [...prevTrips, newTrip]);
        }

        // Update timestamp to trigger re-renders
        setLastUpdated(Date.now());

        // Emit socket event to notify all connected clients that a new trip was created
        try {
          if (socketService.socket?.connected) {
            // Make sure we're connected to the proper room first
            await socketService.joinTripRoom('trip:approvals');

            // Emit the event with trip data
            socketService.socket.emit('clientEvent', {
              type: 'newTripCreated',
              data: {
                tripId: response.data.tripId,
                title: tripData.title,
                location: tripData.location,
                status: user.isAdmin ? 'approved' : 'pending',
                // status:'approved',
                createdBy: userId,
                timestamp: new Date().toISOString()
              }
            });

            console.log('Emitted newTripCreated event via socket');
          }
        } catch (socketError) {
          console.error('Error emitting trip created event:', socketError);
          // Don't fail the trip creation if socket event fails
        }
      }

      return response.data;
    } catch (error) {
      console.error('Error creating trip:', error);
      setError('Failed to create trip');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use useMemo for the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    allTrips,
    userTrips,
    isLoading,
    error,
    lastUpdated,
    fetchAllTrips,
    fetchUserTrips,
    updateTripStatus,
    createTrip
  }), [
    allTrips,
    userTrips,
    isLoading,
    error,
    lastUpdated,
    fetchAllTrips,
    fetchUserTrips,
    updateTripStatus,
    createTrip
  ]);

  return (
    <TripContext.Provider value={contextValue}>
      {children}
    </TripContext.Provider>
  );
}; 