import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import ConversationContextMenu from './ConversationContextMenu.jsx';
import api from '../../services/api.js';

class ConversationList extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    this.state = {
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        conversation: null
      },
      blockedUsers: [],
      restrictedUsers: []
    };
  }

  componentDidMount() {
    this.context.loadConversations();
    this.loadBlockedAndRestrictedUsers();
  }

  loadBlockedAndRestrictedUsers = async () => {
    try {
      const [blockedRes, restrictedRes] = await Promise.all([
        api.getBlockedUsers(),
        api.getRestrictedUsers()
      ]);
      
      // API returns { success: true, data: [...] }
      const blockedUsers = blockedRes.data || [];
      const restrictedUsers = restrictedRes.data || [];
      
      this.setState({
        blockedUsers,
        restrictedUsers
      });
    } catch (error) {
      console.error('Error loading blocked/restricted users:', error);
    }
  };

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
    const participant = this.getParticipant(conversation);
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

  handleSelectConversation = (conversation) => {
    this.context.selectConversation(conversation);
  };

  handleContextMenu = (e, conversation) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      contextMenu: {
        show: true,
        x: e.clientX,
        y: e.clientY,
        conversation
      }
    });
  };

  closeContextMenu = () => {
    this.setState({
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        conversation: null
      }
    });
  };

  handleContextMenuAction = async (action) => {
    const { conversation } = this.state.contextMenu;
    if (!conversation) return;

    try {
      switch (action) {
        case 'pin':
          await api.togglePinConversation(conversation._id);
          await this.context.loadConversations();
          break;

        case 'createGroup':
          // TODO: Open create group modal with this person selected
          alert('Chức năng tạo nhóm chat đang được phát triển');
          break;

        case 'restrict':
          const participant = this.getParticipant(conversation);
          if (participant) {
            const isAlreadyRestricted = this.isRestricted(participant._id);
            
            if (isAlreadyRestricted) {
              // Unrestrict
              const confirmUnrestrict = window.confirm(
                `Bạn có chắc muốn bỏ hạn chế ${participant.fullName || participant.username}?`
              );
              if (confirmUnrestrict) {
                try {
                  await api.unrestrictUser(participant._id);
                  await this.loadBlockedAndRestrictedUsers();
                  alert('Đã bỏ hạn chế người dùng này');
                } catch (err) {
                  console.error('Unrestrict error:', err);
                  const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra';
                  alert(errorMsg);
                }
              }
            } else {
              // Restrict
              const confirmRestrict = window.confirm(
                `Bạn có chắc muốn hạn chế ${participant.fullName || participant.username}?\n\nHọ sẽ không thể thấy trạng thái online/offline của bạn.`
              );
              if (confirmRestrict) {
                try {
                  await api.restrictUser(participant._id);
                  await this.loadBlockedAndRestrictedUsers();
                  alert('Đã hạn chế người dùng này');
                } catch (err) {
                  console.error('Restrict error:', err);
                  const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi hạn chế người dùng';
                  alert(errorMsg);
                }
              }
            }
          }
          break;

        case 'block':
          const participantToBlock = this.getParticipant(conversation);
          if (participantToBlock) {
            const isAlreadyBlocked = this.isBlocked(participantToBlock._id);
            
            if (isAlreadyBlocked) {
              // Unblock
              const confirmUnblock = window.confirm(
                `Bạn có chắc muốn bỏ chặn ${participantToBlock.fullName || participantToBlock.username}?`
              );
              if (confirmUnblock) {
                try {
                  await api.unblockUser(participantToBlock._id);
                  await this.loadBlockedAndRestrictedUsers();
                  await this.context.loadConversations();
                  alert('Đã bỏ chặn người dùng này');
                } catch (err) {
                  console.error('Unblock error:', err);
                  const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra';
                  alert(errorMsg);
                }
              }
            } else {
              // Block
              const confirmBlock = window.confirm(
                `Bạn có chắc muốn chặn ${participantToBlock.fullName || participantToBlock.username}?\n\nHọ sẽ không thể nhắn tin cho bạn và không thấy tin nhắn của bạn trong nhóm chung.`
              );
              if (confirmBlock) {
                try {
                  await api.blockUser(participantToBlock._id);
                  await this.loadBlockedAndRestrictedUsers();
                  await this.context.loadConversations();
                  alert('Đã chặn người dùng này');
                } catch (err) {
                  console.error('Block error:', err);
                  const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi chặn người dùng';
                  alert(errorMsg);
                }
              }
            }
          }
          break;

        case 'delete':
          const confirmDelete = window.confirm(
            'Bạn có chắc muốn xóa trò chuyện này?\n\nLịch sử chat sẽ bị ẩn (chỉ ở phía bạn). Trò chuyện sẽ hiện lại khi có tin nhắn mới.'
          );
          if (confirmDelete) {
            await api.deleteConversation(conversation._id);
            await this.context.loadConversations();
            // Nếu đang xem conversation này, clear selection
            if (this.context.currentConversation?._id === conversation._id) {
              this.context.selectConversation(null);
            }
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling context menu action:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại!');
    }
  };

  isPinned = (conversation) => {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    return conversation.pinnedBy?.includes(currentUserId) || false;
  };

  isBlocked = (userId) => {
    return this.state.blockedUsers.some(user => user._id === userId);
  };

  isRestricted = (userId) => {
    return this.state.restrictedUsers.some(user => user._id === userId);
  };

  getParticipant = (conversation) => {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    return conversation.participants?.find(p => p._id !== currentUserId);
  };

  getLastMessagePreview = (conversation) => {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    const lastMessage = conversation.lastMessage;
    
    // Kiểm tra lastMessage có tồn tại không
    if (!lastMessage || typeof lastMessage !== 'object') {
      return 'Chưa có tin nhắn';
    }

    // Kiểm tra xem tin nhắn từ mình hay người khác
    const senderId = lastMessage.sender?._id || lastMessage.sender;
    const isOwnMessage = senderId === currentUserId;
    const prefix = isOwnMessage ? 'Bạn: ' : '';
    
    // Hiển thị content dựa trên type
    if (lastMessage.type === 'image') {
      return `${prefix}📷 Hình ảnh`;
    } else if (lastMessage.type === 'file') {
      return `${prefix}📎 ${lastMessage.fileName || 'File'}`;
    } else {
      // Text message - giới hạn 30 ký tự
      const content = lastMessage.content || '';
      if (!content) return 'Chưa có tin nhắn';
      return content.length > 30 
        ? `${prefix}${content.substring(0, 30)}...` 
        : `${prefix}${content}`;
    }
  };

  render() {
    const { conversations, currentConversation, loading, onlineUsers, unreadCounts = {} } = this.context;
    const { contextMenu } = this.state;

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
            const unreadCount = unreadCounts[conversation._id] || 0;
            const hasUnread = unreadCount > 0;
            const isPinned = this.isPinned(conversation);
            
            return (
              <div
                key={conversation._id}
                className={`conversation-item ${
                  currentConversation?._id === conversation._id ? 'active' : ''
                } ${hasUnread ? 'has-unread' : ''} ${isPinned ? 'pinned' : ''}`}
                onClick={() => this.handleSelectConversation(conversation)}
                onContextMenu={(e) => this.handleContextMenu(e, conversation)}
              >
                <div className={`conversation-avatar ${isOnline && !isGroup ? 'online' : ''} ${isGroup ? 'group-avatar' : ''}`}>
                  {this.getConversationAvatar(conversation)}
                </div>
                <div className="conversation-info">
                  <div className="conversation-name">
                    {isPinned && (
                      <span className="pin-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                          <path d="M21 10.5V6h1a1 1 0 0 0 0-2H2a1 1 0 0 0 0 2h1v4.5a2 2 0 0 0 1.14 1.8L9 16v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5l4.86-3.7A2 2 0 0 0 21 10.5z"/>
                        </svg>
                      </span>
                    )}
                    {this.getConversationName(conversation)}
                    {isGroup && <span className="group-badge">Nhóm</span>}
                  </div>
                  <div className={`conversation-last-message ${hasUnread ? 'unread' : ''}`}>
                    {this.getLastMessagePreview(conversation)}
                  </div>
                </div>
                <div className="conversation-meta">
                  <div className="conversation-time">
                    {this.formatTime(conversation.lastMessageAt)}
                  </div>
                  {hasUnread && (
                    <div className="unread-badge">
                      {unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {contextMenu.show && contextMenu.conversation && (() => {
          const participant = this.getParticipant(contextMenu.conversation);
          const isRestricted = participant ? this.isRestricted(participant._id) : false;
          const isBlocked = participant ? this.isBlocked(participant._id) : false;
          return (
            <ConversationContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              conversation={contextMenu.conversation}
              isPinned={this.isPinned(contextMenu.conversation)}
              isRestricted={isRestricted}
              isBlocked={isBlocked}
              onAction={this.handleContextMenuAction}
              onClose={this.closeContextMenu}
            />
          );
        })()}
      </div>
    );
  }
}

export default ConversationList;
