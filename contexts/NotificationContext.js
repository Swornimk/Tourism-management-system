import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../config/socketService';
import { Alert } from 'react-native';

// Create notification context
export const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Load notifications from storage
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedNotifications = await AsyncStorage.getItem('notifications');
      const isAdmin = await AsyncStorage.getItem('isAdmin') === 'true';
      const userId = await AsyncStorage.getItem('userId');
      
      if (storedNotifications) {
        let notificationsList = JSON.parse(storedNotifications);
        
        // Filter notifications based on user role
        if (isAdmin) {
          // Admins should only see admin-specific notifications
          notificationsList = notificationsList.filter(notification => 
            notification.data && 
            (notification.data.type === 'admin_notification' || 
             notification.data.type === 'admin_trip_status_change' ||
             notification.data.type === 'system')
          );
        } else {
          // Regular users should see their own notifications
          notificationsList = notificationsList.filter(notification => 
            notification.data && 
            notification.data.type !== 'admin_notification' &&
            (!notification.data.sentToUserId || notification.data.sentToUserId === userId)
          );
        }
        
        setNotifications(notificationsList);
        
        // Count unread notifications
        const unreadNotifications = notificationsList.filter(notification => !notification.read);
        setUnreadCount(unreadNotifications.length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save notifications to storage
  const saveNotifications = useCallback(async (notificationsToSave) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(notificationsToSave));
      
      // Update unread count
      const unreadNotifications = notificationsToSave.filter(notification => !notification.read);
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: notification.id || Date.now().toString(),
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      date: notification.timestamp || new Date(),
      read: false
    };
    
    setNotifications(prevNotifications => {
      // 1. Check if same notification ID already exists
      const existsById = prevNotifications.some(n => n.id === newNotification.id);
      if (existsById) {
        console.log('Duplicate notification ID detected, ignoring', newNotification.id);
        return prevNotifications;
      }
      
      // 2. For trip notifications, apply strict deduplication
      if (newNotification.data && 
          (newNotification.data.type === 'trip_approval' || newNotification.data.type === 'trip_rejection') && 
          newNotification.data.tripId) {
        
        // Get the last 2 minutes worth of notifications with the same tripId and type
        // This longer window ensures we catch all duplicates even with clock differences
        const recentSimilarNotifications = prevNotifications.filter(n => 
          n.data && 
          n.data.type === newNotification.data.type &&
          n.data.tripId === newNotification.data.tripId &&
          // Check within a 2-minute window
          (new Date(n.date) > new Date(Date.now() - 120000))
        );
        
        if (recentSimilarNotifications.length > 0) {
          console.log(`Found ${recentSimilarNotifications.length} similar recent notifications for tripId ${newNotification.data.tripId}, ignoring duplicate`);
          return prevNotifications;
        }
        
        // Log that we're adding this notification
        console.log(`Adding trip notification for tripId: ${newNotification.data.tripId}, type: ${newNotification.data.type}`);
      }
      
      // Add new notification at the top of the list
      const updatedNotifications = [newNotification, ...prevNotifications];
      saveNotifications(updatedNotifications);
      return updatedNotifications;
    });
    
    setLastUpdated(Date.now());
  }, [saveNotifications]);

  // Mark a notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prevNotifications => {
      const updatedNotifications = prevNotifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      );
      
      saveNotifications(updatedNotifications);
      return updatedNotifications;
    });
  }, [saveNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prevNotifications => {
      const updatedNotifications = prevNotifications.map(notification => ({ 
        ...notification, 
        read: true 
      }));
      
      saveNotifications(updatedNotifications);
      return updatedNotifications;
    });
  }, [saveNotifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, [saveNotifications]);

  // Set up notification handlers via socket.io
  useEffect(() => {
    const setupSocketListeners = async () => {
      try {
        // Initialize socket
        await socketService.initSocket();
        
        // Register a notification handler
        const unsubscribeFromNotifications = socketService.onNotification((notification) => {
          console.log('NotificationContext received notification:', notification);
          
          // Add the notification to our state
          if (notification) {
            addNotification(notification);
            
            // Only show an alert for very high-priority notifications, not trip approvals/rejections
            // Trip notifications will be handled by the TripStatusNotification component
            if (notification.data && 
                notification.data.type !== 'trip_approval' && 
                notification.data.type !== 'trip_rejection' && 
                notification.data.type !== 'admin_trip_status_change' &&
                notification.data.priority === 'high') {
              
              // Only show alert if app is in foreground (optional)
              Alert.alert(
                notification.title,
                notification.body,
                [{ text: 'OK' }]
              );
            }
          }
        });
        
        // Join user-specific notification room
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          await socketService.joinTripRoom(`user:${userId}`);
        }
        
        // Also join the global trip approvals room for status updates
        await socketService.joinTripRoom('trip:approvals');
        
        // Load initial notifications from storage
        await loadNotifications();
        
        return () => {
          // Clean up
          if (unsubscribeFromNotifications) {
            unsubscribeFromNotifications();
          }
          
          if (userId) {
            socketService.leaveTripRoom(`user:${userId}`);
          }
          socketService.leaveTripRoom('trip:approvals');
        };
      } catch (error) {
        console.error('Error setting up notification socket listeners:', error);
      }
    };
    
    setupSocketListeners();
  }, [addNotification, loadNotifications]);

  // Context value
  const contextValue = {
    notifications,
    unreadCount,
    isLoading,
    lastUpdated,
    loadNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 