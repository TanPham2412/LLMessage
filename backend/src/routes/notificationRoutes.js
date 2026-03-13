const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

class NotificationRoutes {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // All routes require authentication
    this.router.use(authenticate);

    // Get all notifications for current user
    this.router.get('/', notificationController.getNotifications.bind(notificationController));

    // Get unread count
    this.router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

    // Mark notification as read
    this.router.put('/:notificationId/read', notificationController.markAsRead.bind(notificationController));

    // Mark all as read
    this.router.put('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));

    // Delete notification
    this.router.delete('/:notificationId', notificationController.deleteNotification.bind(notificationController));

    // Clear all notifications
    this.router.delete('/', notificationController.clearAll.bind(notificationController));

    // Report a user (sends notification to admins)
    this.router.post('/report', notificationController.reportUser.bind(notificationController));
  }
}

module.exports = new NotificationRoutes().router;
