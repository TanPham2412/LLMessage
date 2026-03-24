import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map(); // Track active listeners to prevent duplicates
  }

  connect(token) {
    if (this.socket && this.connected) {
      console.log('✅ Socket already connected, skipping reconnect');
      return this.socket;
    }

    // Allow reconnection if disconnected
    if (this.socket && !this.connected) {
      console.log('🔌 Reconnecting socket...');
    }

    const socketURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    try {
      this.socket = io(socketURL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'] // Fallback to polling if websocket fails
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        this.connected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error?.message || error);
        this.connected = false;
        // Log the full error for debugging
        if (error?.data?.content) {
          console.error('Socket error details:', error.data.content);
        }
      });

      this.socket.on('error', (error) => {
        console.error('❌ Socket error event:', error);
      });

      return this.socket;
    } catch (err) {
      console.error('❌ Failed to initialize socket:', err);
      this.connected = false;
      throw err;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  emit(event, data) {
    if (!this.socket) {
      console.warn(`⚠️ Socket not initialized, cannot emit '${event}'`);
      return;
    }
    if (!this.connected) {
      console.warn(`⚠️ Socket not connected, queuing '${event}' event`);
    }
    this.socket.emit(event, data);
  }

  on(event, callback) {
    if (!this.socket) {
      console.warn(`⚠️ Socket not initialized, cannot listen for '${event}'`);
      return;
    }

    // Prevent duplicate listeners
    if (this.listeners.has(event)) {
      console.warn(`⚠️ Listener already registered for '${event}', skipping duplicate`);
      return;
    }

    this.listeners.set(event, callback);
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    this.listeners.delete(event);
    this.socket.off(event, callback);
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // Chat specific methods
  sendMessage(data) {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected, message may not be sent');
    }
    console.log('📤 SocketService sending message:', {
      messageId: data._id,
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
        conversationId: message.conversation
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

  onNotification(callback) {
    this.on('notification', callback);
  }

  onThemeReceived(callback) {
    this.on('theme-received', callback);
  }

  onFriendRequestReceived(callback) {
    this.on('friend-request-received', callback);
  }

  onFriendRequestAccepted(callback) {
    this.on('friend-request-accepted', callback);
  }

  onMessageEdited(callback) {
    this.on('message-edited', callback);
  }

  onMessageDeleted(callback) {
    this.on('message-deleted', callback);
  }
}

export default SocketService;
