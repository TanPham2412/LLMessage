import React, { Component } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import api from '../../services/api';
import '../../styles/Profile.css';

class PublicProfile extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      user: null,
      loading: true,
      error: null,
      isFriend: false,
      isCurrentUser: false
    };
  }

  componentDidMount() {
    this.loadUserProfile();
    this.checkFriendship();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.loadUserProfile();
      this.checkFriendship();
    }
  }

  loadUserProfile = async () => {
    try {
      const { userId } = this.props;
      const currentUser = this.context.user;
      
      // Kiểm tra nếu đang xem profile của chính mình
      if (currentUser && userId === currentUser._id) {
        this.setState({
          user: currentUser,
          loading: false,
          isCurrentUser: true
        });
        return;
      }

      const response = await api.getUserById(userId);
      
      if (response.success) {
        this.setState({
          user: response.data,
          loading: false,
          isCurrentUser: false
        });
      } else {
        this.setState({
          error: 'Không thể tải thông tin người dùng',
          loading: false
        });
      }
    } catch (error) {
      console.error('Load user profile error:', error);
      this.setState({
        error: 'Không thể tải thông tin người dùng',
        loading: false
      });
    }
  };

  checkFriendship = async () => {
    try {
      const response = await api.getFriends();
      if (response.success) {
        const isFriend = response.data.some(friend => friend._id === this.props.userId);
        this.setState({ isFriend });
      }
    } catch (error) {
      console.error('Check friendship error:', error);
    }
  };

  handleAddFriend = async () => {
    try {
      const response = await api.sendFriendRequest(this.props.userId);
      if (response.success) {
        alert('Đã gửi lời mời kết bạn!');
      }
    } catch (error) {
      console.error('Send friend request error:', error);
      alert(error.response?.data?.message || 'Không thể gửi lời mời kết bạn');
    }
  };

  handleRemoveFriend = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy kết bạn?')) {
      return;
    }

    try {
      const response = await api.removeFriend(this.props.userId);
      if (response.success) {
        this.setState({ isFriend: false });
        alert('Đã hủy kết bạn!');
      }
    } catch (error) {
      console.error('Remove friend error:', error);
      alert(error.response?.data?.message || 'Không thể hủy kết bạn');
    }
  };

  handleSendMessage = async () => {
    try {
      const response = await api.createConversation(this.props.userId);
      if (response.success) {
        // Lưu conversationId để ChatHome tự động mở
        localStorage.setItem('openConversationId', response.data._id);
        // Navigate về trang chat
        this.props.navigate('/');
      }
    } catch (error) {
      console.error('Create conversation error:', error);
    }
  };

  handleBack = () => {
    this.props.navigate(-1);
  };

  formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  getGenderText = (gender) => {
    const genderMap = {
      male: 'Nam',
      female: 'Nữ',
      other: 'Khác'
    };
    return genderMap[gender] || 'Chưa cập nhật';
  };

  render() {
    const { user, loading, error, isFriend, isCurrentUser } = this.state;

    if (loading) {
      return (
        <div className="profile-container">
          <div className="profile-loading">Đang tải...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="profile-container">
          <div className="profile-card">
            <div className="error-message">{error}</div>
            <button className="btn-back" onClick={this.handleBack}>
              ← Quay lại
            </button>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="profile-container">
          <div className="profile-loading">Không tìm thấy người dùng</div>
        </div>
      );
    }

    const avatarUrl = user.avatar && user.avatar.startsWith('http')
      ? user.avatar
      : user.avatar
      ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.avatar}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&size=200&background=8b5cf6&color=fff`;

    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-cover"></div>
            <button className="btn-back-profile" onClick={this.handleBack}>
              ← Quay lại
            </button>
          </div>

          <div className="profile-avatar-section">
            <div className="profile-avatar">
              <img src={avatarUrl} alt={user.fullName || user.username} />
              <div className={`profile-status ${user.isOnline ? 'online' : 'offline'}`}></div>
            </div>
          </div>

          <div className="profile-info">
            <h1 className="profile-name">{user.fullName || user.username}</h1>
            <p className="profile-username">@{user.username}</p>
            {user.bio && <p className="profile-bio">{user.bio}</p>}
            {user.role === 'admin' && (
              <span className="profile-badge admin">Admin</span>
            )}
            
            {/* Action buttons */}
            {!isCurrentUser && (
              <div className="profile-actions">
                <button className="btn-action primary" onClick={this.handleSendMessage}>
                  💬 Nhắn tin
                </button>
                {isFriend ? (
                  <button className="btn-action danger" onClick={this.handleRemoveFriend}>
                    🚫 Hủy kết bạn
                  </button>
                ) : (
                  <button className="btn-action" onClick={this.handleAddFriend}>
                    👥 Kết bạn
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="profile-details">
            {user.email && (
              <div className="profile-detail-item">
                <div className="detail-icon">📧</div>
                <div className="detail-content">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user.email}</span>
                </div>
              </div>
            )}

            {user.dateOfBirth && (
              <div className="profile-detail-item">
                <div className="detail-icon">🎂</div>
                <div className="detail-content">
                  <span className="detail-label">Ngày sinh</span>
                  <span className="detail-value">{this.formatDate(user.dateOfBirth)}</span>
                </div>
              </div>
            )}

            {user.gender && (
              <div className="profile-detail-item">
                <div className="detail-icon">⚧</div>
                <div className="detail-content">
                  <span className="detail-label">Giới tính</span>
                  <span className="detail-value">{this.getGenderText(user.gender)}</span>
                </div>
              </div>
            )}

            {user.phone && (
              <div className="profile-detail-item">
                <div className="detail-icon">📱</div>
                <div className="detail-content">
                  <span className="detail-label">Số điện thoại</span>
                  <span className="detail-value">{user.phone}</span>
                </div>
              </div>
            )}

            {user.location && (
              <div className="profile-detail-item">
                <div className="detail-icon">📍</div>
                <div className="detail-content">
                  <span className="detail-label">Địa điểm</span>
                  <span className="detail-value">{user.location}</span>
                </div>
              </div>
            )}

            {user.website && (
              <div className="profile-detail-item">
                <div className="detail-icon">🌐</div>
                <div className="detail-content">
                  <span className="detail-label">Website</span>
                  <a 
                    href={user.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    {user.website}
                  </a>
                </div>
              </div>
            )}

            <div className="profile-detail-item">
              <div className="detail-icon">📅</div>
              <div className="detail-content">
                <span className="detail-label">Tham gia</span>
                <span className="detail-value">{this.formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// Wrapper component để sử dụng hooks
const PublicProfileWithRouter = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  return <PublicProfile userId={userId} navigate={navigate} />;
};

export default PublicProfileWithRouter;
