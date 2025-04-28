import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  // Initialize notifications
  initialize: async () => {
    try {
      // Check if user is logged in before initializing notifications
      const isLoggedIn = await AsyncStorage.getItem('accessToken') !== null;
      
      if (!isLoggedIn) {
        console.log('User not logged in, skipping notification initialization');
        return false;
      }
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      // Store that notifications are initialized
      await AsyncStorage.setItem('notificationsInitialized', 'true');
      
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  },

  // Register for push notifications
  registerForPushNotifications: async () => {
    try {
      // Check if device is a physical device (not a simulator/emulator)
      if (!Constants.isDevice) {
        console.log('Push notifications are not available on simulators/emulators');
        return;
      }
      
      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      // Request permission specifically for iOS
      if (Platform.OS === 'ios') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
            },
          });
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Permission not granted for iOS notifications');
          return;
        }
      }
      
      // Device-specific setup for iOS
      if (Platform.OS === 'ios') {
        // This will fire when a notification is received while the app is foregrounded
        const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
          console.log('Foreground Notification received on iOS:', notification);
          const newNotification = {
            id: Date.now().toString(),
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
            date: new Date(),
            read: false
          };
          
          notificationService.storeNotification(newNotification);
        });
        
        // This will fire when the user taps on or interacts with a notification
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Notification response on iOS:', response);
          // Handle notification response (e.g., navigate to a specific screen)
        });
        
        return () => {
          foregroundSubscription.remove();
          responseSubscription.remove();
        };
      } else {
        // Set up notification received handler for Android
        const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
          console.log('Notification received on Android:', notification);
          const newNotification = {
            id: Date.now().toString(),
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
            date: new Date(),
            read: false
          };
          
          notificationService.storeNotification(newNotification);
        });
        
        // Set up notification response handler (when user taps the notification)
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Notification response on Android:', response);
          // Handle notification response (e.g., navigate to a specific screen)
        });
        
        return () => {
          receivedSubscription.remove();
          responseSubscription.remove();
        };
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  },
  
  // Store notification in AsyncStorage for retrieval in the notification context
  storeNotification: async (notification) => {
    try {
      // Get existing notifications
      const storedNotifications = await AsyncStorage.getItem('notifications');
      let notifications = [];
      
      if (storedNotifications) {
        notifications = JSON.parse(storedNotifications);
      }
      
      // Add new notification to the beginning of the array
      notifications.unshift(notification);
      
      // Limit number of stored notifications to 50
      if (notifications.length > 50) {
        notifications = notifications.slice(0, 50);
      }
      
      // Save updated notifications
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      console.log('Notification stored:', notification.title);
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  },
  
  // Schedules a local notification to be displayed immediately
  showLocalNotification: async (title, body, data = {}, autoDismiss = true) => {
    try {
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
      };
      
      // Check if user is admin - don't show notifications to admins
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      if (isAdmin === 'true') {
        console.log('User is admin, skipping notification display');
        return true;
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // null means show immediately
      });
      
      console.log('Local notification scheduled:', title);
      
      // Auto-dismiss notification after 3 seconds if enabled
      if (autoDismiss) {
        setTimeout(async () => {
          await Notifications.dismissNotificationAsync(notificationId);
        }, 3000); // 3 seconds
      }
      
      // Also store the notification
      notificationService.storeNotification({
        id: Date.now().toString(),
        title,
        body,
        data,
        date: new Date(),
        read: false
      });
      
      return true;
    } catch (error) {
      console.error('Error showing local notification:', error);
      return false;
    }
  },
  
  // Get all stored notifications
  getStoredNotifications: async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem('notifications');
      
      if (storedNotifications) {
        return JSON.parse(storedNotifications);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting stored notifications:', error);
      return [];
    }
  },
  
  // Mark a notification as read
  markNotificationAsRead: async (notificationId) => {
    try {
      const storedNotifications = await AsyncStorage.getItem('notifications');
      
      if (storedNotifications) {
        const notifications = JSON.parse(storedNotifications);
        
        // Find and update the notification
        const updatedNotifications = notifications.map(notification => {
          if (notification.id === notificationId) {
            return { ...notification, read: true };
          }
          return notification;
        });
        
        // Save updated notifications
        await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
        console.log('Notification marked as read:', notificationId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },
  
  // Send trip approval notification to the trip creator
  sendTripApprovalNotification: async (tripTitle, creatorId, tripId) => {
    try {
      const title = "Trip Approved";
      const body = `Your trip "${tripTitle}" has been approved!`;
      const data = {
        type: 'trip_approval',
        tripId,
        status: 'approved'
      };
      
      return await notificationService.showLocalNotification(title, body, data);
    } catch (error) {
      console.error('Error sending trip approval notification:', error);
      return false;
    }
  },
  
  // Send trip rejection notification to the trip creator
  sendTripRejectionNotification: async (tripTitle, creatorId, tripId) => {
    try {
      const title = "Trip Rejected";
      const body = `Your trip "${tripTitle}" has been rejected.`;
      const data = {
        type: 'trip_rejection',
        tripId,
        status: 'rejected'
      };
      
      return await notificationService.showLocalNotification(title, body, data);
    } catch (error) {
      console.error('Error sending trip rejection notification:', error);
      return false;
    }
  },
  
  // Clear all notifications
  clearAllNotifications: async () => {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Clear all displayed notifications
      if (Platform.OS === 'android') {
        await Notifications.dismissAllNotificationsAsync();
      }
      
      // Clear stored notifications
      await AsyncStorage.removeItem('notifications');
      
      console.log('All notifications cleared');
      return true;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  }
};

export default notificationService; 