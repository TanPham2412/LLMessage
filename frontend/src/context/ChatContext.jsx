import React, { Component, createContext } from 'react';
import api from '../services/api.js';
import { SocketContext } from './SocketContext.jsx';

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
      
      // Trì hoãn setup để đảm bảo socket đã kết nối
      setTimeout(() => {
        this.setupSocketListeners();
      }, 500);
    }
  }

  componentWillUnmount() {
    this.removeSocketListeners();
  }

  setupSocketListeners = () => {
    const { socketService } = this.context;

    if (!socketService || !socketService.socket) {
      console.error('❌ SocketService or socket not available in setupSocketListeners');
      // Retry after a delay
      setTimeout(() => this.setupSocketListeners(), 500);
      return;
    }

    console.log('✅ Setting up ChatContext socket listeners');

    // Sử dụng direct socket access cho sự kiện user-offline
    socketService.socket.on('user-offline', (data) => {
      console.log('❌ ChatContext received user-offline:', {
        userId: data.userId,
        lastSeen: data.lastSeen,
        lastSeenDate: new Date(data.lastSeen).toLocaleString()
      });
      
      this.setState(prevState => {
        // Cập nhật lastSeen trong currentConversation nếu user này là người tham gia
        let updatedConversation = prevState.currentConversation;
        if (updatedConversation?.participants) {
          const oldParticipant = updatedConversation.participants.find(p => p._id === data.userId);
          console.log('🔄 Updating participant in currentConversation:', {
            participantId: data.userId,
            oldLastSeen: oldParticipant?.lastSeen,
            newLastSeen: data.lastSeen
          });
          
          updatedConversation = {
            ...updatedConversation,
            participants: updatedConversation.participants.map(p =>
              p._id === data.userId ? { ...p, lastSeen: data.lastSeen } : p
            )
          };
        }
        
        // Cập nhật lastSeen trong danh sách conversations
        const updatedConversations = prevState.conversations.map(conv => ({
          ...conv,
          participants: conv.participants?.map(p =>
            p._id === data.userId ? { ...p, lastSeen: data.lastSeen } : p
          )
        }));
        
        console.log('✅ Updated currentConversation:', updatedConversation);
        
        return { 
          currentConversation: updatedConversation,
          conversations: updatedConversations
        };
      });
    });

    // Sử dụng direct socket access cho sự kiện user-online
    socketService.socket.on('user-online', (data) => {
      console.log('✅ ChatContext received user-online:', data.userId);
      this.setState(prevState => {
        // Cập nhật currentConversation
        let updatedConversation = prevState.currentConversation;
        if (updatedConversation?.participants) {
          updatedConversation = {
            ...updatedConversation,
            participants: updatedConversation.participants.map(p =>
              p._id === data.userId ? { ...p, lastSeen: null } : p
            )
          };
        }
        
        // Cập nhật danh sách conversations
        const updatedConversations = prevState.conversations.map(conv => ({
          ...conv,
          participants: conv.participants?.map(p =>
            p._id === data.userId ? { ...p, lastSeen: null } : p
          )
        }));
        
        return { 
          currentConversation: updatedConversation,
          conversations: updatedConversations
        };
      });
    });

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
    if (socketService?.socket) {
      socketService.socket.off('user-offline');
      socketService.socket.off('user-online');
    }
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

        // Gửi qua socket
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
    const { onlineUsers } = this.context;
    
    const contextValue = {
      ...this.state,
      onlineUsers: new Set(onlineUsers || []),
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
