import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import api from '../../services/api.js';
import '../../styles/CreateGroupModal.css';

class CreateGroupModal extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      selectedFriends: new Set(),
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
    const filteredFriends = this.getFilteredFriends();

    return (
      <div className="create-group-modal-overlay" onClick={this.handleOverlayClick}>
        <div className="create-group-modal">
          {/* Header */}
          <div className="modal-header">
            <h2>
              <span className="icon">👥</span>
              Tạo Nhóm Chat
            </h2>
            <button className="close-btn" onClick={this.props.onClose}>
              <span>✕</span>
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
                  {filteredFriends
                    .filter(friend => selectedFriends.has(friend._id))
                    .map(friend => (
                      <div key={friend._id} className="member-chip">
                        <div className="chip-avatar">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.fullName} />
                          ) : (
                            <div className="avatar-placeholder">
                              {friend.fullName?.charAt(0) || friend.username?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="chip-name">{friend.fullName || friend.username}</span>
                        <button 
                          className="chip-remove"
                          onClick={() => this.toggleFriendSelection(friend._id)}
                        >
                          ✕
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
                <span className="search-icon">🔍</span>
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
                  <span className="no-friends-icon">👥</span>
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
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.fullName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {friend.fullName?.charAt(0) || friend.username?.charAt(0)}
                        </div>
                      )}
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
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                <span className="success-icon">✅</span>
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
                  <span className="create-icon">✨</span>
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
