import React, { Component } from 'react';
import api from '../../services/api';

class WarnModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedReason: '',
      loading: false,
      error: null
    };
  }

  violationReasons = [
    { value: 'violence', label: 'Nội dung bạo lực/xúc phạm' },
    { value: 'spam', label: 'Spam/nhiễu' },
    { value: 'explicit', label: 'Nội dung khiêu dâm' },
    { value: 'scam', label: 'Lừa đảo/scam' },
    { value: 'copyright', label: 'Nội dung vi phạm bản quyền' }
  ];

  handleReasonChange = (e) => {
    this.setState({ selectedReason: e.target.value });
  };

  handleSendWarning = async () => {
    const { selectedReason } = this.state;
    const { userId, messageId, onSuccess, onClose } = this.props;

    if (!selectedReason) {
      this.setState({ error: 'Vui lòng chọn lý do vi phạm' });
      return;
    }

    try {
      this.setState({ loading: true, error: null });

      // Debug: check current user role
      console.log('Attempting to warn user:', userId);
      const currentUserInfo = await api.getCurrentUser();
      console.log('Current user info:', currentUserInfo);

      const response = await api.warnUser(userId, messageId, selectedReason);

      if (response.success) {
        this.setState({ loading: false });
        if (onSuccess) {
          onSuccess(response.data);
        }
        onClose();
      } else {
        this.setState({ error: response.message });
      }
    } catch (error) {
      console.error('Warning send error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Lỗi khi gửi cảnh báo';
      this.setState({ error: errorMsg });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const { onClose, message } = this.props;
    const { selectedReason, loading, error } = this.state;

    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2>⚠️ Gửi Cảnh Báo Vi Phạm</h2>
            <button
              onClick={onClose}
              style={styles.closeButton}
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div style={styles.modalBody}>
            <div style={styles.messageInfo}>
              <p style={{ marginBottom: '10px' }}>
                <strong>Tin nhắn:</strong>
              </p>
              <div style={styles.messagePreview}>
                {message.type === 'text' && (
                  <span>{message.content.substring(0, 100)}...</span>
                )}
                {message.type === 'image' && (
                  <span>🖼️ Hình ảnh: {message.fileName}</span>
                )}
                {message.type === 'file' && (
                  <span>📎 Tệp tin: {message.fileName}</span>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Chọn lý do vi phạm:</label>
              <select
                value={selectedReason}
                onChange={this.handleReasonChange}
                style={styles.select}
                disabled={loading}
              >
                <option value="">-- Chọn lý do --</option>
                {this.violationReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div style={styles.errorMessage}>{error}</div>
            )}

            <div style={styles.warningInfo}>
              <p style={{ fontSize: '14px', color: '#888' }}>
                ℹ️ Người dùng sẽ nhận được cảnh báo. Nếu vi phạm quá 3 lần, tài khoản sẽ bị khóa.
              </p>
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button
              onClick={onClose}
              style={styles.btnCancel}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              onClick={this.handleSendWarning}
              style={{
                ...styles.btnSend,
                opacity: loading || !selectedReason ? 0.6 : 1,
                cursor: loading || !selectedReason ? 'not-allowed' : 'pointer'
              }}
              disabled={loading || !selectedReason}
            >
              {loading ? '⏳ Đang gửi...' : '📤 Gửi Cảnh Báo'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: '12px',
    border: '1px solid rgba(167, 139, 250, 0.3)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid rgba(167, 139, 250, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#cbd5e1',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '20px'
  },
  messageInfo: {
    marginBottom: '20px'
  },
  messagePreview: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    color: '#cbd5e1',
    fontSize: '14px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#cbd5e1',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid rgba(167, 139, 250, 0.3)',
    borderRadius: '6px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#f1f5f9',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box'
  },
  errorMessage: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  warningInfo: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    border: '1px solid rgba(251, 146, 60, 0.3)',
    color: '#fed7aa',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid rgba(167, 139, 250, 0.2)',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  btnCancel: {
    backgroundColor: 'rgba(100, 116, 139, 0.6)',
    color: '#f1f5f9',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  btnSend: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  }
};

export default WarnModal;
