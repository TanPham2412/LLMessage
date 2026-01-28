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
    // Nếu là group, hiển thị tên nhóm
    if (conversation.type === 'group') {
      return conversation.name || 'Nhóm không tên';
    }
    
    // Nếu là private, hiển thị tên người kia
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    const otherParticipant = conversation.participants?.find(p => p._id !== currentUserId);
    return otherParticipant?.fullName || otherParticipant?.username || 'Unknown';
  };

  getConversationAvatar = (conversation) => {
    // Nếu là group, trả về icon nhóm
    if (conversation.type === 'group') {
      return '👥';
    }
    
    // Nếu là private, trả về chữ cái đầu của tên
    const name = this.getConversationName(conversation);
    return name[0]?.toUpperCase() || '?';
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
            const isGroup = conversation.type === 'group';
            
            return (
              <div
                key={conversation._id}
                className={`conversation-item ${
                  currentConversation?._id === conversation._id ? 'active' : ''
                }`}
                onClick={() => this.handleSelectConversation(conversation)}
              >
                <div className={`conversation-avatar ${isOnline && !isGroup ? 'online' : ''} ${isGroup ? 'group-avatar' : ''}`}>
                  {this.getConversationAvatar(conversation)}
                </div>
                <div className="conversation-info">
                  <div className="conversation-name">
                    {this.getConversationName(conversation)}
                    {isGroup && <span className="group-badge">Nhóm</span>}
                  </div>
                  <div className="conversation-last-message">
                    {isGroup && `${conversation.participants?.length || 0} thành viên • `}
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
