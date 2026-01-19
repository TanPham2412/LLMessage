import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext';

class ChatWindow extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    
    this.state = {
      message: '',
      selectedFile: null
    };

    this.messagesEndRef = React.createRef();
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
          <h3>
            {currentConversation.participants
              ?.find(p => p._id !== currentUserId)
              ?.fullName || 'Chat'}
          </h3>
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
              Selected: {selectedFile.name}
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
            <label htmlFor="file-upload" className="btn-file">
              📎
            </label>

            <input
              type="text"
              value={message}
              onChange={this.handleMessageChange}
              placeholder="Nhập tin nhắn..."
              className="message-input"
            />

            <button type="submit" className="btn-send">
              Gửi
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default ChatWindow;
