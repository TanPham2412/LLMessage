import React, { Component, createContext } from 'react';
import socketService from '../services/socket';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export class SocketProvider extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      connected: false,
      onlineUsers: []
    };
  }

  componentDidMount() {
    const { token } = this.context;
    if (token) {
      this.connectSocket();
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { token } = this.context;
    
    // Connect when token becomes available
    if (token && !prevProps.token) {
      this.connectSocket();
    }
    
    // Disconnect when token is removed
    if (!token && prevProps.token) {
      this.disconnectSocket();
    }
  }

  componentWillUnmount() {
    this.disconnectSocket();
  }

  connectSocket = () => {
    const { token } = this.context;
    
    if (!token) return;

    socketService.connect(token);

    socketService.on('connect', () => {
      this.setState({ connected: true });
    });

    socketService.on('disconnect', () => {
      this.setState({ connected: false });
    });

    socketService.onUserOnline((data) => {
      this.setState(prevState => ({
        onlineUsers: [...prevState.onlineUsers, data.userId]
      }));
    });

    socketService.onUserOffline((data) => {
      this.setState(prevState => ({
        onlineUsers: prevState.onlineUsers.filter(id => id !== data.userId)
      }));
    });
  };

  disconnectSocket = () => {
    socketService.disconnect();
    this.setState({ connected: false, onlineUsers: [] });
  };

  emit = (event, data) => {
    socketService.emit(event, data);
  };

  on = (event, callback) => {
    socketService.on(event, callback);
  };

  off = (event, callback) => {
    socketService.off(event, callback);
  };

  render() {
    const contextValue = {
      connected: this.state.connected,
      onlineUsers: this.state.onlineUsers,
      socket: socketService.getSocket(),
      emit: this.emit,
      on: this.on,
      off: this.off,
      socketService
    };

    return (
      <SocketContext.Provider value={contextValue}>
        {this.props.children}
      </SocketContext.Provider>
    );
  }
}
