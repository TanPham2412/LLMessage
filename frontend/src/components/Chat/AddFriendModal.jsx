import React, { Component } from 'react';
import api from '../../services/api';
import '../../styles/AddFriendModal.css';

class AddFriendModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '',
      searchResults: [],
      loading: false,
      error: null,
      successMessage: null,
      sentRequests: new Set() // Track user IDs đã gửi request
    };
    
    this.searchTimeout = null;
  }

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
  }

  searchUsers = async (query) => {
    try {
      this.setState({ loading: true, error: null });
      
      const response = await api.getAllUsers({ 
        search: query, 
        limit: 10 
      });

      if (response.success) {
        this.setState({
          searchResults: response.data,
          loading: false
        });
      }
    } catch (error) {
      console.error('Search users error:', error);
      this.setState({
        error: 'Không thể tìm kiếm người dùng',
        loading: false
      });
    }
  }

  handleSendFriendRequest = async (userId) => {
    // Kiểm tra đã gửi chưa
    if (this.state.sentRequests.has(userId)) {
      this.setState({ error: 'Bạn đã gửi lời mời kết bạn rồi' });
      return;
    }

    try {
      this.setState({ loading: true, error: null, successMessage: null });

      const response = await api.sendFriendRequest(userId);

      if (response.success) {
        // Thêm vào danh sách đã gửi
        const newSentRequests = new Set(this.state.sentRequests);
        newSentRequests.add(userId);
        
        this.setState({
          successMessage: 'Đã gửi lời mời kết bạn!',
          loading: false,
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
        loading: false
      });
    }
  }

  handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      this.props.onClose();
    }
  }

  componentWillUnmount() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  render() {
    const { searchQuery, searchResults, loading, error, successMessage } = this.state;

    return (
      <div className="add-friend-modal-overlay" onClick={this.handleOverlayClick}>
        <div className="add-friend-modal">
          <div className="modal-header">
            <h2>Thêm Bạn Bè</h2>
            <button className="close-btn" onClick={this.props.onClose}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="search-section">
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm theo tên người dùng hoặc email..."
                value={searchQuery}
                onChange={this.handleSearchChange}
                autoFocus
              />
              {loading && <div className="search-loading">Đang tìm kiếm...</div>}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}

            <div className="search-results">
              {searchQuery.trim().length === 0 ? (
                <div className="search-hint">
                  💡 Nhập tên người dùng hoặc email để tìm kiếm
                </div>
              ) : searchResults.length === 0 && !loading ? (
                <div className="no-results">
                  Không tìm thấy người dùng nào
                </div>
              ) : (
                searchResults.map((user) => (
                  <div key={user._id} className="user-result-item">
                    <div className="user-result-avatar">
                      <img 
                        src={user.avatar && user.avatar.startsWith('http') 
                          ? user.avatar 
                          : user.avatar
                          ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.avatar}`
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&size=80&background=8b5cf6&color=fff`
                        } 
                        alt={user.username} 
                      />
                      {user.isOnline && <span className="online-indicator"></span>}
                    </div>
                    <div className="user-result-info">
                      <div className="user-result-name">{user.fullName || user.username}</div>
                      <div className="user-result-username">@{user.username}</div>
                      {user.bio && <div className="user-result-bio">{user.bio}</div>}
                    </div>
                    <button
                      className="add-friend-btn"
                      onClick={() => this.handleSendFriendRequest(user._id)}
                      disabled={loading || this.state.sentRequests.has(user._id)}
                    >
                      {this.state.sentRequests.has(user._id) ? '✓ Đã gửi' : '👥 Thêm bạn'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default AddFriendModal;
