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
      typingUsers: [],
      onlineUsers: [], // Lưu online users trong state để trigger re-render
      unreadCounts: {} // Track unread messages per conversation
    };

    // Flag để prevent duplicate setup
    this.listenersSetup = false;
  }

  componentDidMount() {
    console.log('🎬 ChatProvider MOUNTED');
    // Chỉ load data nếu đã đăng nhập (có token)
    const token = localStorage.getItem('token');
    if (token) {
      this.loadConversations();
      this.loadFriends();
      this.loadFriendRequests();
      
      // Setup listeners - CHỈ 1 LẦN
      this.setupSocketListeners();
      
      // Setup reconnect listener để re-setup listeners khi socket reconnect
      this.setupReconnectListener();
      
      // Sync online users từ SocketContext
      this.syncOnlineUsers();
    }
  }

  setupReconnectListener = () => {
    const { socketService } = this.context;
    if (socketService && socketService.socket) {
      // Listen for reconnect event
      socketService.socket.on('connect', () => {
        console.log('🔄 Socket reconnected - re-setting up ChatContext listeners');
        // Reset flag để cho phép setup lại
        this.listenersSetup = false;
        // Re-setup listeners
        this.setupSocketListeners();
      });
    }
  };

  componentDidUpdate(prevProps, prevState) {
    // Sync online users từ SocketContext khi nó thay đổi
    this.syncOnlineUsers();
  }

  syncOnlineUsers = () => {
    if (this.context && this.context.onlineUsers) {
      const newOnlineUsers = this.context.onlineUsers;
      const currentOnlineUsers = this.state.onlineUsers;
      
      // So sánh và cập nhật nếu khác nhau
      if (JSON.stringify(newOnlineUsers) !== JSON.stringify(currentOnlineUsers)) {
        console.log('🔄 Syncing online users:', newOnlineUsers);
        this.setState({ onlineUsers: newOnlineUsers });
      }
    }
  }

  componentWillUnmount() {
    this.removeSocketListeners();
    
    // Remove reconnect listener
    const { socketService } = this.context;
    if (socketService && socketService.socket) {
      socketService.socket.off('connect');
    }
  }

  setupSocketListeners = () => {
    const { socketService } = this.context;

    if (!socketService || !socketService.socket) {
      console.error('❌ SocketService or socket not available in setupSocketListeners');
      // Retry after a delay if needed
      if (!this.listenerSetupRetryCount || this.listenerSetupRetryCount < 5) {
        this.listenerSetupRetryCount = (this.listenerSetupRetryCount || 0) + 1;
        console.log(`⏳ Retrying setupSocketListeners (${this.listenerSetupRetryCount}/5)...`);
        setTimeout(() => this.setupSocketListeners(), 500);
      }
      return;
    }

    // CRITICAL: Prevent duplicate setup
    if (this.listenersSetup) {
      console.warn('⚠️ Listeners already setup - skipping to prevent duplicates');
      return;
    }

    console.log('✅ Setting up ChatContext socket listeners');
    this.listenerSetupRetryCount = 0;

    // Remove existing listeners first to prevent duplicates
    this.removeSocketListeners();

    // Sử dụng direct socket với bound methods
    socketService.socket.on('user-offline', this.handleUserOffline);
    socketService.socket.on('user-online', this.handleUserOnline);
    socketService.socket.on('receive-message', this.handleReceiveMessage);
    socketService.socket.on('user-typing', this.handleUserTyping);
    socketService.socket.on('user-stop-typing', this.handleUserStopTyping);
    socketService.socket.on('new-conversation', this.handleNewConversation);

    // Mark as setup
    this.listenersSetup = true;

    console.log('✅ All ChatContext socket listeners registered');
    console.log('📊 Listener count check:', {
      receiveMessage: socketService.socket.listeners('receive-message').length
    });
  };

  // Handler methods
  handleUserOffline = (data) => {
    console.log('❌ ChatContext received user-offline:', {
      userId: data.userId,
      lastSeen: data.lastSeen,
      lastSeenDate: data.lastSeen ? new Date(data.lastSeen).toLocaleString() : 'null'
    });
    
    this.setState(prevState => {
      // Cập nhật BOTH isOnline và lastSeen trong currentConversation
      let updatedConversation = prevState.currentConversation;
      if (updatedConversation?.participants) {
        const oldParticipant = updatedConversation.participants.find(p => p._id === data.userId);
        console.log('🔄 Updating participant in currentConversation:', {
          participantId: data.userId,
          oldIsOnline: oldParticipant?.isOnline,
          oldLastSeen: oldParticipant?.lastSeen,
          newIsOnline: false,
          newLastSeen: data.lastSeen
        });
        
        updatedConversation = {
          ...updatedConversation,
          participants: updatedConversation.participants.map(p =>
            p._id === data.userId 
              ? { ...p, isOnline: false, lastSeen: data.lastSeen || new Date() } 
              : p
          )
        };
      }
      
      // Cập nhật BOTH isOnline và lastSeen trong danh sách conversations
      const updatedConversations = prevState.conversations.map(conv => ({
        ...conv,
        participants: conv.participants?.map(p =>
          p._id === data.userId 
            ? { ...p, isOnline: false, lastSeen: data.lastSeen || new Date() } 
            : p
        )
      }));
      
      console.log('✅ Updated currentConversation with offline status:', updatedConversation);
      
      return { 
        currentConversation: updatedConversation,
        conversations: updatedConversations
      };
    });
  };

  handleUserOnline = (data) => {
    console.log('✅ ChatContext received user-online:', data.userId);
    this.setState(prevState => {
      // Cập nhật BOTH isOnline và lastSeen trong currentConversation
      let updatedConversation = prevState.currentConversation;
      if (updatedConversation?.participants) {
        updatedConversation = {
          ...updatedConversation,
          participants: updatedConversation.participants.map(p =>
            p._id === data.userId ? { ...p, isOnline: true, lastSeen: null } : p
          )
        };
      }
      
      // Cập nhật BOTH isOnline và lastSeen trong danh sách conversations
      const updatedConversations = prevState.conversations.map(conv => ({
        ...conv,
        participants: conv.participants?.map(p =>
          p._id === data.userId ? { ...p, isOnline: true, lastSeen: null } : p
        )
      }));
      
      console.log('✅ Updated currentConversation with online status');
      
      return { 
        currentConversation: updatedConversation,
        conversations: updatedConversations
      };
    });
  };

  handleReceiveMessage = (message) => {
    console.log('📩 ChatContext handleReceiveMessage called');
    console.log('📊 Current listener count check - this should only appear ONCE per message');
    this.handleNewMessage(message);
  };

  handleUserTyping = (data) => {
    this.setState(prevState => ({
      typingUsers: [...prevState.typingUsers, data.userId]
    }));
  };

  handleUserStopTyping = (data) => {
    this.setState(prevState => ({
      typingUsers: prevState.typingUsers.filter(id => id !== data.userId)
    }));
  };

  handleNewConversation = (conversation) => {
    console.log('🆕 Received new-conversation:', conversation);
    
    // Thêm conversation vào danh sách nếu chưa có
    this.setState(prevState => {
      const exists = prevState.conversations.some(conv => conv._id === conversation._id);
      if (!exists) {
        return {
          conversations: [conversation, ...prevState.conversations]
        };
      }
      return prevState;
    });

    // Auto-join vào conversation room
    const { socketService } = this.context;
    if (socketService && socketService.joinConversation) {
      socketService.joinConversation(conversation._id);
    }
  };

  removeSocketListeners = () => {
    const { socketService } = this.context;
    if (!socketService || !socketService.socket) {
      return;
    }

    console.log('🧹 Removing ChatContext socket listeners');

    // Remove với exact callback references
    socketService.socket.off('user-offline', this.handleUserOffline);
    socketService.socket.off('user-online', this.handleUserOnline);
    socketService.socket.off('receive-message', this.handleReceiveMessage);
    socketService.socket.off('user-typing', this.handleUserTyping);
    socketService.socket.off('user-stop-typing', this.handleUserStopTyping);
    socketService.socket.off('new-conversation', this.handleNewConversation);

    // Reset flag
    this.listenersSetup = false;
  };

  loadConversations = async () => {
    try {
      this.setState({ loading: true });
      const response = await api.getConversations();
      
      if (response.success) {
        this.setState({ conversations: response.data, loading: false });
        
        // Auto-open conversation nếu có openConversationId trong localStorage
        const openConversationId = localStorage.getItem('openConversationId');
        if (openConversationId) {
          let conversation = response.data.find(conv => conv._id === openConversationId);
          
          // Nếu không tìm thấy (conversation mới tạo), reload lại một lần nữa
          if (!conversation) {
            console.log('🔄 Conversation not found, reloading...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Đợi 500ms
            const retryResponse = await api.getConversations();
            if (retryResponse.success) {
              this.setState({ conversations: retryResponse.data });
              conversation = retryResponse.data.find(conv => conv._id === openConversationId);
            }
          }
          
          if (conversation) {
            // Tự động select conversation
            setTimeout(() => {
              this.selectConversation(conversation);
            }, 100);
          }
          // Xóa flag sau khi đã xử lý
          localStorage.removeItem('openConversationId');
        }
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
      // Set conversation ngay lập tức, không hiển thị loading
      this.setState({ 
        currentConversation: conversation,
        messages: [] // Clear messages cũ ngay lập tức
      });

      // Reset unread count ngay khi chọn
      this.setState(prevState => {
        const currentUnreadCounts = prevState.unreadCounts || {};
        return {
          unreadCounts: {
            ...currentUnreadCounts,
            [conversation._id]: 0
          }
        };
      });

      // Load messages trong background
      const response = await api.getMessages(conversation._id);
      
      if (response.success) {
        this.setState({ messages: response.data });
      }

      const { socketService } = this.context;
      if (socketService && socketService.joinConversation) {
        socketService.joinConversation(conversation._id);
      }
    } catch (error) {
      console.error('Select conversation error:', error);
      this.setState({ error: error.message });
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
        // Lấy recipientId trước khi gửi
        const currentUserId = localStorage.getItem('userId');
        const recipientId = currentConversation.participants.find(
          p => p._id !== currentUserId
        )?._id;
        
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
        const currentUserId = localStorage.getItem('userId');
        const recipientId = currentConversation.participants.find(
          p => p._id !== currentUserId
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
    // Lấy userId trực tiếp (giờ đã được lưu riêng trong AuthContext)
    const currentUserId = localStorage.getItem('userId');
    
    console.log('📨 ChatContext handleNewMessage:', {
      messageId: message._id,
      messageConversation: message.conversation,
      currentConversationId: this.state.currentConversation?._id,
      messageSender: typeof message.sender === 'object' ? message.sender._id : message.sender,
      currentUserId: currentUserId
    });

    // CRITICAL: Bỏ qua tin nhắn từ chính mình (đã được thêm vào state khi sendMessage)
    const messageSenderId = typeof message.sender === 'object' 
      ? message.sender._id?.toString() 
      : message.sender?.toString();
    
    if (messageSenderId === currentUserId?.toString()) {
      console.log('⏭️ Skipping own message - already added in sendMessage');
      this.loadConversations(); // Cập nhật danh sách conversations cho lastMessage
      return;
    }

    const { currentConversation } = this.state;

    // Convert both to string for comparison
    const messageConvId = typeof message.conversation === 'object' 
      ? message.conversation._id?.toString() 
      : message.conversation?.toString();
    const currentConvId = currentConversation?._id?.toString();

    console.log('🔍 Comparing conversation IDs:', {
      messageConvId,
      currentConvId,
      matches: messageConvId === currentConvId,
      isOwnMessage: false
    });

    if (currentConversation && messageConvId === currentConvId) {
      console.log('✅ Message from other user - adding to messages');
      this.setState(prevState => ({
        messages: [...prevState.messages, message]
      }));
    } else {
      console.log('⚠️ Message NOT for current conversation or no conversation selected');
      // Tăng unread count cho conversation khác
      this.setState(prevState => {
        // Đảm bảo unreadCounts tồn tại
        const currentUnreadCounts = prevState.unreadCounts || {};
        return {
          unreadCounts: {
            ...currentUnreadCounts,
            [messageConvId]: (currentUnreadCounts[messageConvId] || 0) + 1
          }
        };
      });
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
    // Đảm bảo unreadCounts luôn là object
    const safeUnreadCounts = this.state.unreadCounts || {};
    
    // Sử dụng onlineUsers từ state (đã được sync từ SocketContext)
    const contextValue = {
      ...this.state,
      onlineUsers: new Set(this.state.onlineUsers || []),
      unreadCounts: safeUnreadCounts,
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
