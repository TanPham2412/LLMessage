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
    console.log(`✅ User connected: ${userId}`);

    // Lưu user online
    this.onlineUsers.set(userId, socket.id);

    // Cập nhật trạng thái online trong database
    this.updateUserOnlineStatus(userId, true);

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
    socket.on('send-message', (data) => {
      console.log('📤 Backend received send-message:', {
        from: userId,
        to: data.recipientId,
        messageId: data._id,
        conversationId: data.conversation,
        content: data.content?.substring(0, 50)
      });
      
      // Gửi đến người nhận
      socket.to(`user:${data.recipientId}`).emit('receive-message', data);
      
      console.log(`✅ Emitted receive-message to user:${data.recipientId}`);
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

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }
}

module.exports = SocketHandler;
