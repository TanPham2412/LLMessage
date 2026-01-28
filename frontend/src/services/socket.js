import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    if (this.socket && this.connected) {
      return this.socket;
    }

    const socketURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(socketURL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Chat specific methods
  sendMessage(data) {
    console.log('📤 SocketService sending message:', {
      messageId: data._id,
      recipientId: data.recipientId,
      conversationId: data.conversation,
      content: data.content?.substring(0, 50)
    });
    this.emit('send-message', data);
  }

  joinConversation(conversationId) {
    console.log('🚪 SocketService joining conversation:', conversationId);
    this.emit('join-conversation', conversationId);
  }

  leaveConversation(conversationId) {
    console.log('🚪 SocketService leaving conversation:', conversationId);
    this.emit('leave-conversation', conversationId);
  }

  typing(data) {
    this.emit('typing', data);
  }

  stopTyping(data) {
    this.emit('stop-typing', data);
  }

  onReceiveMessage(callback) {
    this.on('receive-message', (message) => {
      console.log('📩 SocketService received message:', {
        messageId: message._id,
        sender: message.sender,
        conversationId: message.conversation,
        content: message.content?.substring(0, 50)
      });
      callback(message);
    });
  }

  onUserOnline(callback) {
    this.on('user-online', callback);
  }

  onUserOffline(callback) {
    this.on('user-offline', callback);
  }

  onUserTyping(callback) {
    this.on('user-typing', callback);
  }

  onUserStopTyping(callback) {
    this.on('user-stop-typing', callback);
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.connected;
  }
}

export default SocketService;
