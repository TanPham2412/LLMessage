const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all notifications for current user
router.get('/', notificationController.getNotifications.bind(notificationController));

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

// Mark notification as read
router.put('/:notificationId/read', notificationController.markAsRead.bind(notificationController));

// Mark all as read
router.put('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification.bind(notificationController));

// Clear all notifications
router.delete('/', notificationController.clearAll.bind(notificationController));

module.exports = router;
