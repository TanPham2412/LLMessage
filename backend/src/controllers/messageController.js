const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

class MessageController {
  async sendMessage(req, res) {
    try {
      const { conversationId, content, type = 'text' } = req.body;
      const senderId = req.user.id;

      // Verify conversation exists and user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (!conversation.hasParticipant(senderId)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant of this conversation'
        });
      }

      // Create message
      const messageData = {
        conversation: conversationId,
        sender: senderId,
        content,
        type
      };

      // If file was uploaded
      if (req.file) {
        messageData.fileUrl = `/uploads/${req.file.filename}`;
        messageData.fileName = req.file.originalname;
        messageData.fileSize = req.file.size;
        messageData.type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
      }

      const message = await Message.create(messageData);

      // Update conversation's last message
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = message.createdAt;
      await conversation.save();

      // Populate sender info
      await message.populate('sender', 'username fullName avatar');

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }
  }

  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user.id;

      // Verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (!conversation.hasParticipant(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant of this conversation'
        });
      }

      const messages = await Message.find({
        conversation: conversationId,
        isDeleted: false
      })
        .populate('sender', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const count = await Message.countDocuments({
        conversation: conversationId,
        isDeleted: false
      });

      res.json({
        success: true,
        data: messages.reverse(),
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages',
        error: error.message
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Check if already read by this user
      const alreadyRead = message.readBy.some(
        r => r.user.toString() === userId.toString()
      );

      if (!alreadyRead) {
        message.readBy.push({ user: userId, readAt: Date.now() });
        message.isRead = true;
        await message.save();
      }

      res.json({
        success: true,
        message: 'Message marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark message as read',
        error: error.message
      });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Only sender can delete
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages'
        });
      }

      message.isDeleted = true;
      message.deletedAt = Date.now();
      await message.save();

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: error.message
      });
    }
  }

  async getAllMessages(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const messages = await Message.find({ isDeleted: false })
        .populate('sender', 'username fullName avatar')
        .populate('conversation', 'name type')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const count = await Message.countDocuments({ isDeleted: false });

      res.json({
        success: true,
        data: messages,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get all messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages',
        error: error.message
      });
    }
  }
}

module.exports = new MessageController();
