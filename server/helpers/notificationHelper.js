const axios = require('axios');
const { ObjectId } = require('mongodb');
require('dotenv').config({ path: './config.env' });

/**
 * Send push notifications to an array of Expo push tokens
 * @param {Array} pushTokens - Array of Expo push tokens
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise} - Promise that resolves with the response from Expo
 */
async function sendPushNotifications(pushTokens, title, body, data = {}) {
  try {
    if (!pushTokens || pushTokens.length === 0) {
      console.log('No push tokens provided');
      return { status: 'error', message: 'No push tokens provided' };
    }

    console.log(`Sending push notifications to ${pushTokens.length} device(s)`);
    console.log('Push tokens:', pushTokens);

    // Format the messages for Expo's push notification service with enhanced iOS support
    const messages = pushTokens.map(token => {
      // Determine if the token is for iOS (starts with 'ExponentPushToken')
      const isIOS = token.startsWith('ExponentPushToken');
      const isExpoPushToken = token.includes('ExponentPushToken') || token.includes('ExpoPushToken');
      
      if (!isExpoPushToken) {
        console.log(`Token ${token} doesn't appear to be a valid Expo push token. Skipping.`);
        return null;
      }
      
      console.log(`Preparing message for token: ${token}, iOS device: ${isIOS}`);
      
      return {
        to: token,
        sound: 'default',
        title,
        body,
        data: { ...data, timestamp: new Date().toISOString() },
        badge: 1,
        // iOS specific properties
        _displayInForeground: true,  // Force notification to show in foreground on iOS
        priority: 'high',
        channelId: 'default',
      };
    }).filter(message => message !== null);  // Remove invalid messages

    if (messages.length === 0) {
      console.log('No valid messages to send after filtering');
      return { status: 'error', message: 'No valid messages to send' };
    }

    console.log(`Sending ${messages.length} notification(s) via Expo push service`);
    
    // Send the notifications using Expo's push notification service
    const response = await axios.post('https://exp.host/--/api/v2/push/send', 
      messages, 
      {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Push notifications sent, response data:', response.data);
    
    // Check for errors in the response
    if (response.data.data && response.data.data.some(item => item.status === 'error')) {
      const errors = response.data.data.filter(item => item.status === 'error');
      console.error('Some push notifications failed:', errors);
      
      // Continue with the successful ones
      return { 
        status: 'partial', 
        data: response.data,
        errors: errors
      };
    }
    
    return { status: 'success', data: response.data };
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Send push notification to a specific user
 * @param {String} userId - User ID
 * @param {Object} db - Database connection
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data to send with the notification
 */
async function sendUserPushNotification(userId, db, title, body, data = {}) {
  try {
    console.log(`Attempting to send push notification to user: ${userId}`);
    
    if (!userId) {
      console.error('Invalid userId provided for push notification');
      return { status: 'error', message: 'Invalid userId provided' };
    }
    
    // Convert string ID to ObjectId if needed
    let userObjectId;
    try {
      userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    } catch (error) {
      console.error(`Failed to convert userId to ObjectId: ${userId}`, error);
      return { status: 'error', message: 'Invalid userId format' };
    }
    
    console.log(`Looking up user with ID: ${userObjectId}`);
    
    // Get user's push tokens
    const user = await db.collection('users').findOne({ _id: userObjectId });
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return { status: 'error', message: 'User not found' };
    }
    
    console.log(`Found user: ${user.userName || 'Unknown'}, pushTokens:`, user.pushTokens);
    
    if (!user.pushTokens || user.pushTokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return { status: 'error', message: 'No push tokens found for user' };
    }
    
    // Send push notifications to all user's devices
    const result = await sendPushNotifications(user.pushTokens, title, body, data);
    console.log(`Push notification result for user ${userId}:`, result);
    return result;
  } catch (error) {
    console.error('Error sending user push notification:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Send push notification to all admin users
 * @param {Object} db - Database connection
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data to send with the notification
 */
async function sendAdminPushNotifications(db, title, body, data = {}) {
  try {
    // Get all admin users
    const adminUsers = await db.collection('users')
      .find({ isAdmin: true, pushTokens: { $exists: true, $ne: [] } })
      .toArray();
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users with push tokens found');
      return { status: 'error', message: 'No admin users with push tokens found' };
    }
    
    // Collect all push tokens from admin users
    const adminPushTokens = adminUsers.reduce((tokens, user) => {
      return tokens.concat(user.pushTokens || []);
    }, []);
    
    // Send push notifications to all admin devices
    return await sendPushNotifications(adminPushTokens, title, body, data);
  } catch (error) {
    console.error('Error sending admin push notifications:', error);
    return { status: 'error', message: error.message };
  }
}

module.exports = {
  sendPushNotifications,
  sendUserPushNotification,
  sendAdminPushNotifications
}; 