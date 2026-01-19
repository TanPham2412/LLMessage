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

    // Broadcast online status
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

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userId}`);
      this.onlineUsers.delete(userId);
      this.io.emit('user-offline', { userId });
    });
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
