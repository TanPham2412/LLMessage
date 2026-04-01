import React, { Component } from 'react';
import api from '../../services/api';
import '../../styles/Admin.css';

class AdminViolations extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      violations: [],
      loading: true,
      error: null,
      page: 1,
      pageSize: 10,
      totalViolations: 0,
      expandedUserId: null
    };
  }

  componentDidMount() {
    this.loadViolations();
  }

  loadViolations = async () => {
    try {
      this.setState({ loading: true });
      
      const { page, pageSize } = this.state;
      
      const params = {
        page,
        limit: pageSize
      };

      const response = await api.getViolationStats(params);
      
      this.setState({
        violations: response.data || [],
        totalViolations: response.pagination?.total || 0,
        loading: false,
        error: null
      });
    } catch (err) {
      this.setState({
        error: err.response?.data?.message || 'Lỗi khi tải danh sách vi phạm',
        loading: false
      });
    }
  };

  handlePrevPage = () => {
    if (this.state.page > 1) {
      this.setState({ page: this.state.page - 1 }, this.loadViolations);
    }
  };

  handleNextPage = () => {
    const { page, pageSize, totalViolations } = this.state;
    if (page * pageSize < totalViolations) {
      this.setState({ page: page + 1 }, this.loadViolations);
    }
  };

  handleUnlock = async (userId) => {
    if (window.confirm('Xác nhận mở khóa tài khoản này?')) {
      try {
        await api.adminUnblockUser(userId);
        this.loadViolations();
      } catch (err) {
        alert('Lỗi: ' + (err.response?.data?.message || 'Không thể mở khóa'));
      }
    }
  };

  handleResetWarnings = async (userId) => {
    if (window.confirm('Xác nhận xóa tất cả cảnh báo cho người dùng này?')) {
      try {
        await api.resetWarnings(userId);
        this.loadViolations();
      } catch (err) {
        alert('Lỗi: ' + (err.response?.data?.message || 'Không thể xóa cảnh báo'));
      }
    }
  };

  toggleExpanded = (userId) => {
    this.setState(prevState => ({
      expandedUserId: prevState.expandedUserId === userId ? null : userId
    }));
  };

  getViolationColor = (violationType) => {
    const colors = {
      'abusive-language': '#ef4444',
      'spam': '#f59e0b',
      'inappropriate-content': '#f59e0b',
      'harassment': '#dc2626',
      'other': '#6b7280'
    };
    return colors[violationType] || '#6b7280';
  };

  getViolationLabel = (violationType) => {
    const labels = {
      'abusive-language': '🤬 Ngôn ngữ xúc phạm',
      'spam': '📢 Spam',
      'inappropriate-content': '⚠️ Nội dung không thích hợp',
      'harassment': '😠 Qu骚扰',
      'other': '❓ Khác'
    };
    return labels[violationType] || violationType;
  };

  render() {
    const { violations, loading, error, page, pageSize, totalViolations, expandedUserId } = this.state;
    const totalPages = Math.ceil(totalViolations / pageSize);

    return (
      <div className="admin-container">
        <div className="admin-header" style={{ marginBottom: '20px' }}>
          <h1>⚠️ Quản Lý Vi Phạm & Cảnh Báo</h1>
          <div className="admin-nav">
            <a href="/admin" className="btn-link">← Quay lại Dashboard</a>
            <a href="/" className="btn-link">Quay lại Chat</a>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div style={{ 
          marginBottom: '20px',
          padding: '12px',
          background: '#78350f',
          borderRadius: '6px',
          borderLeft: '4px solid #f59e0b',
          color: '#fef3c7'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            📊 <strong>Tổng cộng: {totalViolations}</strong> người dùng có cảnh báo
          </p>
        </div>

        {/* Violations List */}
        <div style={{ marginTop: '20px' }}>
          {loading ? (
            <p style={{ color: '#cbd5e1' }}>⏳ Đang tải...</p>
          ) : violations.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#cbd5e1' }}>
              ✅ Không có người dùng bị cảnh báo
            </p>
          ) : (
            <div>
              {violations.map((user, idx) => (
                <div
                  key={user._id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}
                >
                  {/* User Header */}
                  <div
                    onClick={() => this.toggleExpanded(user._id)}
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#0f172a',
                      cursor: 'pointer',
                      borderBottom: expandedUserId === user._id ? '1px solid #334155' : 'none'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px 0', color: '#f1f5f9' }}>
                        👤 {user.username || 'N/A'} <span style={{ fontSize: '14px', color: '#cbd5e1' }}>({user.email})</span>
                      </h3>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        <span style={{
                          background: user.accountStatus === 'locked' ? '#7c2d12' : '#064e3b',
                          color: user.accountStatus === 'locked' ? '#fecaca' : '#86efac',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          marginRight: '8px',
                          fontWeight: 'bold'
                        }}>
                          {user.accountStatus === 'locked' ? '🔒 Bị khóa' : '✅ Hoạt động'}
                        </span>
                        <span style={{
                          background: '#78350f',
                          color: '#fef3c7',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {(user.warnings && Array.isArray(user.warnings)) ? user.warnings.length : 0} ⚠️ Cảnh báo
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '20px', color: '#f1f5f9' }}>
                      {expandedUserId === user._id ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* User Details */}
                  {expandedUserId === user._id && (
                    <div style={{ padding: '16px', background: '#0f172a' }}>
                      <h4 style={{ marginTop: 0, color: '#f1f5f9' }}>📋 Chi Tiết Cảnh Báo:</h4>
                      
                      {user.warnings && Array.isArray(user.warnings) && user.warnings.length > 0 ? (
                        <div>
                          {user.warnings.map((warning, wIdx) => (
                            <div
                              key={wIdx}
                              style={{
                                background: '#1e293b',
                                padding: '12px',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                borderLeft: `4px solid ${this.getViolationColor(warning.violationType)}`,
                                color: '#f1f5f9'
                              }}
                            >
                              <div style={{ marginBottom: '4px' }}>
                                <span style={{
                                  background: this.getViolationColor(warning.violationType),
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  {this.getViolationLabel(warning.violationType)}
                                </span>
                              </div>
                              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                                <strong>Lý do:</strong> {warning.reason || 'Không có lý do'}
                              </p>
                              <p style={{ margin: '4px 0', fontSize: '13px', color: '#cbd5e1' }}>
                                📅 <strong>Ngày:</strong> {new Date(warning.date).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#cbd5e1' }}>Không có cảnh báo chi tiết</p>
                      )}

                      {/* Action Buttons */}
                      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                        {user.accountStatus === 'locked' && (
                          <button
                            onClick={() => this.handleUnlock(user._id)}
                            style={{
                              padding: '8px 16px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            🔓 Mở Khóa Tài Khoản
                          </button>
                        )}

                        <button
                          onClick={() => this.handleResetWarnings(user._id)}
                          style={{
                            padding: '8px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          🔄 Xóa Tất Cả Cảnh Báo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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

export default AdminViolations;
