const jwt = require('jsonwebtoken');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map(); // userId -> socketId
  }

  initialize() {
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  }

  handleConnection(socket) {
    const userId = socket.userId;
    const self = this; // Lưu reference đến SocketHandler
    console.log(`✅ User connected: ${userId}`);

    // Lưu user online
    this.onlineUsers.set(userId, socket.id);

    // Cập nhật trạng thái online trong database
    this.updateUserOnlineStatus(userId, true);

    // Auto-join vào tất cả conversations của user
    this.joinUserConversations(userId, socket);

    // Gửi danh sách users đang online cho user mới kết nối ngay lập tức
    const onlineUserIds = this.getOnlineUsers();
    console.log(`📤 Sending online users list to ${userId}:`, onlineUserIds);
    socket.emit('online-users', { userIds: onlineUserIds });

    // Phát trạng thái online đến tất cả users khác
    this.io.emit('user-online', { userId });

    // Tham gia vào room cá nhân của user
    socket.join(`user:${userId}`);

    // Xử lý sự kiện typing
    socket.on('typing', (data) => {
      socket.to(`user:${data.recipientId}`).emit('user-typing', {
        userId,
        conversationId: data.conversationId
      });
    });

    socket.on('stop-typing', (data) => {
      socket.to(`user:${data.recipientId}`).emit('user-stop-typing', {
        userId,
        conversationId: data.conversationId
      });
    });

    // Xử lý tin nhắn mới
    socket.on('send-message', async (data) => {
      console.log('📤 Backend received send-message:', {
        from: userId,
        to: data.recipientId,
        messageId: data._id,
        conversationId: data.conversation,
        content: data.content?.substring(0, 50)
      });
      
      // CHỈ gửi đến conversation room để tránh duplicate
      if (data.conversation) {
        // Check xem đây có phải tin nhắn đầu tiên không bằng cách đếm messages
        const Message = require('../models/Message');
        const Conversation = require('../models/Conversation');
        
        const messageCount = await Message.countDocuments({
          conversation: data.conversation,
          isDeleted: false
        });
        
        console.log(`📊 Message count in conversation ${data.conversation}: ${messageCount}`);
        
        // Nếu đây là tin nhắn đầu tiên (count = 1, vì message vừa được tạo)
        if (messageCount === 1 && data.recipientId) {
          // Load full conversation data để gửi đầy đủ thông tin
          const conversation = await Conversation.findById(data.conversation)
            .populate('participants', 'username fullName avatar isOnline lastSeen')
            .populate('lastMessage');
          
          if (conversation) {
            // CRITICAL: Join recipient vào conversation room TRƯỚC KHI emit
            self.joinUserToConversation(data.recipientId, data.conversation);
            
            console.log(`🆕 Sending new-conversation to user:${data.recipientId}`, {
              conversationId: conversation._id,
              participants: conversation.participants.map(p => p.username)
            });
            
            // Emit new-conversation trước
            self.sendNotificationToUser(data.recipientId, 'new-conversation', conversation);
          }
        }
        
        // Emit receive-message SAU KHI đã join recipient (nếu cần)
        socket.to(`conversation:${data.conversation}`).emit('receive-message', data);
        console.log(`✅ Emitted receive-message to conversation:${data.conversation}`);
      }
    });

    // Xử lý tham gia cuộc trò chuyện
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Xử lý rời khỏi cuộc trò chuyện
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Xử lý yêu cầu lấy danh sách users online
    socket.on('request-online-users', () => {
      console.log(`📊 User ${userId} requested online users list`);
      socket.emit('online-users', { userIds: this.getOnlineUsers() });
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${userId}`);
      this.onlineUsers.delete(userId);
      
      // Cập nhật lastSeen trong database và lấy timestamp
      const lastSeen = new Date();
      await this.updateUserOnlineStatus(userId, false, lastSeen);
      
      this.io.emit('user-offline', { userId, lastSeen });
    });
  }

  async updateUserOnlineStatus(userId, isOnline, lastSeen = new Date()) {
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: isOnline ? null : lastSeen
      });
      console.log(`📝 Updated user ${userId}: isOnline=${isOnline}, lastSeen=${isOnline ? 'null' : lastSeen}`);
    } catch (error) {
      console.error('Update user online status error:', error);
    }
  }

  // Auto-join user vào tất cả conversations của họ
  async joinUserConversations(userId, socket) {
    try {
      const Conversation = require('../models/Conversation');
      const conversations = await Conversation.find({
        participants: userId
      }).select('_id');

      conversations.forEach(conv => {
        socket.join(`conversation:${conv._id}`);
        console.log(`✅ User ${userId} auto-joined conversation:${conv._id}`);
      });

      console.log(`📊 User ${userId} joined ${conversations.length} conversations`);
    } catch (error) {
      console.error('Join user conversations error:', error);
    }
  }

  // Phương thức hỗ trợ gửi thông báo
  sendNotificationToUser(userId, event, data) {
    console.log(`🔔 Emitting ${event} to room: user:${userId}`);
    console.log(`   Data:`, JSON.stringify(data, null, 2));
    this.io.to(`user:${userId}`).emit(event, data);
  }

  emitToUser(userId, event, data) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Join user vào conversation room
  joinUserToConversation(userId, conversationId) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`conversation:${conversationId}`);
        console.log(`✅ User ${userId} joined conversation:${conversationId}`);
      }
    }
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }
}

module.exports = SocketHandler;
