import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import '../../styles/Profile.css';

class EditProfile extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      fullName: '',
      bio: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      location: '',
      website: '',
      avatar: null,
      avatarPreview: null,
      loading: false,
      error: '',
      success: '',
      redirectToProfile: false
    };

    this.fileInputRef = React.createRef();
  }

  componentDidMount() {
    const { user } = this.context;
    if (user) {
      this.setState({
        fullName: user.fullName || '',
        bio: user.bio || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        phone: user.phone || '',
        location: user.location || '',
        website: user.website || ''
      });
    }
  }

  handleChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
      error: '',
      success: ''
    });
  };

  handleAvatarClick = () => {
    this.fileInputRef.current.click();
  };

  handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        this.setState({ error: 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB' });
        return;
      }

      if (!file.type.startsWith('image/')) {
        this.setState({ error: 'Vui lòng chọn file ảnh' });
        return;
      }

      this.setState({
        avatar: file,
        avatarPreview: URL.createObjectURL(file),
        error: ''
      });
    }
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    
    const { fullName, bio, dateOfBirth, gender, phone, location, website, avatar } = this.state;

    this.setState({ loading: true, error: '', success: '' });

    try {
      // Upload avatar if changed
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        
        await api.uploadAvatar(formData);
      }

      // Update profile information
      const profileData = {
        fullName,
        bio,
        dateOfBirth: dateOfBirth || null,
        gender,
        phone,
        location,
        website
      };

      const response = await api.updateProfile(profileData);

      if (response.success) {
        // Update context
        this.context.updateUser(response.data);

        this.setState({
          loading: false,
          success: 'Cập nhật profile thành công!',
          avatar: null,
          avatarPreview: null
        });

        // Redirect to profile page after 1.5 seconds
        setTimeout(() => {
          this.setState({ redirectToProfile: true });
        }, 1500);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      this.setState({
        loading: false,
        error: error.response?.data?.message || 'Cập nhật profile thất bại'
      });
    }
  };

  handleCancel = () => {
    this.setState({ redirectToProfile: true });
  };

  render() {
    const {
      fullName,
      bio,
      dateOfBirth,
      gender,
      phone,
      location,
      website,
      avatarPreview,
      loading,
      error,
      success,
      redirectToProfile
    } = this.state;

    const { user } = this.context;

    if (redirectToProfile) {
      return <Navigate to="/profile" replace />;
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    const currentAvatarUrl = avatarPreview || (user.avatar 
      ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.avatar}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&size=200&background=8b5cf6&color=fff`);

    return (
      <div className="profile-container">
        <div className="edit-profile-card">
          <div className="edit-profile-header">
            <h1>Chỉnh sửa profile</h1>
            <button className="btn-close" onClick={this.handleCancel}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={this.handleSubmit} className="edit-profile-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="avatar-upload-section">
              <div className="avatar-preview" onClick={this.handleAvatarClick}>
                <img src={currentAvatarUrl} alt="Avatar" />
                <div className="avatar-overlay">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Thay đổi ảnh</span>
                </div>
              </div>
              <input
                type="file"
                ref={this.fileInputRef}
                onChange={this.handleAvatarChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <p className="avatar-hint">Nhấn vào ảnh để thay đổi (Tối đa 10MB)</p>
            </div>

            <div className="form-group">
              <label htmlFor="fullName">Họ và tên</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={this.handleChange}
                placeholder="Nhập họ và tên của bạn"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">Giới thiệu bản thân</label>
              <textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={this.handleChange}
                placeholder="Viết một vài dòng về bạn..."
                rows="4"
                maxLength="200"
                disabled={loading}
              />
              <span className="char-count">{bio.length}/200</span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dateOfBirth">Ngày sinh</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={dateOfBirth}
                  onChange={this.handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Giới tính</label>
                <select
                  id="gender"
                  name="gender"
                  value={gender}
                  onChange={this.handleChange}
                  disabled={loading}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={phone}
                onChange={this.handleChange}
                placeholder="Nhập số điện thoại"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Địa điểm</label>
              <input
                type="text"
                id="location"
                name="location"
                value={location}
                onChange={this.handleChange}
                placeholder="Thành phố, quốc gia"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={website}
                onChange={this.handleChange}
                placeholder="https://your-website.com"
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={this.handleCancel}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-save"
                disabled={loading}
              >
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default EditProfile;
