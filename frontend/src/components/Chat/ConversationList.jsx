import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';

class ConversationList extends Component {
  static contextType = ChatContext;

  componentDidMount() {
    this.context.loadConversations();
  }

  formatTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now - messageDate;
    
    if (diff < 86400000) {
      return messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  getConversationName = (conversation) => {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    const otherParticipant = conversation.participants?.find(p => p._id !== currentUserId);
    return otherParticipant?.fullName || otherParticipant?.username || 'Unknown';
  };

  handleSelectConversation = (conversation) => {
    this.context.selectConversation(conversation);
  };

  getParticipant = (conversation) => {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    return conversation.participants?.find(p => p._id !== currentUserId);
  };

  render() {
    const { conversations, currentConversation, loading, onlineUsers } = this.context;

    return (
      <div className="conversation-list">
        <h3>Đoạn Chat</h3>

        {loading && <div className="loading">Đang tải...</div>}

        {conversations.length === 0 && !loading && (
          <div className="empty-state">
            Chưa có cuộc trò chuyện nào. Bắt đầu chat với bạn bè!
          </div>
        )}

        <div className="conversation-items">
          {conversations.map((conversation) => {
            const participant = this.getParticipant(conversation);
            const isOnline = participant ? onlineUsers.has(participant._id) : false;
            return (
              <div
                key={conversation._id}
                className={`conversation-item ${
                  currentConversation?._id === conversation._id ? 'active' : ''
                }`}
                onClick={() => this.handleSelectConversation(conversation)}
              >
                <div className={`conversation-avatar ${isOnline ? 'online' : ''}`}>
                  {this.getConversationName(conversation)[0].toUpperCase()}
                </div>
                <div className="conversation-info">
                  <div className="conversation-name">
                    {this.getConversationName(conversation)}
                  </div>
                  <div className="conversation-last-message">
                    Tin nhắn gần đây
                  </div>
                </div>
                <div className="conversation-time">
                  {this.formatTime(conversation.lastMessageAt)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default ConversationList;
