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
      searchQuery: '',
      currentPage: 1,
      totalPages: 1,
      editingUser: null,
      editForm: {
        username: '',
        fullName: '',
        bio: ''
      }
    };
  }

  componentDidMount() {
    this.loadUsers();
  }

  loadUsers = async (page = 1) => {
    try {
      this.setState({ loading: true, error: null });
      
      const response = await api.getAllUsers({
        page,
        limit: 20,
        search: this.state.searchQuery
      });

      if (response.success) {
        this.setState({
          users: response.data,
          currentPage: response.pagination.page,
          totalPages: response.pagination.pages,
          loading: false
        });
      }
    } catch (error) {
      this.setState({
        error: 'Không thể tải danh sách người dùng',
        loading: false
      });
    }
  };

  handleSearch = (e) => {
    this.setState({ searchQuery: e.target.value });
  };

  handleSearchSubmit = (e) => {
    e.preventDefault();
    this.loadUsers(1);
  };

  handleEdit = (user) => {
    this.setState({
      editingUser: user._id,
      editForm: {
        username: user.username,
        fullName: user.fullName || '',
        bio: user.bio || ''
      }
    });
  };

  handleEditChange = (e) => {
    this.setState({
      editForm: {
        ...this.state.editForm,
        [e.target.name]: e.target.value
      }
    });
  };

  handleSaveEdit = async (userId) => {
    try {
      const response = await api.updateUser(userId, this.state.editForm);
      
      if (response.success) {
        this.setState({ editingUser: null });
        this.loadUsers(this.state.currentPage);
        alert('Cập nhật người dùng thành công');
      }
    } catch (error) {
      alert('Cập nhật người dùng thất bại');
    }
  };

  handleCancelEdit = () => {
    this.setState({ editingUser: null });
  };

  handleDelete = async (userId, username) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${username}"?`)) {
      return;
    }

    try {
      const response = await api.deleteUser(userId);
      
      if (response.success) {
        this.loadUsers(this.state.currentPage);
        alert('Xóa người dùng thành công');
      }
    } catch (error) {
      alert('Xóa người dùng thất bại');
    }
  };

  handlePageChange = (page) => {
    this.loadUsers(page);
  };

  render() {
    const { users, loading, error, searchQuery, currentPage, totalPages, editingUser, editForm } = this.state;

    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Quản Lý Người Dùng</h1>
          <div className="admin-nav">
            <a href="/admin" className="btn-link">Bảng Điều Khiển</a>
            <a href="/" className="btn-link">Quay lại Chat</a>
          </div>
        </div>

        <div className="admin-content">
          <div className="admin-toolbar">
            <form onSubmit={this.handleSearchSubmit} className="search-form">
              <input
                type="text"
                value={searchQuery}
                onChange={this.handleSearch}
                placeholder="Tìm kiếm người dùng..."
                className="search-input"
              />
              <button type="submit" className="btn-search">Tìm Kiếm</button>
            </form>
          </div>

          {error && <div className="error-message">{error}</div>}
          {loading && <div className="loading">Đang tải người dùng...</div>}

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên đăng nhập</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Giới thiệu</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    {editingUser === user._id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            name="username"
                            value={editForm.username}
                            onChange={this.handleEditChange}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="fullName"
                            value={editForm.fullName}
                            onChange={this.handleEditChange}
                            className="edit-input"
                          />
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <input
                            type="text"
                            name="bio"
                            value={editForm.bio}
                            onChange={this.handleEditChange}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <span className={`status ${user.isOnline ? 'online' : 'offline'}`}>
                            {user.isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => this.handleSaveEdit(user._id)}
                            className="btn-save"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={this.handleCancelEdit}
                            className="btn-cancel"
                          >
                            Hủy
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{user.username}</td>
                        <td>{user.fullName || '-'}</td>
                        <td>{user.email}</td>
                        <td>{user.bio || '-'}</td>
                        <td>
                          <span className={`status ${user.isOnline ? 'online' : 'offline'}`}>
                            {user.isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => this.handleEdit(user)}
                            className="btn-edit"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => this.handleDelete(user._id, user.username)}
                            className="btn-delete"
                          >
                            Xóa
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => this.handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-page"
              >
                Trước
              </button>
              
              <span className="page-info">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => this.handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn-page"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default AdminUsers;
