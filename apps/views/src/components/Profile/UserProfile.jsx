import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import '../../styles/Profile.css';

class UserProfile extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      user: null,
      loading: true,
      redirectToEdit: false
    };
  }

  componentDidMount() {
    this.loadUserProfile();
  }

  loadUserProfile = () => {
    const { user } = this.context;
    if (user) {
      this.setState({ user, loading: false });
    }
  };

  handleEditClick = () => {
    this.setState({ redirectToEdit: true });
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
    const { user, loading, redirectToEdit } = this.state;

    if (redirectToEdit) {
      return <Navigate to="/profile/edit" replace />;
    }

    if (loading || !user) {
      return (
        <div className="profile-container">
          <div className="profile-loading">Đang tải...</div>
        </div>
      );
    }

    const avatarUrl = user.avatar 
      ? `${(process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '')}${user.avatar}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&size=200&background=8b5cf6&color=fff`;

    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-cover"></div>
            <button className="btn-edit-profile" onClick={this.handleEditClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Chỉnh sửa
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
          </div>

          <div className="profile-details">
            <div className="profile-detail-item">
              <div className="detail-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="detail-content">
                <span className="detail-label">Email</span>
                <span className="detail-value">{user.email}</span>
              </div>
            </div>

            {user.phone && (
              <div className="profile-detail-item">
                <div className="detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Số điện thoại</span>
                  <span className="detail-value">{user.phone}</span>
                </div>
              </div>
            )}

            <div className="profile-detail-item">
              <div className="detail-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="detail-content">
                <span className="detail-label">Ngày sinh</span>
                <span className="detail-value">{this.formatDate(user.dateOfBirth)}</span>
              </div>
            </div>

            <div className="profile-detail-item">
              <div className="detail-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="detail-content">
                <span className="detail-label">Giới tính</span>
                <span className="detail-value">{this.getGenderText(user.gender)}</span>
              </div>
            </div>

            {user.location && (
              <div className="profile-detail-item">
                <div className="detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Địa điểm</span>
                  <span className="detail-value">{user.location}</span>
                </div>
              </div>
            )}

            {user.website && (
              <div className="profile-detail-item">
                <div className="detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Website</span>
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="detail-value detail-link">
                    {user.website}
                  </a>
                </div>
              </div>
            )}

            <div className="profile-detail-item">
              <div className="detail-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
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

export default UserProfile;
