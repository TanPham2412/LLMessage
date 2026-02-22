import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import { getTimeAgo } from '../../utils/timeUtils';

class ChatWindow extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    
    this.state = {
      message: '',
      selectedFile: null,
      currentTime: Date.now() // Track current time for real-time updates
    };

    this.messagesEndRef = React.createRef();
    this.timeUpdateInterval = null;
  }

  componentDidMount() {
    // Cập nhật thời gian mỗi 10 giây cho trạng thái real-time
    this.timeUpdateInterval = setInterval(() => {
      this.setState({ currentTime: Date.now() });
    }, 10000); // Cập nhật mỗi 10 giây
  }

  componentWillUnmount() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.context.messages !== prevState.messages) {
      this.scrollToBottom();
    }
  }

  scrollToBottom = () => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const { currentTime } = this.state; // Force re-render when currentTime changes
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
    
    // CRITICAL: Dựa vào participant.isOnline từ state (đã được update từ socket events)
    // thay vì chỉ dựa vào onlineUsers Set
    const isOnline = onlineUsers.has(participant._id);
    
    console.log('🔍 Checking online status:', {
      participantId: participant._id,
      participantName: participant.fullName || participant.username,
      participantIsOnline: participant.isOnline,
      isOnlineInSet: isOnline,
      onlineUsersSize: onlineUsers.size,
      lastSeen: participant.lastSeen
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
      return <span className="group-icon">👥</span>;
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
      <div className="chat-window">
        <div className="chat-window-header">
          <div className="chat-window-header-info">
            <div className={`chat-header-avatar ${currentConversation.type === 'group' ? 'group-avatar' : ''}`}>
              {this.getConversationAvatar()}
            </div>
            <div>
              <h3>{this.getConversationName()}</h3>
              {this.renderOnlineStatus()}
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-header-btn" title="Gọi thoại">📞</button>
            <button className="chat-header-btn" title="Gọi video">📹</button>
            <button className="chat-header-btn" title="Thông tin">ℹ️</button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`message ${
                msg.sender._id === currentUserId ? 'message-sent' : 'message-received'
              }`}
            >
              <div className="message-content">
                {msg.type === 'image' && (
                  <img
                    src={`http://localhost:5000${msg.fileUrl}`}
                    alt="attachment"
                    className="message-image"
                  />
                )}
                {msg.content && <p>{msg.content}</p>}
                {msg.type === 'file' && msg.fileName && (
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
              📎 {selectedFile.name}
              <button
                type="button"
                onClick={() => this.setState({ selectedFile: null })}
              >
                ✕
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
              📎
            </label>

            <input
              type="text"
              value={message}
              onChange={this.handleMessageChange}
              placeholder="Aa"
              className="message-input"
            />

            <button type="submit" className="btn-send" disabled={!message.trim() && !selectedFile} title="Gửi">
              ➤
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default ChatWindow;
