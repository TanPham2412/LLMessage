import React, { Component } from 'react';
import api from '../../services/api';
import '../../styles/Admin.css';

class AdminUsers extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      users: [],
      loading: false,
      error: null,
      search: '',
      roleFilter: 'all', // all, user, admin, moderator
      statusFilter: 'all', // all, active, suspended, locked
      page: 1,
      pageSize: 10,
      totalUsers: 0,
      editingUser: null
    };
  }

  componentDidMount() {
    this.loadUsers();
  }

  loadUsers = async () => {
    try {
      this.setState({ loading: true });
      
      const { search, roleFilter, statusFilter, page, pageSize } = this.state;
      
      const params = {
        page,
        limit: pageSize,
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter })
      };

      const response = await api.getAllUsersWithStatus(params);
      
      console.log('API Response:', response);
      console.log('Users data:', response.data);
      
      // Filter by isOnline status
      let filteredUsers = response.data || [];
      if (statusFilter !== 'all') {
        const isActiveFilter = statusFilter === 'active';
        filteredUsers = filteredUsers.filter(user => user.isOnline === isActiveFilter);
      }
      
      this.setState({
        users: filteredUsers,
        totalUsers: response.pagination?.total || 0,
        loading: false,
        error: null
      });
    } catch (err) {
      this.setState({
        error: err.response?.data?.message || 'Lỗi khi tải danh sách người dùng',
        loading: false
      });
    }
  };

  handleSearch = (e) => {
    this.setState({ 
      search: e.target.value,
      page: 1 
    }, this.loadUsers);
  };

  handleRoleFilter = (e) => {
    this.setState({ 
      roleFilter: e.target.value,
      page: 1 
    }, this.loadUsers);
  };

  handleStatusFilter = (e) => {
    this.setState({ 
      statusFilter: e.target.value,
      page: 1 
    }, this.loadUsers);
  };

  handlePrevPage = () => {
    if (this.state.page > 1) {
      this.setState({ page: this.state.page - 1 }, this.loadUsers);
    }
  };

  handleNextPage = () => {
    const { page, pageSize, totalUsers } = this.state;
    if (page * pageSize < totalUsers) {
      this.setState({ page: page + 1 }, this.loadUsers);
    }
  };

  handleBlockUser = async (userId) => {
    if (window.confirm('Xác nhận khóa tài khoản này?')) {
      try {
        await api.adminBlockUser(userId);
        this.loadUsers();
      } catch (err) {
        alert('Lỗi: ' + (err.response?.data?.message || 'Không thể khóa tài khoản'));
      }
    }
  };

  handleUnblockUser = async (userId) => {
    if (window.confirm('Xác nhận mở khóa tài khoản này?')) {
      try {
        await api.adminUnblockUser(userId);
        this.loadUsers();
      } catch (err) {
        alert('Lỗi: ' + (err.response?.data?.message || 'Không thể mở khóa tài khoản'));
      }
    }
  };

  handleDeleteUser = async (userId) => {
    if (window.confirm('Xác nhận xóa tài khoản này? Hành động này không thể hoàn tác!')) {
      try {
        await api.delete(`/users/${userId}`);
        this.loadUsers();
      } catch (err) {
        alert('Lỗi: ' + (err.response?.data?.message || 'Không thể xóa tài khoản'));
      }
    }
  };

  getStatusColor = (isOnline) => {
    return isOnline ? '#10b981' : '#ef4444';
  };

  getStatusText = (isOnline) => {
    return isOnline ? '✅ Hoạt động' : '❌ Không hoạt động';
  };

  render() {
    const { users, loading, error, search, roleFilter, statusFilter, page, pageSize, totalUsers } = this.state;
    const totalPages = Math.ceil(totalUsers / pageSize);

    return (
      <div className="admin-container">
        <div className="admin-header" style={{ marginBottom: '20px' }}>
          <h1>👥 Quản Lý Người Dùng</h1>
          <div className="admin-nav">
            <a href="/admin" className="btn-link">← Quay lại Dashboard</a>
            <a href="/" className="btn-link">Quay lại Chat</a>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Filters Section */}
        <div className="admin-filters" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={this.handleSearch}
            style={{ 
              flex: 1, 
              padding: '10px 12px', 
              borderRadius: '6px', 
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f1f5f9'
            }}
          />

          <select
            value={roleFilter}
            onChange={this.handleRoleFilter}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '6px', 
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f1f5f9'
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">Người dùng</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>

          <select
            value={statusFilter}
            onChange={this.handleStatusFilter}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '6px', 
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f1f5f9'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">✅ Hoạt động</option>
            <option value="inactive">❌ Không hoạt động</option>
          </select>

          <button 
            onClick={this.loadUsers}
            style={{
              padding: '10px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔄 Làm Mới
          </button>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          {loading ? (
            <p style={{ color: '#cbd5e1' }}>⏳ Đang tải...</p>
          ) : users.length === 0 ? (
            <p style={{ color: '#cbd5e1' }}>Không tìm thấy người dùng</p>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#1e293b',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '2px solid #334155' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#f1f5f9' }}>Tên</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#f1f5f9' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#f1f5f9' }}>Vai Trò</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#f1f5f9' }}>Trạng Thái</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#f1f5f9' }}>Cảnh Báo</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#f1f5f9' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr 
                    key={user._id}
                    style={{ 
                      borderBottom: '1px solid #334155',
                      background: idx % 2 === 0 ? '#1e293b' : '#0f172a'
                    }}
                  >
                    <td style={{ padding: '12px', color: '#f1f5f9' }}>
                      <strong>{user.username || 'N/A'}</strong>
                    </td>
                    <td style={{ padding: '12px', color: '#cbd5e1' }}>{user.email}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        background: user.role === 'admin' ? '#7c2d12' : '#1e3a8a',
                        color: user.role === 'admin' ? '#fecaca' : '#bfdbfe',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        color: user.isOnline ? '#86efac' : '#fecaca',
                        fontWeight: 'bold',
                        background: user.isOnline ? '#064e3b' : '#7c2d12',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'inline-block'
                      }}>
                        {this.getStatusText(user.isOnline)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        background: (user.warnings && user.warnings > 0) ? '#78350f' : '#064e3b',
                        color: (user.warnings && user.warnings > 0) ? '#fef3c7' : '#86efac',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {(user.warnings && typeof user.warnings === 'number' && user.warnings > 0) ? `${user.warnings} ⚠️` : '0 ✅'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => this.handleDeleteUser(user._id)}
                          style={{
                            padding: '4px 8px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ 
            marginTop: '20px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <button
              onClick={this.handlePrevPage}
              disabled={page === 1}
              style={{
                padding: '8px 16px',
                background: page === 1 ? '#334155' : '#3b82f6',
                color: page === 1 ? '#64748b' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: page === 1 ? 'default' : 'pointer'
              }}
            >
              ← Trang Trước
            </button>

            <span style={{ fontWeight: 'bold', color: '#f1f5f9' }}>
              Trang {page} / {totalPages}
            </span>

            <button
              onClick={this.handleNextPage}
              disabled={page >= totalPages}
              style={{
                padding: '8px 16px',
                background: page >= totalPages ? '#334155' : '#3b82f6',
                color: page >= totalPages ? '#64748b' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: page >= totalPages ? 'default' : 'pointer'
              }}
            >
              Trang Sau →
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default AdminUsers;
