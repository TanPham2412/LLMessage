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

    // Store online user
    this.onlineUsers.set(userId, socket.id);

    // Update user online status in database
    this.updateUserOnlineStatus(userId, true);

    // Send current online users to the newly connected user immediately
    const onlineUserIds = this.getOnlineUsers();
    console.log(`📤 Sending online users list to ${userId}:`, onlineUserIds);
    socket.emit('online-users', { userIds: onlineUserIds });

    // Broadcast online status to all other users
    this.io.emit('user-online', { userId });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle typing
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

    // Handle new message
    socket.on('send-message', (data) => {
      // Emit to recipient
      socket.to(`user:${data.recipientId}`).emit('receive-message', data);
    });

    // Handle join conversation
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Handle leave conversation
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Handle request for online users list
    socket.on('request-online-users', () => {
      console.log(`📊 User ${userId} requested online users list`);
      socket.emit('online-users', { userIds: this.getOnlineUsers() });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${userId}`);
      this.onlineUsers.delete(userId);
      
      // Update lastSeen in database and get the timestamp
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

  // Helper method to send notifications
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
