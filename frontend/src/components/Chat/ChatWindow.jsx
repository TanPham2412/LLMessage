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
    // Update time every 10 seconds for real-time status
    this.timeUpdateInterval = setInterval(() => {
      this.setState({ currentTime: Date.now() });
    }, 10000); // Update every 10 seconds
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
    const { currentConversation, currentUserId, onlineUsers } = this.context;
    
    if (!currentConversation?.participants) return null;
    
    const participant = currentConversation.participants.find(
      p => p._id !== currentUserId
    );
    
    if (!participant) return null;
    
    const isOnline = onlineUsers.has(participant._id);
    
    if (isOnline) {
      return (
        <div className="chat-header-status online">
          <span className="status-dot"></span>
          Trực tuyến
        </div>
      );
    } else {
      const statusText = participant.lastSeen ? getTimeAgo(participant.lastSeen) : 'Ngoại tuyến';
      return (
        <div className="chat-header-status offline">
          {statusText}
        </div>
      );
    }
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
            <div className="chat-header-avatar">
              {(currentConversation.participants
                ?.find(p => p._id !== currentUserId)
                ?.fullName || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h3>
                {currentConversation.participants
                  ?.find(p => p._id !== currentUserId)
                  ?.fullName || 'Chat'}
              </h3>
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
          {loading && <div className="loading">Đang tải tin nhắn...</div>}

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
