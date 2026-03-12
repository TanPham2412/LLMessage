import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import { SocketContext } from '../../context/SocketContext.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/FriendsList.css';

class FriendsListComponent extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    
    this.state = {
      activeTab: 'friends', // 'friends' or 'search'
      friends: [],
      loading: true,
      searchQuery: '',
      confirmDelete: null, // Track which friend is being confirmed for deletion
      // Search tab states
      searchResults: [],
      searchLoading: false,
      error: null,
      successMessage: null,
      sentRequests: new Set(),
      friendIds: new Set()
    };
    
    this.searchTimeout = null;
  }

  componentDidMount() {
    this.loadFriends();
  }

  componentWillUnmount() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  loadFriends = async () => {
    try {
      this.setState({ loading: true });
      const response = await api.getFriends();
      
      if (response.success) {
        const friendIds = new Set(response.data.map(friend => friend._id));
        this.setState({ 
          friends: response.data, 
          friendIds: friendIds,
          loading: false 
        });
      }
    } catch (error) {
      console.error('Load friends error:', error);
      this.setState({ loading: false });
    }
  };

  handleRemoveFriend = async (friendId) => {
    try {
      const response = await api.removeFriend(friendId);
      
      if (response.success) {
        // Reload danh sách bạn bè
        await this.loadFriends();
        
        // Reload lại friends trong ChatContext
        if (this.context.loadFriends) {
          this.context.loadFriends();
        }
        
        // Reset confirm state
        this.setState({ confirmDelete: null });
      }
    } catch (error) {
      console.error('Remove friend error:', error);
      alert('Không thể xóa bạn. Vui lòng thử lại!');
    }
  };

  // Search tab methods
  handleSearchChange = (e) => {
    const searchQuery = e.target.value;
    this.setState({ searchQuery });

    // Xoá timeout trước đó
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search - tìm kiếm sau 300ms kể từ lần gõ cuối
    if (searchQuery.trim().length > 0) {
      this.searchTimeout = setTimeout(() => {
        this.searchUsers(searchQuery);
      }, 300);
    } else {
      this.setState({ searchResults: [] });
    }
  };

  searchUsers = async (query) => {
    try {
      this.setState({ searchLoading: true, error: null });
      
      const response = await api.getAllUsers({ 
        search: query, 
        limit: 10 
      });

      if (response.success) {
        this.setState({
          searchResults: response.data,
          searchLoading: false
        });
      }
    } catch (error) {
      console.error('Search users error:', error);
      this.setState({
        error: 'Không thể tìm kiếm người dùng',
        searchLoading: false
      });
    }
  };

  handleSendFriendRequest = async (userId) => {
    // Kiểm tra đã gửi chưa
    if (this.state.sentRequests.has(userId)) {
      this.setState({ error: 'Bạn đã gửi lời mời kết bạn rồi' });
      return;
    }

    try {
      this.setState({ searchLoading: true, error: null, successMessage: null });

      const response = await api.sendFriendRequest(userId);

      if (response.success) {
        // Thêm vào danh sách đã gửi
        const newSentRequests = new Set(this.state.sentRequests);
        newSentRequests.add(userId);
        
        this.setState({
          successMessage: 'Đã gửi lời mời kết bạn!',
          searchLoading: false,
          sentRequests: newSentRequests
        });

        // Xóa thông báo thành công sau 2 giây
        setTimeout(() => {
          this.setState({ successMessage: null });
        }, 2000);
      }
    } catch (error) {
      console.error('Send friend request error:', error);
      this.setState({
        error: error.response?.data?.message || 'Không thể gửi lời mời kết bạn',
        searchLoading: false
      });
    }
  };

  handleRemoveFriendFromSearch = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy kết bạn?')) {
      return;
    }

    try {
      this.setState({ searchLoading: true, error: null, successMessage: null });

      const response = await api.removeFriend(userId);

      if (response.success) {
        // Xóa khỏi danh sách bạn bè
        const newFriendIds = new Set(this.state.friendIds);
        newFriendIds.delete(userId);
        
        this.setState({
          successMessage: 'Đã hủy kết bạn!',
          searchLoading: false,
          friendIds: newFriendIds
        });

        // Reload friends list
        await this.loadFriends();

        // Xóa thông báo thành công sau 2 giây
        setTimeout(() => {
          this.setState({ successMessage: null });
        }, 2000);
      }
    } catch (error) {
      console.error('Remove friend error:', error);
      this.setState({
        error: error.response?.data?.message || 'Không thể hủy kết bạn',
        searchLoading: false
      });
    }
  };

  handleSendMessage = async (friend) => {
    try {
      // Tạo hoặc lấy conversation với friend
      const response = await this.context.createConversation(friend._id);
      
      if (response) {
        // Đóng modal
        this.props.onClose();
        
        // Select conversation để mở chat
        this.context.selectConversation(response);
      }
    } catch (error) {
      console.error('Create conversation error:', error);
      alert('Không thể tạo cuộc trò chuyện. Vui lòng thử lại!');
    }
  };

  handleViewProfile = (friendId) => {
    // Navigate to profile page
    this.props.navigate(`/profile/${friendId}`);
    this.props.onClose();
  };

  getFilteredFriends = () => {
    const { friends, searchQuery } = this.state;
    
    if (!searchQuery.trim()) {
      return friends;
    }
    
    const query = searchQuery.toLowerCase();
    return friends.filter(friend => 
      friend.username?.toLowerCase().includes(query) ||
      friend.fullName?.toLowerCase().includes(query)
    );
  };

  renderFriendItem = (friend) => {
    const { confirmDelete } = this.state;
    const isConfirming = confirmDelete === friend._id;
    
    // Get avatar URL
    const avatarUrl = friend.avatar?.startsWith('http') 
      ? friend.avatar 
      : friend.avatar 
        ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${friend.avatar}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName || friend.username)}&size=80&background=8b5cf6&color=fff`;
    
    return (
      <div key={friend._id} className="friend-item">
        <div 
          className="friend-info-section"
          onClick={() => this.handleViewProfile(friend._id)}
        >
          <div className="friend-avatar-wrapper">
            <img 
              src={avatarUrl} 
              alt={friend.fullName || friend.username}
              className="friend-avatar"
            />
            {friend.isOnline && <div className="online-indicator-badge"></div>}
          </div>
          
          <div className="friend-details">
            <div className="friend-name">{friend.fullName || friend.username}</div>
            <div className="friend-status">
              {friend.isOnline ? (
                <span className="status-online">Đang hoạt động</span>
              ) : (
                <span className="status-offline">
                  {this.getLastSeenText(friend.lastSeen)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="friend-actions">
          <button 
            className="friend-action-btn message-btn"
            onClick={() => this.handleSendMessage(friend)}
            title="Nhắn tin"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          
          {isConfirming ? (
            <>
              <button 
                className="friend-action-btn confirm-btn"
                onClick={() => this.handleRemoveFriend(friend._id)}
                title="Xác nhận xóa"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button 
                className="friend-action-btn cancel-btn"
                onClick={() => this.setState({ confirmDelete: null })}
                title="Hủy"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </>
          ) : (
            <button 
              className="friend-action-btn delete-btn"
              onClick={() => this.setState({ confirmDelete: friend._id })}
              title="Xóa bạn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  getLastSeenText = (lastSeen) => {
    if (!lastSeen) return 'Ngoại tuyến';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  render() {
    const { activeTab, loading, searchQuery, error, successMessage, searchLoading } = this.state;
    const filteredFriends = this.getFilteredFriends();

    return (
      <div className="friends-list-modal-overlay" onClick={this.props.onClose}>
        <div className="friends-list-modal" onClick={(e) => e.stopPropagation()}>
          <div className="friends-list-header">
            <h2>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle', marginRight:'8px'}}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Bạn Bè
            </h2>
            <button className="close-modal-btn" onClick={this.props.onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="friends-tabs">
            <button 
              className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => this.setState({ activeTab: 'friends', searchQuery: '', searchResults: [] })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Danh Sách</span>
              <span className="tab-count">{this.state.friends.length}</span>
            </button>
            <button 
              className={`friends-tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => this.setState({ activeTab: 'search', searchQuery: '' })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span>Tìm Bạn Bè</span>
            </button>
          </div>

          {/* Messages */}
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
          
          {/* Tab Content */}
          {activeTab === 'friends' ? this.renderFriendsTab(filteredFriends, loading) : this.renderSearchTab(searchLoading)}
        </div>
      </div>
    );
  }

  renderFriendsTab = (filteredFriends, loading) => {
    const { searchQuery } = this.state;

    return (
      <>
        <div className="friends-list-search">
          <input 
            type="text"
            placeholder="Tìm kiếm bạn bè..."
            value={searchQuery}
            onChange={(e) => this.setState({ searchQuery: e.target.value })}
            className="friends-search-input"
          />
        </div>
        
        <div className="friends-list-content">
          {loading ? (
            <div className="friends-loading">
              <div className="loading-spinner"></div>
              <p>Đang tải danh sách bạn bè...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="friends-empty">
              {searchQuery ? (
                <>
                  <div className="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <p>Không tìm thấy bạn bè nào</p>
                  <small>Thử tìm kiếm với từ khóa khác</small>
                </>
              ) : (
                <>
                  <div className="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <p>Bạn chưa có bạn bè nào</p>
                  <small>Hãy thêm bạn bè để bắt đầu trò chuyện!</small>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="friends-count">
                {filteredFriends.length} bạn bè
                {searchQuery && ` (từ ${this.state.friends.length} tổng số)`}
              </div>
              <div className="friends-list-items">
                {filteredFriends.map(friend => this.renderFriendItem(friend))}
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  renderSearchTab = (searchLoading) => {
    const { searchQuery, searchResults } = this.state;

    return (
      <>
        <div className="friends-list-search">
          <input 
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchQuery}
            onChange={this.handleSearchChange}
            className="friends-search-input"
            autoFocus
          />
          {searchLoading && <div className="search-loading-text">Đang tìm kiếm...</div>}
        </div>
        
        <div className="friends-list-content">
          {searchQuery.trim().length === 0 ? (
            <div className="friends-empty">
              <div className="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
              <p>Nhập tên hoặc email để tìm kiếm</p>
              <small>Tìm và thêm bạn bè mới</small>
            </div>
          ) : searchResults.length === 0 && !searchLoading ? (
            <div className="friends-empty">
              <div className="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
              <p>Không tìm thấy người dùng nào</p>
              <small>Thử với từ khóa khác</small>
            </div>
          ) : (
            <div className="friends-list-items">
              {searchResults.map(user => this.renderSearchResultItem(user))}
            </div>
          )}
        </div>
      </>
    );
  };

  renderSearchResultItem = (user) => {
    const { friendIds, sentRequests, searchLoading } = this.state;
    const isFriend = friendIds.has(user._id);
    const isSent = sentRequests.has(user._id);
    
    // Get avatar URL
    const avatarUrl = user.avatar?.startsWith('http') 
      ? user.avatar 
      : user.avatar 
        ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.avatar}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&size=80&background=8b5cf6&color=fff`;
    
    return (
      <div key={user._id} className="friend-item">
        <div 
          className="friend-info-section"
          onClick={() => this.handleViewProfile(user._id)}
        >
          <div className="friend-avatar-wrapper">
            <img 
              src={avatarUrl} 
              alt={user.fullName || user.username}
              className="friend-avatar"
            />
            {user.isOnline && <div className="online-indicator-badge"></div>}
          </div>
          
          <div className="friend-details">
            <div className="friend-name">{user.fullName || user.username}</div>
            <div className="friend-status">
              <span className="username-text">@{user.username}</span>
            </div>
            {user.bio && <div className="friend-bio">{user.bio}</div>}
          </div>
        </div>
        
        <div className="friend-actions">
          {isFriend ? (
            <button 
              className="friend-action-btn delete-btn"
              onClick={() => this.handleRemoveFriendFromSearch(user._id)}
              disabled={searchLoading}
              title="Hủy kết bạn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </button>
          ) : (
            <button 
              className="friend-action-btn add-btn"
              onClick={() => this.handleSendFriendRequest(user._id)}
              disabled={searchLoading || isSent}
              title={isSent ? "Đã gửi lời mời" : "Thêm bạn bè"}
            >
              {isSent ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };
}

// Wrapper with router navigation (function declaration to avoid const)
function FriendsList(props) {
  const navigate = useNavigate();
  return <FriendsListComponent {...props} navigate={navigate} />;
}

export default FriendsList;
