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
      showRestrictedSection: false,
    };
  }

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
    if (!otherParticipant) return 'Unknown';

    // Kiểm tra biệt danh từ resolvedNicknames (có trong mọi cuộc trò chuyện)
    const nickname = conversation.resolvedNicknames?.[otherParticipant._id?.toString()];
    if (nickname) return nickname;

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
      let avatarUrl;
      if (participant.avatar.startsWith('http')) {
        avatarUrl = participant.avatar;
      } else {
        // Tạo URL từ API URL
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const baseUrl = apiUrl.replace('/api', '');
        avatarUrl = `${baseUrl}${participant.avatar}`;
      }
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

        case 'createGroup': {
          const friendParticipant = this.getParticipant(conversation);
          if (friendParticipant && this.props.onCreateGroupWithFriend) {
            this.props.onCreateGroupWithFriend(friendParticipant._id);
          }
          break;
        }

        case 'restrict': {
          const participant = this.getParticipant(conversation);
          if (participant) {
            const isAlreadyRestricted = this.isRestricted(participant._id);
            if (isAlreadyRestricted) {
              await api.unrestrictUser(participant._id);
            } else {
              await api.restrictUser(participant._id);
              // If this conversation is currently open, close it
              if (this.context.currentConversation?._id === conversation._id) {
                this.context.selectConversation(null);
              }
            }
            await this.context.loadBlockedAndRestricted();
            await this.context.loadConversations();
          }
          break;
        }

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
                  await this.context.loadBlockedAndRestricted();
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
                  await this.context.loadBlockedAndRestricted();
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
    return (this.context.blockedUsers || []).some(user => user._id === userId);
  };

  isRestricted = (userId) => {
    return (this.context.restrictedUsers || []).some(user => user._id === userId);
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
    
    // Kiểm tra tin nhắn đã bị xóa
    if (lastMessage.isDeleted) {
      return `${prefix}Tin nhắn đã được xóa`;
    }
    
    // Tin nhắn hệ thống
    if (lastMessage.type === 'system') {
      const content = lastMessage.content || '';
      if (content.startsWith('__NICKNAME_SET__|')) {
        try {
          const data = JSON.parse(content.slice('__NICKNAME_SET__|'.length));
          const curId = currentUserId?.toString();
          if (curId === data.setterId) return `Bạn đã đặt biệt danh cho ${data.targetName} là: ${data.nickname}`;
          if (curId === data.targetId) return `${data.setterName} đã đặt biệt danh cho bạn là: ${data.nickname}`;
          return `${data.setterName} đã đặt biệt danh cho ${data.targetName} là: ${data.nickname}`;
        } catch { /* fall through */ }
      }
      return content;
    }

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

  handleStartConversation = async (friendId) => {
    try {
      const conversation = await this.context.createConversation(friendId);
      if (conversation) {
        this.context.selectConversation(conversation);
      }
    } catch (err) {
      console.error('Start conversation error:', err);
      alert('Có lỗi xảy ra khi bắt đầu cuộc trò chuyện');
    }
  };

  getFriendAvatar = (friend) => {
    const name = friend.fullName || friend.username || 'User';
    if (friend.avatar) {
      const avatarUrl = friend.avatar.startsWith('http')
        ? friend.avatar
        : `${process.env.REACT_APP_API_URL.replace('/api', '')}${friend.avatar}`;
      return <img src={avatarUrl} alt={name} />;
    }
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=8b5cf6&color=fff`;
    return <img src={defaultAvatar} alt={name} />;
  };

  handleFriendClick = async (friend) => {
    // If there's already a private conversation with this friend, open it
    const existingConv = this.context.conversations.find(
      conv => conv.type !== 'group' && conv.participants?.some(p => p._id === friend._id)
    );
    if (existingConv) {
      this.context.selectConversation(existingConv);
    } else {
      await this.handleStartConversation(friend._id);
    }
  };

  render() {
    const { conversations, currentConversation, loading, onlineUsers, unreadCounts = {}, friends = [], restrictedUsers = [] } = this.context;
    const { contextMenu, showRestrictedSection } = this.state;

    const searchQuery = (this.props.searchQuery || '').trim().toLowerCase();
    const isSearching = searchQuery.length > 0;

    // When searching: show all friends whose name matches
    const matchingFriends = isSearching
      ? friends.filter(friend => {
          const name = (friend.fullName || friend.username || '').toLowerCase();
          return name.includes(searchQuery);
        })
      : [];

    // Helper: is this conversation with a restricted user?
    const isConvRestricted = (conv) => {
      if (conv.type === 'group') return false;
      const p = this.getParticipant(conv);
      if (!p) return false;
      const pId = p._id?.toString?.() || p._id;
      return restrictedUsers.some(u => (u._id?.toString?.() || u._id) === pId);
    };

    // Main list: only non-restricted conversations
    const normalConvs = isSearching ? [] : conversations.filter(c => !isConvRestricted(c));
    // Restricted section: conversations with restricted users
    const restrictedConvs = conversations.filter(c => isConvRestricted(c));

    const noResults = isSearching && matchingFriends.length === 0;

    return (
      <div className="conversation-list">
        {!isSearching && <h3>Đoạn Chat</h3>}

        {loading && <div className="loading">Đang tải...</div>}

        {conversations.length === 0 && !loading && !isSearching && (
          <div className="empty-state">
            Chưa có cuộc trò chuyện nào. Bắt đầu chat với bạn bè!
          </div>
        )}

        {noResults && (
          <div className="search-no-results">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>Không tìm thấy kết quả cho "{this.props.searchQuery}"</p>
          </div>
        )}

        {/* Normal conversation list (no search) */}
        {normalConvs.length > 0 && (
          <div className="conversation-items">
            {normalConvs.map((conversation) => {
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
        )}

        {/* Restricted section */}
        {!isSearching && restrictedConvs.length > 0 && (
          <div className="restricted-section">
            <button
              className="restricted-section-toggle"
              onClick={() => this.setState(prev => ({ showRestrictedSection: !prev.showRestrictedSection }))}
            >
              <span className="restricted-section-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  <path d="M18.63 13A18 18 0 0 1 18 8 6 6 0 0 0 6.06 8c0 .2-.04.4-.06.6A18.13 18.13 0 0 1 3 19h15l.63-6z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </span>
              <span className="restricted-section-label">Hạn chế ({restrictedConvs.length})</span>
              <span className={`restricted-chevron ${showRestrictedSection ? 'open' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </button>
            {showRestrictedSection && (
              <div className="conversation-items restricted-items">
                {restrictedConvs.map((conversation) => {
                  const participant = this.getParticipant(conversation);
                  const isOnline = participant ? onlineUsers.has(participant._id) : false;
                  const unreadCount = unreadCounts[conversation._id] || 0;
                  const hasUnread = unreadCount > 0;
                  return (
                    <div
                      key={conversation._id}
                      className={`conversation-item restricted-conv-item ${
                        currentConversation?._id === conversation._id ? 'active' : ''
                      } ${hasUnread ? 'has-unread' : ''}`}
                      onClick={() => this.handleSelectConversation(conversation)}
                      onContextMenu={(e) => this.handleContextMenu(e, conversation)}
                    >
                      <div className={`conversation-avatar ${isOnline ? 'online' : ''}`}>
                        {this.getConversationAvatar(conversation)}
                      </div>
                      <div className="conversation-info">
                        <div className="conversation-name">
                          {this.getConversationName(conversation)}
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
                          <div className="unread-badge">{unreadCount}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Friends search results */}
        {matchingFriends.length > 0 && (
          <>
            <div className="search-section-label">Bạn bè ({matchingFriends.length})</div>
            <div className="conversation-items">
              {matchingFriends.map((friend) => {
                const isOnline = onlineUsers.has(friend._id);
                const hasConversation = conversations.some(
                  conv => conv.type !== 'group' && conv.participants?.some(p => p._id === friend._id)
                );
                return (
                  <div
                    key={friend._id}
                    className="conversation-item friend-search-item"
                    onClick={() => this.handleFriendClick(friend)}
                  >
                    <div className={`conversation-avatar ${isOnline ? 'online' : ''}`}>
                      {this.getFriendAvatar(friend)}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">
                        {friend.fullName || friend.username}
                      </div>
                      <div className="conversation-last-message friend-search-hint">
                        {hasConversation ? 'Mở cuộc trò chuyện' : 'Bắt đầu trò chuyện'}
                      </div>
                    </div>
                    <div className="conversation-meta">
                      <div className="friend-search-chat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

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
