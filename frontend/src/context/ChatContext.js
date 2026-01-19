import React, { Component, createContext } from 'react';
import api from '../services/api';
import { SocketContext } from './SocketContext';

export const ChatContext = createContext();

export class ChatProvider extends Component {
  static contextType = SocketContext;

  constructor(props) {
    super(props);
    
    this.state = {
      conversations: [],
      currentConversation: null,
      messages: [],
      friends: [],
      friendRequests: [],
      loading: false,
      error: null,
      typingUsers: []
    };
  }

  componentDidMount() {
    // Chỉ load data nếu đã đăng nhập (có token)
    const token = localStorage.getItem('token');
    if (token) {
      this.loadConversations();
      this.loadFriends();
      this.loadFriendRequests();
      this.setupSocketListeners();
    }
  }

  componentWillUnmount() {
    this.removeSocketListeners();
  }

  setupSocketListeners = () => {
    const { socketService } = this.context;

    socketService.onReceiveMessage((message) => {
      this.handleNewMessage(message);
    });

    socketService.onUserTyping((data) => {
      this.setState(prevState => ({
        typingUsers: [...prevState.typingUsers, data.userId]
      }));
    });

    socketService.onUserStopTyping((data) => {
      this.setState(prevState => ({
        typingUsers: prevState.typingUsers.filter(id => id !== data.userId)
      }));
    });
  };

  removeSocketListeners = () => {
    const { socketService } = this.context;
    socketService.off('receive-message');
    socketService.off('user-typing');
    socketService.off('user-stop-typing');
  };

  loadConversations = async () => {
    try {
      this.setState({ loading: true });
      const response = await api.getConversations();
      
      if (response.success) {
        this.setState({ conversations: response.data, loading: false });
      }
    } catch (error) {
      console.error('Load conversations error:', error);
      this.setState({ loading: false, error: error.message });
    }
  };

  loadFriends = async () => {
    try {
      const response = await api.getFriends();
      
      if (response.success) {
        this.setState({ friends: response.data });
      }
    } catch (error) {
      console.error('Load friends error:', error);
    }
  };

  loadFriendRequests = async () => {
    try {
      const response = await api.getFriendRequests();
      
      if (response.success) {
        this.setState({ friendRequests: response.data });
      }
    } catch (error) {
      console.error('Load friend requests error:', error);
    }
  };

  selectConversation = async (conversation) => {
    try {
      this.setState({ currentConversation: conversation, loading: true });

      const response = await api.getMessages(conversation._id);
      
      if (response.success) {
        this.setState({ messages: response.data, loading: false });
      }

      const { socketService } = this.context;
      socketService.joinConversation(conversation._id);
    } catch (error) {
      console.error('Select conversation error:', error);
      this.setState({ loading: false, error: error.message });
    }
  };

  sendMessage = async (content, type = 'text', file = null) => {
    try {
      const { currentConversation } = this.state;
      
      if (!currentConversation) return;

      let response;

      if (file) {
        const formData = new FormData();
        formData.append('conversationId', currentConversation._id);
        formData.append('content', content);
        formData.append('type', type);
        formData.append('file', file);

        response = await api.sendMessageWithFile(formData);
      } else {
        response = await api.sendMessage({
          conversationId: currentConversation._id,
          content,
          type
        });
      }

      if (response.success) {
        const newMessage = response.data;
        this.setState(prevState => ({
          messages: [...prevState.messages, newMessage]
        }));

        // Emit via socket
        const { socketService } = this.context;
        const recipientId = currentConversation.participants.find(
          p => p._id !== localStorage.getItem('userId')
        )?._id;

        if (recipientId) {
          socketService.sendMessage({
            ...newMessage,
            recipientId
          });
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      this.setState({ error: error.message });
    }
  };

  handleNewMessage = (message) => {
    const { currentConversation } = this.state;

    if (currentConversation && message.conversation === currentConversation._id) {
      this.setState(prevState => ({
        messages: [...prevState.messages, message]
      }));
    }

    this.loadConversations();
  };

  createConversation = async (participantId) => {
    try {
      const response = await api.createConversation(participantId);
      
      if (response.success) {
        await this.loadConversations();
        return response.data;
      }
    } catch (error) {
      console.error('Create conversation error:', error);
      throw error;
    }
  };

  sendFriendRequest = async (recipientId) => {
    try {
      const response = await api.sendFriendRequest(recipientId);
      return response;
    } catch (error) {
      console.error('Send friend request error:', error);
      throw error;
    }
  };

  acceptFriendRequest = async (requestId) => {
    try {
      const response = await api.acceptFriendRequest(requestId);
      
      if (response.success) {
        await this.loadFriendRequests();
        await this.loadFriends();
        await this.loadConversations();
      }
      
      return response;
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  };

  rejectFriendRequest = async (requestId) => {
    try {
      const response = await api.rejectFriendRequest(requestId);
      
      if (response.success) {
        await this.loadFriendRequests();
      }
      
      return response;
    } catch (error) {
      console.error('Reject friend request error:', error);
      throw error;
    }
  };

  render() {
    const contextValue = {
      ...this.state,
      loadConversations: this.loadConversations,
      loadFriends: this.loadFriends,
      loadFriendRequests: this.loadFriendRequests,
      selectConversation: this.selectConversation,
      sendMessage: this.sendMessage,
      createConversation: this.createConversation,
      sendFriendRequest: this.sendFriendRequest,
      acceptFriendRequest: this.acceptFriendRequest,
      rejectFriendRequest: this.rejectFriendRequest
    };

    return (
      <ChatContext.Provider value={contextValue}>
        {this.props.children}
      </ChatContext.Provider>
    );
  }
}
