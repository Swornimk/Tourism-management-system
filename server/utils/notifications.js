/**
 * Notification utilities for sending in-app notifications via WebSockets
 */

const { ObjectId } = require('mongodb');

const sendNotificationToUser = async (req, userId, notification) => {
  try {
    const db = req.app.locals.db;
    const io = req.app.get('io');
    
    console.log(`Preparing to send notification to user ID: ${userId}`);
    
    // Convert userId to ObjectId if it's not already
    let userObjectId;
    try {
      userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    } catch (error) {
      console.error(`Failed to convert userId to ObjectId: ${userId}`, error);
      return false;
    }
    
    // Get user from database to verify they exist
    const user = await db.collection('users').findOne({ _id: userObjectId });
    
    if (!user) {
      console.log(`User not found with ID: ${userId}`);
      return false;
    }
    
    console.log(`Found user: ${user.userName || 'unnamed'}, sending notification via WebSocket`);
    
    // Add user ID to the notification data
    const notificationData = {
      ...notification.data || {},
      userId: userId.toString(),
      userName: user.userName || 'User',
      timestamp: new Date().toISOString()
    };
    
    // Prepare the message
    const message = {
      title: notification.title || 'Tourism App Update',
      body: notification.body || 'You have a new notification',
      data: notificationData,
      timestamp: new Date().toISOString()
    };
    
    // Send notification via socket.io to user's room
    io.to(`user:${userId}`).emit('notification', message);
    
    console.log(`Successfully sent notification to user ${userId} (${user.userName || 'unnamed'}) via WebSocket`);
    
    // Store notification in database for persistence
    try {
      await db.collection('notifications').insertOne({
        userId: userId.toString(),
        title: notification.title,
        body: notification.body,
        data: notification.data,
        timestamp: new Date(),
        read: false
      });
    } catch (dbError) {
      console.error('Failed to store notification in database:', dbError);
      // Continue execution even if storage fails
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

const sendNotificationToAdmin = async (req, notification) => {
  try {
    const io = req.app.get('io');
    const db = req.app.locals.db;
    
    // Check if admin notifications should be skipped
    const shouldSendAdminNotification = notification.data?.shouldSendAdminNotification !== false;
    
    if (!shouldSendAdminNotification) {
      console.log('Skipping admin notification as shouldSendAdminNotification is false');
      return { 
        skipped: true, 
        reason: 'shouldSendAdminNotification flag is false'
      };
    }
    
    // Get admin users
    const adminUsers = await db.collection('users').find({ isAdmin: true }).toArray();
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found');
      return false;
    }
    
    // Add admin targeting info to notification data
    const notificationData = {
      ...notification.data || {},
      targetUserRole: 'admin',
      targetIsAdmin: 'true',
      shouldSendAdminNotification: shouldSendAdminNotification.toString(),
      timestamp: new Date().toISOString()
    };
    
    // Prepare the message
    const message = {
      title: notification.title || 'Admin Alert',
      body: notification.body || 'You have a new admin notification',
      data: notificationData,
      timestamp: new Date().toISOString()
    };
    
    // Send to admin notification room via socket.io
    io.to('admin:notifications').emit('notification', message);
    
    console.log(`Successfully sent notification to admin room`);
    
    // Store notification for all admins in database
    try {
      const notificationInserts = adminUsers.map(admin => ({
        userId: admin._id.toString(),
        title: notification.title,
        body: notification.body,
        data: notification.data,
        timestamp: new Date(),
        read: false
      }));
      
      if (notificationInserts.length > 0) {
        await db.collection('notifications').insertMany(notificationInserts);
      }
    } catch (dbError) {
      console.error('Failed to store admin notifications in database:', dbError);
      // Continue execution even if storage fails
    }
    
    return {
      success: true,
      totalAdmins: adminUsers.length
    };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return false;
  }
};

module.exports = {
  sendNotificationToUser,
  sendNotificationToAdmin
}; 