import React, { Component, createContext } from 'react';
import SocketService from '../services/socket.js';
import { AuthContext } from './AuthContext.jsx';

export const SocketContext = createContext();

export class SocketProvider extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.socketService = new SocketService();
    
    this.state = {
      connected: false,
      onlineUsers: [],
      currentToken: null
    };

    // Flag to prevent duplicate connection
    this.socketConnected = false;
  }

  componentDidMount() {
    const token = this.context?.token || localStorage.getItem('token');
    if (token) {
      this.setState({ currentToken: token });
      this.connectSocket(token);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const token = this.context?.token || localStorage.getItem('token');
    const prevToken = prevState.currentToken;
    
    // Kết nối khi token trở nên khả dụng
    if (token && !prevToken) {
      this.setState({ currentToken: token });
      this.connectSocket(token);
    }
    
    // Ngắt kết nối khi token bị xóa
    if (!token && prevToken) {
      this.setState({ currentToken: null });
      this.disconnectSocket();
    }
  }

  componentWillUnmount() {
    this.disconnectSocket();
  }

  connectSocket = (token) => {
    if (!token) return;

    // CRITICAL: Prevent duplicate connection
    if (this.socketConnected) {
      console.warn('⚠️ Socket already connected - skipping duplicate connection');
      return;
    }

    console.log('🔌 SocketContext: Connecting socket...');
    this.socketService.connect(token);

    // Cài đặt listener online-users TRƯỚC KHI connection hoàn tất
    this.socketService.on('online-users', (data) => {
      console.log('📋 SocketContext received online users:', data.userIds);
      this.setState({ onlineUsers: data.userIds || [] });
    });

    this.socketService.on('connect', () => {
      console.log('✅ SocketContext: Socket connected');
      this.setState({ connected: true });
    });

    this.socketService.on('disconnect', () => {
      this.setState({ connected: false });
      this.socketConnected = false; // Reset flag on disconnect
    });

    this.socketService.onUserOnline((data) => {
      console.log('✅ User came online:', data.userId);
      this.setState(prevState => {
        if (!prevState.onlineUsers.includes(data.userId)) {
          return { onlineUsers: [...prevState.onlineUsers, data.userId] };
        }
        return null;
      });
    });

    this.socketService.onUserOffline((data) => {
      console.log('❌ User went offline:', data.userId);
      this.setState(prevState => ({
        onlineUsers: prevState.onlineUsers.filter(id => id !== data.userId)
      }));
      // Không xử lý lastSeen ở đây - để ChatContext xử lý
    });

    // Mark as connected
    this.socketConnected = true;
    console.log('✅ SocketContext: All listeners registered');
  };

  disconnectSocket = () => {
    this.socketService.disconnect();
    this.setState({ connected: false, onlineUsers: [] });
    this.socketConnected = false;
  };

  emit = (event, data) => {
    this.socketService.emit(event, data);
  };

  on = (event, callback) => {
    this.socketService.on(event, callback);
  };

  off = (event, callback) => {
    this.socketService.off(event, callback);
  };

  render() {
    const contextValue = {
      connected: this.state.connected,
      onlineUsers: this.state.onlineUsers,
      socket: this.socketService.getSocket(),
      emit: this.emit,
      on: this.on,
      off: this.off,
      socketService: this.socketService
    };

    return (
      <SocketContext.Provider value={contextValue}>
        {this.props.children}
      </SocketContext.Provider>
    );
  }
}
