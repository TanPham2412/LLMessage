const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate, isAdmin } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Send message (with optional file upload)
router.post(
  '/',
  uploadMiddleware.single('file'),
  messageController.sendMessage.bind(messageController)
);

// Get messages for a conversation
router.get('/conversation/:conversationId', messageController.getMessages.bind(messageController));

// Mark message as read
router.put('/:messageId/read', messageController.markAsRead.bind(messageController));

// Delete message
router.delete('/:messageId', messageController.deleteMessage.bind(messageController));

// Admin: Get all messages
router.get('/admin/all', isAdmin, messageController.getAllMessages.bind(messageController));

module.exports = router;
