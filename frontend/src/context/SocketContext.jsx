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
    
    // Connect when token becomes available
    if (token && !prevToken) {
      this.setState({ currentToken: token });
      this.connectSocket(token);
    }
    
    // Disconnect when token is removed
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

    this.socketService.connect(token);

    this.socketService.on('connect', () => {
      this.setState({ connected: true });
    });

    this.socketService.on('disconnect', () => {
      this.setState({ connected: false });
    });

    this.socketService.onUserOnline((data) => {
      this.setState(prevState => ({
        onlineUsers: [...prevState.onlineUsers, data.userId]
      }));
    });

    this.socketService.onUserOffline((data) => {
      this.setState(prevState => ({
        onlineUsers: prevState.onlineUsers.filter(id => id !== data.userId)
      }));
    });
  };

  disconnectSocket = () => {
    this.socketService.disconnect();
    this.setState({ connected: false, onlineUsers: [] });
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
