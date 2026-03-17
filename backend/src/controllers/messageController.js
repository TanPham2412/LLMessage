const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

class MessageController {
  constructor(socketHandler = null) {
    this.socketHandler = socketHandler;
  }

  setSocketHandler(socketHandler) {
    this.socketHandler = socketHandler;
  }

  getIO() {
    return this.socketHandler?.io;
  }

  async sendMessage(req, res) {
    try {
      const { conversationId, content, type = 'text' } = req.body;
      const senderId = req.user.id;

      // Xác thực conversation tồn tại và user là thành viên
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

      // Check if sender is blocked by any participant
      const otherParticipants = conversation.participants.filter(
        p => p.toString() !== senderId.toString()
      );
      
      let isBlockedBySomeone = false;
      for (const participantId of otherParticipants) {
        const participant = await User.findById(participantId).select('blockedUsers');
        if (participant && participant.blockedUsers.includes(senderId)) {
          isBlockedBySomeone = true;
          break;
        }
      }

      // Tạo tin nhắn
      const messageData = {
        conversation: conversationId,
        sender: senderId,
        content,
        type
      };

      // Nếu bị chặn, đánh dấu message
      if (isBlockedBySomeone) {
        messageData.isBlocked = true;
        messageData.blockedMessage = 'Xin lỗi! Người dùng hiện tại không muốn nhận tin nhắn!';
      }

      // Nếu có file được upload
      if (req.file) {
        // Multer đọc originalname bằng latin1, cần decode sang utf-8 để hỗ trợ tiếng Việt
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        messageData.fileUrl = `/uploads/${req.file.filename}`;
        messageData.fileName = originalName;
        messageData.fileSize = req.file.size;
        messageData.type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
      }

      const message = await Message.create(messageData);

      // Cập nhật tin nhắn cuối của conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = message.createdAt;
      
      // DO NOT remove from deletedBy when message arrives
      // Keep deletedAt timestamp so getMessages can filter old messages
      // Conversation will show up again due to new lastMessage, but messages will be filtered
      
      await conversation.save();

      // Điền thông tin người gửi
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

      // Xác thực user là thành viên
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

      // Check if user deleted this conversation - only show messages after deletion
      const deletedInfo = conversation.deletedBy.find(item => {
        // Handle both old format (ObjectId) and new format ({ user, deletedAt })
        const itemUserId = item.user ? item.user.toString() : item.toString();
        return itemUserId === userId.toString();
      });
      
      const query = {
        conversation: conversationId
      };
      
      // If user deleted conversation, only show messages after deletedAt timestamp
      if (deletedInfo && deletedInfo.deletedAt) {
        query.createdAt = { $gt: deletedInfo.deletedAt };
      }

      const messages = await Message.find(query)
        .populate('sender', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Filter out blocked messages that user didn't send
      // Blocked messages should only be visible to the sender
      const filteredMessages = messages.filter(msg => {
        // If message is not blocked, show it
        if (!msg.isBlocked) return true;
        
        // If message is blocked, only show to sender
        const senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
        return senderId === userId.toString();
      });

      // Count with same query filter (don't count blocked messages user didn't send)
      const allMessages = await Message.find(query);
      const visibleCount = allMessages.filter(msg => {
        if (!msg.isBlocked) return true;
        const senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
        return senderId === userId.toString();
      }).length;

      res.json({
        success: true,
        data: filteredMessages.reverse(),
        pagination: {
          total: visibleCount,
          page: parseInt(page),
          pages: Math.ceil(visibleCount / limit)
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

      // Kiểm tra đã được đọc bởi user này chưa
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

  async editMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Content cannot be empty'
        });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Chỉ người gửi mới có thể sửa
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own messages'
        });
      }

      // Chỉ có thể sửa text messages
      if (message.type !== 'text') {
        return res.status(400).json({
          success: false,
          message: 'Only text messages can be edited'
        });
      }

      // Chỉ có thể sửa trong 15 phút
      const messageAge = Date.now() - message.createdAt.getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      if (messageAge > fifteenMinutes) {
        return res.status(400).json({
          success: false,
          message: 'Cannot edit message older than 15 minutes'
        });
      }

      message.content = content.trim();
      message.editedAt = Date.now();
      message.isEdited = true;
      await message.save();

      await message.populate('sender', 'username fullName avatar');

      // Emit socket event for real-time update
      const io = this.getIO();
      if (io && message.conversation) {
        io.to(`conversation:${message.conversation}`).emit('message-edited', {
          _id: message._id,
          conversation: message.conversation,
          content: message.content,
          editedAt: message.editedAt,
          isEdited: message.isEdited
        });
      }

      res.json({
        success: true,
        message: 'Message edited successfully',
        data: message
      });
    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to edit message',
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

      // Chỉ người gửi mới có thể xoá
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages'
        });
      }

      message.isDeleted = true;
      message.deletedAt = Date.now();
      await message.save();

      // Emit socket event for real-time update
      const io = this.getIO();
      if (io && message.conversation) {
        io.to(`conversation:${message.conversation}`).emit('message-deleted', {
          _id: message._id,
          conversation: message.conversation,
          isDeleted: message.isDeleted,
          deletedAt: message.deletedAt
        });
      }

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
