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
      unreadCounts: {}, // Track unread messages per conversation
      conversationDeletedAt: null, // Track deletion timestamp for current conversation
      blockedUsers: [], // Shared blocked users list
      restrictedUsers: [], // Shared restricted users list
      incomingTheme: null, // Theme được nhận từ socket (người kia thay đổi chủ đề)
      currentConversationNicknames: [], // Biệt danh cho cuộc trò chuyện hiện tại
    };

    // Flag để prevent duplicate setup
    this.listenersSetup = false;

    // Track previous socket connected state để phát hiện reconnect
    this.prevConnected = false;
  }

  componentDidMount() {
    console.log('🎬 ChatProvider MOUNTED');

    const token = localStorage.getItem('token');
    if (token) {
      this.loadConversations();
      this.loadFriends();
      this.loadFriendRequests();
      this.loadBlockedAndRestricted();
      
      // Setup listeners
      this.setupSocketListeners();
      
      // Sync online users từ SocketContext
      this.syncOnlineUsers();
    }

    // Đặt prevConnected = true SAU KHI setup xong để tránh componentDidUpdate
    // kích hoạt lần nữa khi socket fires 'connect' event lần đầu tiên (asynchronous).
    // Luồng logout/login sẽ khiến connected đi từ false → true và trigger đúng.
    this.prevConnected = true;
  }

  componentDidUpdate(prevProps, prevState) {
    // Sync online users từ SocketContext khi nó thay đổi
    this.syncOnlineUsers();

    // Phát hiện khi socket kết nối hoặc kết nối lại (connected đổi từ false → true)
    // Điều này xảy ra sau logout/login hoặc mất mạng/kết nối lại
    const currentConnected = this.context?.connected;
    if (currentConnected && !this.prevConnected) {
      console.log('🔄 ChatContext: Socket connected/reconnected - re-setup listeners & reload data');
      // Reset flag để cho phép setup lại listeners
      this.listenersSetup = false;
      this.setupSocketListeners();

      // Reload lại dữ liệu sau khi kết nối (cần thiết sau logout/login)
      const token = localStorage.getItem('token');
      if (token) {
        this.loadConversations();
        this.loadFriends();
        this.loadFriendRequests();
        this.loadBlockedAndRestricted();
      }
    }
    this.prevConnected = currentConnected;
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
  }

  setupSocketListeners = () => {
    const { socketService, socket } = this.context;

    // Check if socket service is available
    if (!socketService) {
      console.warn('⏳ SocketService not available yet, retrying in 500ms...');
      if (!this.listenerSetupRetryCount || this.listenerSetupRetryCount < 5) {
        this.listenerSetupRetryCount = (this.listenerSetupRetryCount || 0) + 1;
        setTimeout(() => this.setupSocketListeners(), 500);
      }
      return;
    }

    // Use the socket instance directly from context
    const socketInstance = socket || socketService.socket;
    if (!socketInstance) {
      console.warn('⏳ Socket instance not ready yet, retrying in 500ms...');
      if (!this.listenerSetupRetryCount || this.listenerSetupRetryCount < 3) {
        this.listenerSetupRetryCount = (this.listenerSetupRetryCount || 0) + 1;
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

    // Register listeners on the socket instance
    socketInstance.on('user-offline', this.handleUserOffline);
    socketInstance.on('user-online', this.handleUserOnline);
    socketInstance.on('receive-message', this.handleReceiveMessage);
    socketInstance.on('user-typing', this.handleUserTyping);
    socketInstance.on('user-stop-typing', this.handleUserStopTyping);
    socketInstance.on('new-conversation', this.handleNewConversation);
    socketInstance.on('theme-received', this.handleThemeReceived);
    socketInstance.on('message-edited', this.handleMessageEdited);
    socketInstance.on('message-deleted', this.handleMessageDeleted);
    socketInstance.on('message-pinned', this.handleMessagePinned);

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

  handleThemeReceived = (data) => {
    this.setState({ incomingTheme: data });
  };

  handleMessageEdited = (data) => {
    console.log('✏️ ChatContext received message-edited:', {
      messageId: data._id,
      newContent: data.content?.substring(0, 50)
    });

    this.setState(prevState => {
      // Update messages array with edited message
      const updatedMessages = prevState.messages.map(msg =>
        msg._id === data._id
          ? {
              ...msg,
              content: data.content,
              editedAt: data.editedAt,
              isEdited: data.isEdited
            }
          : msg
      );

      // Update conversations array - if this message is the lastMessage
      const updatedConversations = prevState.conversations.map(conv => {
        if (conv.lastMessage?._id === data._id || conv.lastMessage === data._id) {
          return {
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              content: data.content,
              editedAt: data.editedAt,
              isEdited: data.isEdited
            }
          };
        }
        return conv;
      });

      // Update currentConversation's lastMessage if applicable
      let updatedCurrentConversation = prevState.currentConversation;
      if (updatedCurrentConversation?.lastMessage?._id === data._id || updatedCurrentConversation?.lastMessage === data._id) {
        updatedCurrentConversation = {
          ...updatedCurrentConversation,
          lastMessage: {
            ...updatedCurrentConversation.lastMessage,
            content: data.content,
            editedAt: data.editedAt,
            isEdited: data.isEdited
          }
        };
      }

      return {
        messages: updatedMessages,
        conversations: updatedConversations,
        currentConversation: updatedCurrentConversation
      };
    });
  };

  handleMessageDeleted = (data) => {
    console.log('🗑️ ChatContext received message-deleted:', {
      messageId: data._id
    });

    this.setState(prevState => {
      // Update messages array with deleted message
      const updatedMessages = prevState.messages.map(msg =>
        msg._id === data._id
          ? {
              ...msg,
              isDeleted: data.isDeleted,
              deletedAt: data.deletedAt
            }
          : msg
      );

      // Update conversations array - if this message is the lastMessage
      const updatedConversations = prevState.conversations.map(conv => {
        if (conv.lastMessage?._id === data._id || conv.lastMessage === data._id) {
          return {
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              isDeleted: data.isDeleted,
              deletedAt: data.deletedAt
            }
          };
        }
        return conv;
      });

      // Update currentConversation's lastMessage if applicable
      let updatedCurrentConversation = prevState.currentConversation;
      if (updatedCurrentConversation?.lastMessage?._id === data._id || updatedCurrentConversation?.lastMessage === data._id) {
        updatedCurrentConversation = {
          ...updatedCurrentConversation,
          lastMessage: {
            ...updatedCurrentConversation.lastMessage,
            isDeleted: data.isDeleted,
            deletedAt: data.deletedAt
          }
        };
      }

      return {
        messages: updatedMessages,
        conversations: updatedConversations,
        currentConversation: updatedCurrentConversation
      };
    });
  };

  handleMessagePinned = (data) => {
    // Notify ChatWindow to refresh pinned IDs via a state flag
    this.setState(prevState => ({
      messagePinnedEvent: data // ChatWindow can watch this
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
    socketService.socket.off('theme-received', this.handleThemeReceived);
    socketService.socket.off('message-edited', this.handleMessageEdited);
    socketService.socket.off('message-deleted', this.handleMessageDeleted);
    socketService.socket.off('message-pinned', this.handleMessagePinned);

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
        messages: [], // Clear messages cũ ngay lập tức
        conversationDeletedAt: null, // Clear deletion timestamp
        currentConversationNicknames: [], // Clear nicknames cũ
      });

      // If conversation is null (cleared/deleted), just return
      if (!conversation) {
        return;
      }

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
      // Backend will filter messages based on deletedBy array
      const response = await api.getMessages(conversation._id);
      
      if (response.success) {
        this.setState({ messages: response.data });
      }

      // Load nicknames in background (non-blocking)
      this.loadCurrentNicknames(conversation._id);

      const { socketService } = this.context;
      if (socketService && socketService.joinConversation) {
        socketService.joinConversation(conversation._id);
      }
    } catch (error) {
      console.error('Select conversation error:', error);
      this.setState({ error: error.message });
    }
  };

  loadCurrentNicknames = async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await api.getNicknames(conversationId);
      const nicknames = res.data || [];
      // Build resolvedNicknames map and patch currentConversation so header updates immediately
      const currentUserId = localStorage.getItem('userId');
      const seen = new Map();
      for (const n of nicknames) {
        const tid = (n.target?._id || n.target)?.toString();
        seen.set(tid, n.nickname);
      }
      this.setState(prev => ({
        currentConversationNicknames: nicknames,
        currentConversation: prev.currentConversation?._id?.toString() === conversationId
          ? { ...prev.currentConversation, resolvedNicknames: Object.fromEntries(seen) }
          : prev.currentConversation,
        // Also patch the conversation in the list so ConversationList updates
        conversations: prev.conversations.map(c =>
          c._id?.toString() === conversationId
            ? { ...c, resolvedNicknames: Object.fromEntries(seen) }
            : c
        )
      }));
    } catch {
      // silently fail – nicknames are non-critical
    }
  };

  refreshCurrentNicknames = () => {
    const { currentConversation } = this.state;
    if (currentConversation?._id) {
      this.loadCurrentNicknames(currentConversation._id);
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

        // Cập nhật conversation trong conversations list ngay lập tức
        this.updateConversationWithNewMessage(currentConversation._id, newMessage);

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
      messageSender: typeof message.sender === 'object' ? message.sender?._id : message.sender,
      currentUserId: currentUserId
    });

    // CRITICAL: Bỏ qua tin nhắn từ chính mình (đã được thêm vào state khi sendMessage)
    const messageSenderId = typeof message.sender === 'object' 
      ? message.sender._id?.toString() 
      : message.sender?.toString();
    
    if (messageSenderId === currentUserId?.toString()) {
      console.log('⏭️ Skipping own message - already added in sendMessage');
      // Không cần loadConversations vì đã được cập nhật trong sendMessage
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

    // Cập nhật conversation với tin nhắn mới
    this.updateConversationWithNewMessage(messageConvId, message);
  };

  // Utility method to update conversation with new message
  updateConversationWithNewMessage = (conversationId, message) => {
    this.setState(prevState => {
      // Check if conversation exists in current state
      const conversationExists = prevState.conversations.some(
        conv => conv._id === conversationId
      );
      
      // If conversation doesn't exist (was deleted), reload all conversations
      if (!conversationExists) {
        console.log('🔄 Conversation not found in state - reloading conversations');
        this.loadConversations();
        return prevState; // Return unchanged state, will be updated after reload
      }
      
      const conversations = prevState.conversations.map(conv => {
        if (conv._id === conversationId) {
          return {
            ...conv,
            lastMessage: message,
            lastMessageAt: message.createdAt || new Date()
          };
        }
        return conv;
      });

      // Sort conversations by lastMessageAt (newest first)
      conversations.sort((a, b) => {
        const dateA = new Date(a.lastMessageAt || 0);
        const dateB = new Date(b.lastMessageAt || 0);
        return dateB - dateA;
      });

      return { conversations };
    });
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

  reloadMessages = async () => {
    const { currentConversation } = this.state;
    if (!currentConversation) return;
    try {
      const response = await api.getMessages(currentConversation._id);
      if (response.success) this.setState({ messages: response.data });
    } catch (e) {
      console.error('Reload messages error:', e);
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

  loadBlockedAndRestricted = async () => {
    try {
      const [blockedRes, restrictedRes] = await Promise.all([
        api.getBlockedUsers(),
        api.getRestrictedUsers(),
      ]);
      this.setState({
        blockedUsers: blockedRes.data || [],
        restrictedUsers: restrictedRes.data || [],
      });
    } catch (err) {
      console.error('Load blocked/restricted error:', err);
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
      loadBlockedAndRestricted: this.loadBlockedAndRestricted,
      selectConversation: this.selectConversation,
      sendMessage: this.sendMessage,
      createConversation: this.createConversation,
      sendFriendRequest: this.sendFriendRequest,
      acceptFriendRequest: this.acceptFriendRequest,
      rejectFriendRequest: this.rejectFriendRequest,
      socketService: this.context?.socketService,
      refreshCurrentNicknames: this.refreshCurrentNicknames,
      reloadMessages: this.reloadMessages,
    };

    return (
      <ChatContext.Provider value={contextValue}>
        {this.props.children}
      </ChatContext.Provider>
    );
  }
}
