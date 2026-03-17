const express = require('express');
const messageController = require('../controllers/messageController');
const { authenticate, isAdmin } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

class MessageRoutes {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // All routes require authentication
    this.router.use(authenticate);

    // Send message (with optional file upload)
    this.router.post(
      '/',
      uploadMiddleware.single('file'),
      messageController.sendMessage.bind(messageController)
    );

    // Get messages for a conversation - MUST be before /:messageId routes
    this.router.get('/conversation/:conversationId', messageController.getMessages.bind(messageController));

    // Mark message as read - MUST be before generic /:messageId
    this.router.put('/:messageId/read', messageController.markAsRead.bind(messageController));

    // Edit message
    this.router.put('/:messageId', messageController.editMessage.bind(messageController));

    // Delete message
    this.router.delete('/:messageId', messageController.deleteMessage.bind(messageController));

    // Admin: Get all messages
    this.router.get('/admin/all', isAdmin, messageController.getAllMessages.bind(messageController));
  }
}

module.exports = new MessageRoutes().router;
