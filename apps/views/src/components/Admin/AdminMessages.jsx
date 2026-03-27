import React, { Component } from 'react';
import api from '../../services/api';
import WarnModal from './WarnModal';
import '../../styles/Admin.css';

class AdminMessages extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      messages: [],
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      
      // Filter states
      search: '',
      selectedType: 'all',
      selectedSender: '',
      selectedConversation: '',
      dateFrom: '',
      dateTo: '',
      showDeleted: false,
      
      // Options for dropdowns
      senders: [],
      conversations: [],
      messageTypes: [
        { value: 'all', label: 'Tất cả loại' },
        { value: 'text', label: 'Văn bản' },
        { value: 'image', label: 'Hình ảnh' },
        { value: 'file', label: 'Tệp tin' }
      ],
      
      // Warning modal states
      showWarnModal: false,
      selectedMessageForWarning: null
    };
  }

  componentDidMount() {
    this.loadMessages();
    this.loadFilterOptions();
  }

  loadMessages = async (page = 1) => {
    try {
      this.setState({ loading: true, error: null });
      
      const filters = {
        page,
        limit: 50,
        search: this.state.search || undefined,
        type: this.state.selectedType !== 'all' ? this.state.selectedType : undefined,
        senderId: this.state.selectedSender || undefined,
        conversationId: this.state.selectedConversation || undefined,
        dateFrom: this.state.dateFrom || undefined,
        dateTo: this.state.dateTo || undefined,
        showDeleted: this.state.showDeleted
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const response = await api.getAllMessages(filters);

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
      console.error('Load messages error:', error);
    }
  };

  loadFilterOptions = async () => {
    try {
      // Get all messages to extract senders and conversations
      const response = await api.getAllMessages({ limit: 1000, page: 1 });
      
      if (response.success && response.data) {
        const senders = [...new Set(
          response.data
            .filter(msg => msg.sender)
            .map(msg => JSON.stringify({ _id: msg.sender._id, username: msg.sender.username }))
        )].map(str => JSON.parse(str));
        
        const conversations = [...new Set(
          response.data
            .filter(msg => msg.conversation)
            .map(msg => JSON.stringify({ 
              _id: msg.conversation._id, 
              name: msg.conversation.name || 'Riêng tư' 
            }))
        )].map(str => JSON.parse(str));

        this.setState({ senders, conversations });
      }
    } catch (error) {
      console.error('Load filter options error:', error);
    }
  };

  handleSearch = (e) => {
    this.setState({ search: e.target.value });
  };

  handleTypeChange = (e) => {
    this.setState({ selectedType: e.target.value });
  };

  handleSenderChange = (e) => {
    this.setState({ selectedSender: e.target.value });
  };

  handleConversationChange = (e) => {
    this.setState({ selectedConversation: e.target.value });
  };

  handleDateFromChange = (e) => {
    this.setState({ dateFrom: e.target.value });
  };

  handleDateToChange = (e) => {
    this.setState({ dateTo: e.target.value });
  };

  handleShowDeletedChange = (e) => {
    this.setState({ showDeleted: e.target.checked });
  };

  handleApplyFilters = () => {
    this.loadMessages(1);
  };

  handleClearFilters = () => {
    this.setState({
      search: '',
      selectedType: 'all',
      selectedSender: '',
      selectedConversation: '',
      dateFrom: '',
      dateTo: '',
      showDeleted: false
    }, () => this.loadMessages(1));
  };

  handleRestore = async (messageId) => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục tin nhắn này?')) {
      return;
    }

    try {
      const response = await api.restoreMessage(messageId);
      
      if (response.success) {
        this.loadMessages(this.state.currentPage);
        alert('Khôi phục tin nhắn thành công');
      }
    } catch (error) {
      alert('Khôi phục tin nhắn thất bại');
      console.error('Restore message error:', error);
    }
  };

  handlePageChange = (page) => {
    this.loadMessages(page);
  };

  handleOpenWarnModal = (message) => {
    this.setState({
      showWarnModal: true,
      selectedMessageForWarning: message
    });
  };

  handleCloseWarnModal = () => {
    this.setState({
      showWarnModal: false,
      selectedMessageForWarning: null
    });
  };

  handleWarningSuccess = (data) => {
    alert(`Cảnh báo đã gửi thành công! Người dùng đã nhận được ${data.warningCount} cảnh báo.`);
    this.loadMessages(this.state.currentPage);
  };

  formatTime = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  truncateText = (text, length = 50) => {
    if (!text) return '-';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  render() {
    const { 
      messages, loading, error, currentPage, totalPages,
      search, selectedType, selectedSender, selectedConversation,
      dateFrom, dateTo, showDeleted,
      senders, conversations, messageTypes
    } = this.state;

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
          {/* Filter Section */}
          <div style={styles.filterSection}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '20px' }}>🔍 Bộ Lọc Tin Nhắn</h3>
            
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label>Tìm kiếm:</label>
                <input
                  type="text"
                  value={search}
                  onChange={this.handleSearch}
                  placeholder="Nội dung hoặc tên tệp..."
                  style={styles.input}
                />
              </div>

              <div style={styles.filterGroup}>
                <label>Loại tin nhắn:</label>
                <select value={selectedType} onChange={this.handleTypeChange} style={styles.select}>
                  {messageTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label>Người gửi:</label>
                <select value={selectedSender} onChange={this.handleSenderChange} style={styles.select}>
                  <option value="">Tất cả</option>
                  {senders.map(sender => (
                    <option key={sender._id} value={sender._id}>{sender.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label>Cuộc trò chuyện:</label>
                <select value={selectedConversation} onChange={this.handleConversationChange} style={styles.select}>
                  <option value="">Tất cả</option>
                  {conversations.map(conv => (
                    <option key={conv._id} value={conv._id}>{conv.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label>Từ ngày:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={this.handleDateFromChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.filterGroup}>
                <label>Đến ngày:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={this.handleDateToChange}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.filterRow}>
              <div style={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={this.handleShowDeletedChange}
                  />
                  Hiển thị tin nhắn đã xóa
                </label>
              </div>

              <div style={styles.buttonGroup}>
                <button onClick={this.handleApplyFilters} style={styles.btnApply}>
                  🔍 Áp Dụng Bộ Lọc
                </button>
                <button onClick={this.handleClearFilters} style={styles.btnClear}>
                  ✖ Xóa Bộ Lọc
                </button>
              </div>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {loading && <div className="loading">Đang tải tin nhắn...</div>}

          {/* Messages Table */}
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người gửi</th>
                  <th>Nội dung</th>
                  <th>Loại</th>
                  <th>Cuộc trò chuyện</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message._id}>
                    <td>{message.sender?.username || 'Unknown'}</td>
                    <td className="message-content-cell">
                      {message.type === 'text' && (
                        <span title={message.content}>{this.truncateText(message.content)}</span>
                      )}
                      {message.type === 'image' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={message.fileUrl} 
                            alt={message.fileName || 'Hình ảnh'} 
                            style={{
                              maxWidth: '80px',
                              maxHeight: '80px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: '1px solid rgba(167, 139, 250, 0.3)'
                            }}
                            onClick={() => window.open(message.fileUrl, '_blank')}
                            title={`Click to view full size: ${message.fileName}`}
                          />
                          <span>{message.fileName || 'Hình ảnh'}</span>
                        </div>
                      )}
                      {message.type === 'file' && (
                        <span>📎 {message.fileName || 'Tệp tin'}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${message.type}`}>
                        {message.type === 'text' && 'Văn bản'}
                        {message.type === 'image' && 'Hình ảnh'}
                        {message.type === 'file' && 'Tệp tin'}
                      </span>
                    </td>
                    <td>{message.conversation?.name || 'Riêng tư'}</td>
                    <td>{this.formatTime(message.createdAt)}</td>
                    <td>
                      {message.isDeleted ? (
                        <span style={{ color: '#ff4444', fontWeight: 'bold' }}>❌ Đã xóa</span>
                      ) : (
                        <span style={{ color: '#44aa44', fontWeight: 'bold' }}>✓ Hoạt động</span>
                      )}
                    </td>
                    <td>
                      {message.isDeleted ? (
                        <button
                          onClick={() => this.handleRestore(message._id)}
                          style={styles.btnRestore}
                        >
                          🔄 Khôi phục
                        </button>
                      ) : (
                        <button
                          onClick={() => this.handleOpenWarnModal(message)}
                          style={styles.btnWarn}
                        >
                          ⚠️ Cảnh báo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {messages.length === 0 && !loading && (
              <div style={styles.emptyMessage}>Không tìm thấy tin nhắn</div>
            )}
          </div>

          {/* Pagination */}
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

        {/* Warn Modal */}
        {this.state.showWarnModal && this.state.selectedMessageForWarning && (
          <WarnModal
            userId={this.state.selectedMessageForWarning.sender._id}
            messageId={this.state.selectedMessageForWarning._id}
            message={this.state.selectedMessageForWarning}
            onClose={this.handleCloseWarnModal}
            onSuccess={this.handleWarningSuccess}
          />
        )}
      </div>
    );
  }
}

const styles = {
  filterSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
    alignItems: 'flex-end'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    color: '#cbd5e1'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
    color: '#cbd5e1'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid rgba(167, 139, 250, 0.3)',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#f1f5f9'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid rgba(167, 139, 250, 0.3)',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#f1f5f9',
    cursor: 'pointer',
    boxSizing: 'border-box',
    width: '100%'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  btnApply: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  btnClear: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  btnRestore: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  btnWarn: {
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
    fontSize: '16px'
  }
};

export default AdminMessages;
