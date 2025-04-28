const openCollection = require("../database/databaseConnection");
const { ObjectId } = require("mongodb");
const { GetIdFromAccessToken, IsAuthenticated } = require("../helpers/authHelper");
const fs = require('fs');
const path = require('path');

// Send a notification to a specific user
const sendPushNotification = async (req, res) => {
  try {
    // Verify authentication
    if (!IsAuthenticated(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get the sender's userId from the token
    const senderId = GetIdFromAccessToken(req);
    if (!senderId) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // Get the notification data from the request body
    const { userId, notification } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    if (!notification || !notification.title || !notification.body) {
      return res.status(400).json({ 
        message: "Notification must include title and body" 
      });
    }

    // Open the database connection
    const userCollection = await openCollection("users");

    // Check if sender is authorized (admin or the user themselves)
    const sender = await userCollection.findOne({ _id: new ObjectId(senderId) });
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Only allow admins to send notifications to other users
    const targetIsSelf = senderId === userId;
    const senderIsAdmin = sender.isAdmin === true;

    if (!targetIsSelf && !senderIsAdmin) {
      return res.status(403).json({ 
        message: "Not authorized to send notifications to other users" 
      });
    }

    // Get the user to send notification to
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Check if this is an admin notification and if we should skip it
    const targetIsAdmin = user.isAdmin === true;
    const shouldSendAdminNotification = notification.data?.shouldSendAdminNotification !== false;
    
    // Skip the notification if the target is an admin and shouldSendAdminNotification is false
    if (targetIsAdmin && !shouldSendAdminNotification) {
      console.log(`Skipping notification to admin user ${userId} due to shouldSendAdminNotification=false`);
      return res.status(200).json({ 
        message: "Notification skipped per shouldSendAdminNotification flag",
        skipped: true,
        targetUserId: userId,
        targetIsAdmin: true
      });
    }

    console.log(`Sending notification to user ${userId} (admin: ${targetIsAdmin})`);

    // Record this notification in the database
    const notificationsCollection = await openCollection("notifications");
    
    const notificationRecord = {
      userId: userId,
      senderId: senderId,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sentAt: new Date(),
      read: false,
      targetIsAdmin: targetIsAdmin,
      senderIsAdmin: senderIsAdmin
    };

    const recordResult = await notificationsCollection.insertOne(notificationRecord);

    // Prepare the notification message
    const message = {
      title: notification.title,
      body: notification.body,
      data: {
        ...notification.data,
        notificationId: recordResult.insertedId.toString(),
        senderId: senderId,
        senderIsAdmin: senderIsAdmin.toString(),
        targetUserId: userId,
        targetUserRole: targetIsAdmin ? 'admin' : 'user',
        targetIsAdmin: targetIsAdmin.toString(),
        shouldSendAdminNotification: shouldSendAdminNotification.toString(),
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString()
    };

    // Get the Socket.IO instance
    const io = req.app.get('io');
    
    // Send notification via WebSocket
    io.to(`user:${userId}`).emit('notification', message);
    
    console.log(`Notification sent to user ${userId} via WebSocket`);

    return res.status(200).json({
      message: "Notification sent successfully",
      targetUserRole: targetIsAdmin ? 'admin' : 'user',
      shouldSendAdminNotification: shouldSendAdminNotification,
      notification: {
        title: notification.title,
        body: notification.body,
        data: notification.data
      }
    });
    
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  sendPushNotification
}; 