import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import { getTimeAgo } from '../../utils/timeUtils';
import api from '../../services/api.js';
import ConversationInfo from './ConversationInfo.jsx';

class ChatWindow extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    
    this.state = {
      message: '',
      selectedFile: null,
      currentTime: Date.now(), // Track current time for real-time updates
      statusHidden: false, // Track if participant has hidden their status from me
      isUserNearBottom: true, // Track if user is scrolled to bottom
      prevMessagesLength: 0, // Track previous messages length for comparison
      prevConversationId: null, // Track previous conversation ID
      // showInfoPanel is now managed by parent ChatHome via props
    };

    this.messagesEndRef = React.createRef();
    this.messagesContainerRef = React.createRef();
    this.timeUpdateInterval = null;
  }

  componentDidMount() {
    // Cập nhật thời gian mỗi 10 giây cho trạng thái real-time
    this.timeUpdateInterval = setInterval(() => {
      this.setState({ currentTime: Date.now() });
    }, 10000); // Cập nhật mỗi 10 giây
    
    // Initialize conversation tracking
    const { currentConversation, messages } = this.context;
    this.setState({ 
      prevConversationId: currentConversation?._id,
      prevMessagesLength: messages?.length || 0
    });
    
    // Check status visibility for current conversation
    this.checkStatusVisibility();
  }

  componentWillUnmount() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { messages, currentConversation } = this.context;
    const currentMessagesLength = messages?.length || 0;
    const prevMessagesLength = prevState.prevMessagesLength;
    const currentConversationId = currentConversation?._id;
    const prevConversationId = prevState.prevConversationId;
    
    // Check if conversation changed
    const conversationChanged = currentConversationId && currentConversationId !== prevConversationId;
    
    if (conversationChanged) {
      // Conversation changed - reset tracking and scroll to bottom
      this.setState({ 
        prevConversationId: currentConversationId,
        prevMessagesLength: currentMessagesLength,
        isUserNearBottom: true 
      });
      this.checkStatusVisibility();
      setTimeout(() => this.scrollToBottom(), 100);
    } else {
      // Same conversation - check for new messages
      if (currentMessagesLength > prevMessagesLength) {
        // New messages arrived
        if (this.state.isUserNearBottom) {
          this.scrollToBottom();
        }
        // Update messages length
        this.setState({ prevMessagesLength: currentMessagesLength });
      }
    }
  }

  checkStatusVisibility = async () => {
    const { currentConversation } = this.context;
    const currentUserId = localStorage.getItem('userId');
    
    if (!currentConversation || currentConversation.type === 'group') {
      this.setState({ statusHidden: false });
      return;
    }
    
    const participant = currentConversation.participants?.find(p => p._id !== currentUserId);
    if (!participant) {
      this.setState({ statusHidden: false });
      return;
    }
    
    try {
      const response = await api.checkStatusVisibility(participant._id);
      this.setState({ statusHidden: response.data.isHidden });
    } catch (error) {
      console.error('Error checking status visibility:', error);
      this.setState({ statusHidden: false });
    }
  };

  scrollToBottom = () => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  handleScroll = (e) => {
    const container = e.target;
    const threshold = 150; // pixels from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    
    // Update state only if changed
    if (isNearBottom !== this.state.isUserNearBottom) {
      this.setState({ isUserNearBottom: isNearBottom });
    }
  };

  handleMessageChange = (e) => {
    this.setState({ message: e.target.value });
  };

  handleFileSelect = (e) => {
    this.setState({ selectedFile: e.target.files[0] });
  };

  handleSendMessage = async (e) => {
    e.preventDefault();
    
    const { message, selectedFile } = this.state;

    if (!message.trim() && !selectedFile) return;

    await this.context.sendMessage(
      message,
      selectedFile ? 'file' : 'text',
      selectedFile
    );

    this.setState({ message: '', selectedFile: null });
  };

  formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  renderOnlineStatus = () => {
    const { currentConversation, onlineUsers } = this.context;
    const { currentTime, statusHidden } = this.state; // Get statusHidden from state
    const currentUserId = localStorage.getItem('userId');
    
    if (!currentConversation?.participants) return null;
    
    // Nếu là group, hiển thị số thành viên
    if (currentConversation.type === 'group') {
      return (
        <div className="chat-header-status group">
          {currentConversation.participants?.length || 0} thành viên
        </div>
      );
    }
    
    // Nếu là private, hiển thị trạng thái online/offline
    const participant = currentConversation.participants.find(
      p => p._id !== currentUserId
    );
    
    if (!participant) return null;
    
    // If participant has hidden their status from me (restricted/blocked me), don't show anything
    if (statusHidden) {
      console.log('🚫 Status hidden for participant:', participant.fullName || participant.username);
      return null;
    }
    
    // CRITICAL: Dựa vào participant.isOnline từ state (đã được update từ socket events)
    // thay vì chỉ dựa vào onlineUsers Set
    const isOnline = onlineUsers.has(participant._id);
    
    console.log('🔍 Checking online status:', {
      participantId: participant._id,
      participantName: participant.fullName || participant.username,
      participantIsOnline: participant.isOnline,
      isOnlineInSet: isOnline,
      onlineUsersSize: onlineUsers.size,
      lastSeen: participant.lastSeen,
      statusHidden
    });
    
    if (isOnline) {
      return (
        <div className="chat-header-status online">
          <span className="status-dot"></span>
          Trực tuyến
        </div>
      );
    } else {
      // Use currentTime to ensure recalculation on every timer tick
      const statusText = participant.lastSeen ? getTimeAgo(participant.lastSeen) : 'Ngoại tuyến';
      console.log('📊 Displaying offline status:', statusText);
      return (
        <div className="chat-header-status offline">
          {statusText}
        </div>
      );
    }
  };

  getConversationName = () => {
    const { currentConversation } = this.context;
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    
    // Nếu là group, hiển thị tên nhóm
    if (currentConversation.type === 'group') {
      return currentConversation.name || 'Nhóm không tên';
    }
    
    // Nếu là private, hiển thị tên người kia
    const participant = currentConversation.participants?.find(p => p._id !== currentUserId);
    return participant?.fullName || participant?.username || 'Chat';
  };

  getConversationAvatar = () => {
    const { currentConversation } = this.context;
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    
    // Nếu là group, hiển thị icon nhóm
    if (currentConversation.type === 'group') {
      return (
        <span className="group-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </span>
      );
    }
    
    // Nếu là private, lấy thông tin participant
    const participant = currentConversation.participants?.find(p => p._id !== currentUserId);
    const name = participant?.fullName || participant?.username || 'User';
    
    // Nếu có avatar, hiển thị ảnh
    if (participant?.avatar) {
      const avatarUrl = participant.avatar.startsWith('http') 
        ? participant.avatar 
        : `${process.env.REACT_APP_API_URL.replace('/api', '')}${participant.avatar}`;
      return <img src={avatarUrl} alt={name} />;
    }
    
    // Nếu không có avatar, hiển thị avatar mặc định từ UI Avatars
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=8b5cf6&color=fff`;
    return <img src={defaultAvatar} alt={name} />;
  };

  render() {
    const { currentConversation, messages, loading } = this.context;
    const { message, selectedFile } = this.state;
    const showInfoPanel = this.props.showInfoPanel;
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;

    if (!currentConversation) {
      return (
        <div className="chat-window-empty">
          <h2>Chào mừng đến với Ứng Dụng Chat</h2>
          <p>Chọn một cuộc trò chuyện để bắt đầu</p>
        </div>
      );
    }

    return (
      <div className="chat-window-with-info">
      <div className="chat-window">
        <div className="chat-window-header">
          <div
            className="chat-window-header-info clickable-header"
            onClick={this.props.onToggleInfoPanel}
            title="Xem thông tin cuộc trò chuyện"
            style={{ cursor: 'pointer' }}
          >
            <div className={`chat-header-avatar ${currentConversation.type === 'group' ? 'group-avatar' : ''}`}>
              {this.getConversationAvatar()}
            </div>
            <div>
              <h3>{this.getConversationName()}</h3>
              {this.renderOnlineStatus()}
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-header-btn" title="Gọi thoại">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.13 6.13l1.88-1.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <button className="chat-header-btn" title="Gọi video">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </button>
            <button
              className={`chat-header-btn${this.props.showInfoPanel ? ' active' : ''}`}
              title="Thông tin cuộc trò chuyện"
              onClick={this.props.onToggleInfoPanel}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          </div>
        </div>

        <div 
          className="chat-messages" 
          ref={this.messagesContainerRef}
          onScroll={this.handleScroll}
        >
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`message ${
                msg.sender._id === currentUserId ? 'message-sent' : 'message-received'
              } ${msg.isBlocked ? 'message-blocked' : ''}`}
            >
              <div className="message-content">
                {msg.isBlocked && (
                  <div className="message-blocked-warning">
                    <span className="blocked-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </span>
                    <span className="blocked-text">{msg.blockedMessage || 'Tin nhắn không được gửi'}</span>
                  </div>
                )}
                {msg.type === 'image' && !msg.isBlocked && (
                  <img
                    src={`http://localhost:5000${msg.fileUrl}`}
                    alt="attachment"
                    className="message-image"
                  />
                )}
                {msg.content && !msg.isBlocked && <p>{msg.content}</p>}
                {msg.type === 'file' && msg.fileName && !msg.isBlocked && (
                  <a href={`http://localhost:5000${msg.fileUrl}`} download>
                    📎 {msg.fileName}
                  </a>
                )}
              </div>
              <div className="message-time">{this.formatTime(msg.createdAt)}</div>
            </div>
          ))}
          <div ref={this.messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={this.handleSendMessage}>
          {selectedFile && (
            <div className="selected-file">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'4px'}}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {selectedFile.name}
              <button
                type="button"
                onClick={() => this.setState({ selectedFile: null })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          <div className="chat-input-container">
            <input
              type="file"
              id="file-upload"
              onChange={this.handleFileSelect}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="btn-file" title="Đính kèm file">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </label>

            <input
              type="text"
              value={message}
              onChange={this.handleMessageChange}
              placeholder="Aa"
              className="message-input"
            />

            <button type="submit" className="btn-send" disabled={!message.trim() && !selectedFile} title="Gửi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Conversation Info Panel */}
      {showInfoPanel && (
        <ConversationInfo
          onClose={this.props.onToggleInfoPanel}
        />
      )}
      </div>
    );
  }
}

export default ChatWindow;
