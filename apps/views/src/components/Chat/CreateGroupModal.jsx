import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import api from '../../services/api.js';
import '../../styles/CreateGroupModal.css';

class CreateGroupModal extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    const preSelected = new Set(props.preSelectedIds || []);
    this.state = {
      groupName: '',
      selectedFriends: preSelected,
      searchQuery: '',
      loading: false,
      error: null,
      successMessage: null
    };
  }

  handleGroupNameChange = (e) => {
    this.setState({ groupName: e.target.value, error: null });
  }

  handleSearchChange = (e) => {
    this.setState({ searchQuery: e.target.value });
  }

  toggleFriendSelection = (friendId) => {
    const { selectedFriends } = this.state;
    const newSelection = new Set(selectedFriends);
    
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    
    this.setState({ selectedFriends: newSelection, error: null });
  }

  handleCreateGroup = async () => {
    const { groupName, selectedFriends } = this.state;

    // Validation
    if (!groupName.trim()) {
      this.setState({ error: 'Vui lòng nhập tên nhóm' });
      return;
    }

    if (selectedFriends.size < 2) {
      this.setState({ error: 'Vui lòng chọn ít nhất 2 thành viên' });
      return;
    }

    try {
      this.setState({ loading: true, error: null });

      // Call API để tạo nhóm
      const response = await api.createGroup({
        name: groupName.trim(),
        members: Array.from(selectedFriends)
      });

      if (response.success) {
        this.setState({
          successMessage: 'Tạo nhóm thành công!',
          loading: false
        });

        // Reload conversations list để hiển thị nhóm mới
        const { loadConversations } = this.context;
        if (loadConversations) {
          await loadConversations();
        }

        // Đóng modal sau 1 giây
        setTimeout(() => {
          this.props.onClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Create group error:', error);
      this.setState({
        error: error.response?.data?.message || 'Không thể tạo nhóm',
        loading: false
      });
    }
  }

  handleOverlayClick = (e) => {
    if (e.target.className === 'create-group-modal-overlay') {
      this.props.onClose();
    }
  }

  getFilteredFriends = () => {
    const { friends } = this.context;
    const { searchQuery } = this.state;

    if (!searchQuery.trim()) {
      return friends;
    }

    const query = searchQuery.toLowerCase();
    return friends.filter(friend => 
      friend.fullName?.toLowerCase().includes(query) ||
      friend.username?.toLowerCase().includes(query)
    );
  }

  render() {
    const { groupName, selectedFriends, searchQuery, loading, error, successMessage } = this.state;
    const { friends } = this.context;
    const filteredFriends = this.getFilteredFriends();

    return (
      <div className="create-group-modal-overlay" onClick={this.handleOverlayClick}>
        <div className="create-group-modal">
          {/* Header */}
          <div className="modal-header">
            <h2>
              <span className="icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              Tạo Nhóm Chat
            </h2>
            <button className="close-btn" onClick={this.props.onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Group Name Input */}
            <div className="group-name-section">
              <label htmlFor="groupName">Tên nhóm</label>
              <input
                id="groupName"
                type="text"
                className="group-name-input"
                placeholder="Nhập tên nhóm chat..."
                value={groupName}
                onChange={this.handleGroupNameChange}
                maxLength={50}
                autoFocus
              />
              <div className="character-count">
                {groupName.length}/50
              </div>
            </div>

            {/* Selected Members Preview */}
            {selectedFriends.size > 0 && (
              <div className="selected-members-preview">
                <div className="preview-label">
                  Đã chọn {selectedFriends.size} thành viên
                </div>
                <div className="selected-members-chips">
                  {(friends || [])
                    .filter(friend => selectedFriends.has(friend._id))
                    .map(friend => (
                      <div key={friend._id} className="member-chip">
                        <div className="chip-avatar">
                          <img 
                            src={friend.avatar && friend.avatar.startsWith('http') 
                              ? friend.avatar 
                              : friend.avatar
                              ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${friend.avatar}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName || friend.username)}&size=80&background=8b5cf6&color=fff`
                            } 
                            alt={friend.fullName} 
                          />
                        </div>
                        <span className="chip-name">{friend.fullName || friend.username}</span>
                        <button 
                          className="chip-remove"
                          onClick={() => this.toggleFriendSelection(friend._id)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Search Friends */}
            <div className="search-friends-section">
              <label>Chọn thành viên</label>
              <div className="search-box">
                <span className="search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm bạn bè..."
                  value={searchQuery}
                  onChange={this.handleSearchChange}
                  className="search-input"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="friends-list">
              {filteredFriends.length === 0 ? (
                <div className="no-friends">
                  <span className="no-friends-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </span>
                  <p>Không tìm thấy bạn bè</p>
                  <small>Thêm bạn bè để tạo nhóm chat</small>
                </div>
              ) : (
                filteredFriends.map(friend => (
                  <div 
                    key={friend._id} 
                    className={`friend-item ${selectedFriends.has(friend._id) ? 'selected' : ''}`}
                    onClick={() => this.toggleFriendSelection(friend._id)}
                  >
                    <div className="friend-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedFriends.has(friend._id)}
                        onChange={() => {}}
                      />
                      <span className="checkmark"></span>
                    </div>

                    <div className="friend-avatar">
                      <img 
                        src={friend.avatar && friend.avatar.startsWith('http') 
                          ? friend.avatar 
                          : friend.avatar
                          ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${friend.avatar}`
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName || friend.username)}&size=80&background=8b5cf6&color=fff`
                        } 
                        alt={friend.fullName} 
                      />
                    </div>

                    <div className="friend-info">
                      <div className="friend-name">{friend.fullName || friend.username}</div>
                      <div className="friend-username">@{friend.username}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="error-message">
                <span className="error-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </span>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                <span className="success-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {successMessage}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button 
              className="cancel-btn"
              onClick={this.props.onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button 
              className="create-btn"
              onClick={this.handleCreateGroup}
              disabled={loading || selectedFriends.size === 0 || !groupName.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Đang tạo...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  Tạo nhóm ({selectedFriends.size})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default CreateGroupModal;
