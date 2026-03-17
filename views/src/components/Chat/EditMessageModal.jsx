import React, { Component } from 'react';
import '../../styles/EditMessageModal.css';

class EditMessageModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: props.message?.content || '',
      isLoading: false,
      error: null
    };
  }

  handleContentChange = (e) => {
    this.setState({ content: e.target.value, error: null });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { content } = this.state;
    const { message, onSave, onCancel } = this.props;

    if (!content.trim()) {
      this.setState({ error: 'Nội dung tin nhắn không thể trống' });
      return;
    }

    if (content === message.content) {
      this.setState({ error: 'Tin nhắn không thay đổi' });
      return;
    }

    this.setState({ isLoading: true });

    try {
      await onSave(message._id, content.trim());
      onCancel();
    } catch (error) {
      this.setState({ 
        error: error.response?.data?.message || 'Lỗi khi chỉnh sửa tin nhắn',
        isLoading: false 
      });
    }
  };

  render() {
    const { onCancel } = this.props;
    const { content, isLoading, error } = this.state;

    return (
      <div className="modal-overlay" onClick={onCancel}>
        <div className="edit-message-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Chỉnh sửa tin nhắn</h3>
            <button className="close-btn" onClick={onCancel} type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={this.handleSubmit}>
            <div className="modal-content">
              <textarea
                value={content}
                onChange={this.handleContentChange}
                placeholder="Nhập nội dung tin nhắn..."
                className="edit-textarea"
                autoFocus
                disabled={isLoading}
              />
              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={onCancel}
                disabled={isLoading}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="btn-save"
                disabled={isLoading}
              >
                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default EditMessageModal;
