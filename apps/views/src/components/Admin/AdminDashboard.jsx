import React, { Component } from 'react';
import api from '../../services/api.js';
import '../../styles/Admin.css';

class AdminDashboard extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      stats: {
        totalUsers: 0,
        totalMessages: 0,
        onlineUsers: 0,
        totalConversations: 0,
        lockedAccounts: 0,
        usersWithWarnings: 0
      },
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.loadStats();
    // Refresh stats every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadStats();
    }, 30000);
  }

  componentWillUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadStats = async () => {
    try {
      this.setState({ loading: true, error: null });
      const response = await api.getDashboardStats();
      
      if (response.success) {
        this.setState({ 
          stats: response.data,
          loading: false 
        });
      } else {
        this.setState({ 
          error: response.message || 'Lỗi tải dữ liệu',
          loading: false 
        });
      }
    } catch (error) {
      console.error('Load stats error:', error);
      this.setState({ 
        error: 'Lỗi kết nối server',
        loading: false 
      });
    }
  };

  handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  render() {
    const { stats, loading, error } = this.state;

    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Bảng Điều Khiển Quản Trị</h1>
          <div className="admin-nav">
            <a href="/" className="btn-link">Quay lại Chat</a>
            <button onClick={this.handleLogout} className="btn-logout">
              Đăng Xuất
            </button>
          </div>
        </div>

        <div className="admin-content">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <h3>Tổng Người Dùng</h3>
              <p className="stat-number">
                {loading ? '...' : stats.totalUsers}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <h3>Tổng Tin Nhắn</h3>
              <p className="stat-number">
                {loading ? '...' : stats.totalMessages}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🟢</div>
              <h3>Đang Trực Tuyến</h3>
              <p className="stat-number">
                {loading ? '...' : stats.onlineUsers}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🗨️</div>
              <h3>Cuộc Trò Chuyện</h3>
              <p className="stat-number">
                {loading ? '...' : stats.totalConversations}
              </p>
            </div>

            <div className="stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="stat-icon">🔒</div>
              <h3>Tài Khoản Bị Khóa</h3>
              <p className="stat-number" style={{ color: '#fca5a5' }}>
                {loading ? '...' : stats.lockedAccounts}
              </p>
            </div>

            <div className="stat-card" style={{ borderColor: 'rgba(251, 146, 60, 0.3)' }}>
              <div className="stat-icon">⚠️</div>
              <h3>Người Dùng Bị Cảnh Báo</h3>
              <p className="stat-number" style={{ color: '#fed7aa' }}>
                {loading ? '...' : stats.usersWithWarnings}
              </p>
            </div>
          </div>

          <div className="admin-menu">
            <h2>Quản Lý</h2>
            <div className="menu-grid">
              <a href="/admin/users" className="menu-card">
                <h3>👥 Quản Lý Người Dùng</h3>
                <p>Quản lý người dùng, xem hồ sơ và cập nhật thông tin</p>
              </a>

              <a href="/admin/messages" className="menu-card">
                <h3>💬 Quản Lý Tin Nhắn</h3>
                <p>Xem và quản lý tất cả tin nhắn trong hệ thống</p>
              </a>

              <a href="/admin/violations" className="menu-card">
                <h3>⚠️ Quản Lý Vi Phạm</h3>
                <p>Xem danh sách cảnh báo và tài khoản bị khóa</p>
              </a>
            </div>
          </div>

          <button 
            onClick={this.loadStats} 
            className="btn-refresh"
            disabled={loading}
          >
            {loading ? '⏳ Đang tải...' : '🔄 Làm Mới'}
          </button>
        </div>
      </div>
    );
  }
}

export default AdminDashboard;
