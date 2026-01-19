import React, { Component } from 'react';
import '../../styles/Admin.css';

class AdminDashboard extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      stats: {
        totalUsers: 0,
        totalMessages: 0,
        onlineUsers: 0,
        totalConversations: 0
      }
    };
  }

  componentDidMount() {
    // Load dashboard stats
    // This is a placeholder - you can implement API calls
  }

  handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  render() {
    const { stats } = this.state;

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
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Tổng Người Dùng</h3>
              <p className="stat-number">{stats.totalUsers}</p>
            </div>

            <div className="stat-card">
              <h3>Tổng Tin Nhắn</h3>
              <p className="stat-number">{stats.totalMessages}</p>
            </div>

            <div className="stat-card">
              <h3>Đang Trực Tuyến</h3>
              <p className="stat-number">{stats.onlineUsers}</p>
            </div>

            <div className="stat-card">
              <h3>Cuộc Trò Chuyện</h3>
              <p className="stat-number">{stats.totalConversations}</p>
            </div>
          </div>

          <div className="admin-menu">
            <h2>Quản Lý</h2>
            <div className="menu-grid">
              <a href="/admin/users" className="menu-card">
                <h3>👥 Quản Lý Người Dùng</h3>
                <p>Quản lý người dùng, xem hồ sơ và phân quyền</p>
              </a>

              <a href="/admin/messages" className="menu-card">
                <h3>💬 Quản Lý Tin Nhắn</h3>
                <p>Xem và quản lý tất cả tin nhắn trong hệ thống</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default AdminDashboard;
