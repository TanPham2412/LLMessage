import React, { Component } from 'react';
import api from '../../services/api';
import '../../styles/Admin.css';

class AdminMessages extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      messages: [],
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1
    };
  }

  componentDidMount() {
    this.loadMessages();
  }

  loadMessages = async (page = 1) => {
    try {
      this.setState({ loading: true, error: null });
      
      const response = await api.getAllMessages({
        page,
        limit: 50
      });

      if (response.success) {
        this.setState({
          messages: response.data,
          currentPage: response.pagination.page,
          totalPages: response.pagination.pages,
          loading: false
        });
      }
    } catch (error) {
      this.setState({
        error: 'Không thể tải tin nhắn',
        loading: false
      });
    }
  };

  handleDelete = async (messageId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) {
      return;
    }

    try {
      const response = await api.deleteMessage(messageId);
      
      if (response.success) {
        this.loadMessages(this.state.currentPage);
        alert('Xóa tin nhắn thành công');
      }
    } catch (error) {
      alert('Xóa tin nhắn thất bại');
    }
  };

  handlePageChange = (page) => {
    this.loadMessages(page);
  };

  formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  render() {
    const { messages, loading, error, currentPage, totalPages } = this.state;

    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Quản Lý Tin Nhắn</h1>
          <div className="admin-nav">
            <a href="/admin" className="btn-link">Bảng Điều Khiển</a>
            <a href="/" className="btn-link">Quay lại Chat</a>
          </div>
        </div>

        <div className="admin-content">
          {error && <div className="error-message">{error}</div>}
          {loading && <div className="loading">Đang tải tin nhắn...</div>}

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người gửi</th>
                  <th>Nội dung</th>
                  <th>Loại</th>
                  <th>Cuộc trò chuyện</th>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message._id}>
                    <td>
                      {message.sender?.username || 'Unknown'}
                    </td>
                    <td className="message-content-cell">
                      {message.type === 'text' && (
                        <span>{message.content}</span>
                      )}
                      {message.type === 'image' && (
                        <span>🖼️ Hình ảnh: {message.fileName}</span>
                      )}
                      {message.type === 'file' && (
                        <span>📎 Tệp tin: {message.fileName}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${message.type}`}>
                        {message.type}
                      </span>
                    </td>
                    <td>
                      {message.conversation?.name || 'Riêng tư'}
                    </td>
                    <td>{this.formatTime(message.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => this.handleDelete(message._id)}
                        className="btn-delete"
                      >
                        Xóa
                      </button>
                    </td>
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

export default AdminMessages;
