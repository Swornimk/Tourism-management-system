import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const TripStatusNotification = () => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const { notifications, markAsRead } = useNotifications();
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Use refs to track state without causing re-renders
  const notificationQueueRef = useRef([]);
  const timerRef = useRef(null);
  const processedNotificationsRef = useRef(new Set()); // Track already processed notifications
  const isProcessingRef = useRef(false); // Flag to prevent concurrent processing

  // Console log to verify component is mounted
  useEffect(() => {
    console.log('TripStatusNotification component mounted, Platform:', Platform.OS);
    return () => {
      console.log('TripStatusNotification component unmounted');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
    };
    if (isAuthenticated) {
      getUserId();
    }
  }, [isAuthenticated]);

  // Process new notifications
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    
    // Find relevant unread trip status notifications
    const unprocessedNotifications = notifications.filter(notification => 
      !notification.read && 
      !processedNotificationsRef.current.has(notification.id) &&
      notification.data && 
      (notification.data.type === 'trip_approval' || notification.data.type === 'trip_rejection') &&
      (!notification.data.sentToUserId || notification.data.sentToUserId === currentUserId)
    );
    
    if (unprocessedNotifications.length > 0) {
      console.log(`Found ${unprocessedNotifications.length} new trip notifications`);
      
      // Add new notifications to queue
      unprocessedNotifications.forEach(notification => {
        // Add to processed set to prevent re-processing
        processedNotificationsRef.current.add(notification.id);
        
        // Add to queue if not already there
        const alreadyInQueue = notificationQueueRef.current.some(n => n.id === notification.id);
        if (!alreadyInQueue) {
          notificationQueueRef.current.push(notification);
          console.log(`Added notification to queue: ${notification.id}`);
        }
      });
      
      // Trigger the display process if not already showing a notification
      if (!visible && !isProcessingRef.current) {
        displayNextNotification();
      }
    }
  }, [notifications, currentUserId, isAuthenticated, visible]);

  // Function to display the next notification in queue
  const displayNextNotification = useCallback(() => {
    // Prevent concurrent processing
    if (isProcessingRef.current || visible || notificationQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    
    // Get the first notification from queue
    const notification = notificationQueueRef.current.shift();
    console.log(`Displaying notification: ${notification.title} (ID: ${notification.id})`);
    
    // Set current notification and make visible
    setCurrentNotification(notification);
    setVisible(true);
    
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
    
    // Auto-hide after 2 seconds
    timerRef.current = setTimeout(() => {
      console.log("Auto-hide timer triggered");
      hideNotification();
      
      // Add a backup timer in case hideNotification doesn't work
      setTimeout(() => {
        if (visible) {
          console.log("Force hiding notification after timeout");
          setVisible(false);
          setCurrentNotification(null);
          fadeAnim.setValue(0);
        }
      }, 1000);
    }, 2000);
    
    isProcessingRef.current = false;
  }, [fadeAnim, visible, hideNotification]);

  // Function to hide current notification
  const hideNotification = useCallback(() => {
    if (!currentNotification) return;
    
    console.log(`Hiding notification: ${currentNotification.id}`);
    
    // Fade out animation with completion callback
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300, // Faster fade out
      useNativeDriver: true
    }).start(({finished}) => {
      // Only proceed if animation actually finished
      if (finished) {
        console.log(`Animation finished, marking notification as read: ${currentNotification.id}`);
        // Mark notification as read
        markAsRead(currentNotification.id);
        
        // Reset visibility state
        setVisible(false);
        setCurrentNotification(null);
        
        // Process next notification after a short delay
        setTimeout(() => {
          if (notificationQueueRef.current.length > 0) {
            displayNextNotification();
          }
        }, 300);
      } else {
        console.log("Animation did not finish properly, forcing cleanup");
        // Force cleanup if animation didn't finish
        markAsRead(currentNotification.id);
        setVisible(false);
        setCurrentNotification(null);
      }
    });
  }, [currentNotification, fadeAnim, markAsRead]);

  // Handle notification close button tap
  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    hideNotification();
  }, [hideNotification]);

  // If not visible, not authenticated, or no notification, don't render
  if (!visible || !isAuthenticated || !currentNotification) {
    return null;
  }

  const isApproved = currentNotification.data && currentNotification.data.status === 'approved';
  const backgroundColor = isApproved ? '#4CAF50' : '#F44336';

  return (
    <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
      <Animated.View 
        style={[
          styles.container, 
          { backgroundColor },
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{currentNotification.title}</Text>
          <Text style={styles.message}>{currentNotification.body}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  container: {
    margin: 10,
    marginTop: Platform.OS === 'ios' ? 50 : 40,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    color: 'white',
    fontSize: 14,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default TripStatusNotification; 