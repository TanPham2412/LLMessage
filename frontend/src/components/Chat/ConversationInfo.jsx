import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import api from '../../services/api.js';
import '../../styles/ConversationInfo.css';

const REPORT_REASONS = [
  'Quấy rối hoặc bắt nạt',
  'Lừa đảo hoặc gian lận',
  'Nội dung khiêu dâm',
  'Ngôn từ thù địch / phân biệt đối xử',
  'Thông tin sai lệch',
  'Spam hoặc quảng cáo',
  'Tự làm hại bản thân',
  'Lý do khác',
];

class ConversationInfo extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    this.state = {
      sectionCustomize: true,
      sectionActions: true,
      sectionPrivacy: true,
      showReportModal: false,
      reportReason: '',
      reportDescription: '',
      reportSubmitting: false,
      actionLoading: false,
    };
  }

  toggleSection = (section) => {
    this.setState(prev => ({ [section]: !prev[section] }));
  };

  isBlocked = (userId) => (this.context.blockedUsers || []).some(u => (u._id || u) === userId);
  isRestricted = (userId) => (this.context.restrictedUsers || []).some(u => (u._id || u) === userId);

  handleRestrict = async () => {
    const participant = this.getParticipant();
    if (!participant) return;
    const already = this.isRestricted(participant._id);
    const name = participant.fullName || participant.username;
    const msg = already
      ? `Bạn có chắc muốn bỏ hạn chế ${name}?`
      : `Bạn có chắc muốn hạn chế ${name}?\n\nHọ sẽ không thể thấy trạng thái online/offline của bạn.`;
    if (!window.confirm(msg)) return;
    this.setState({ actionLoading: true });
    try {
      if (already) { await api.unrestrictUser(participant._id); }
      else { await api.restrictUser(participant._id); }
      await this.context.loadBlockedAndRestricted();
      alert(already ? 'Đã bỏ hạn chế người dùng này' : 'Đã hạn chế người dùng này');
    } catch (err) { alert(err.response?.data?.message || 'Có lỗi xảy ra'); }
    finally { this.setState({ actionLoading: false }); }
  };

  handleBlock = async () => {
    const participant = this.getParticipant();
    if (!participant) return;
    const already = this.isBlocked(participant._id);
    const name = participant.fullName || participant.username;
    const msg = already
      ? `Bạn có chắc muốn bỏ chặn ${name}?`
      : `Bạn có chắc muốn chặn ${name}?\n\nHọ sẽ không thể nhắn tin cho bạn.`;
    if (!window.confirm(msg)) return;
    this.setState({ actionLoading: true });
    try {
      if (already) { await api.unblockUser(participant._id); }
      else { await api.blockUser(participant._id); }
      await this.context.loadBlockedAndRestricted();
      await this.context.loadConversations();
      alert(already ? 'Đã bỏ chặn người dùng này' : 'Đã chặn người dùng này');
    } catch (err) { alert(err.response?.data?.message || 'Có lỗi xảy ra'); }
    finally { this.setState({ actionLoading: false }); }
  };

  handleDelete = async () => {
    const { currentConversation } = this.context;
    if (!currentConversation) return;
    if (!window.confirm('Bạn có chắc muốn xóa đoạn chat này?\n\nLịch sử chat sẽ bị ẩn (chỉ ở phía bạn). Trò chuyện sẽ hiện lại khi có tin nhắn mới.')) return;
    this.setState({ actionLoading: true });
    try {
      await api.deleteConversation(currentConversation._id);
      await this.context.loadConversations();
      if (this.context.currentConversation?._id === currentConversation._id) {
        this.context.selectConversation(null);
      }
      this.props.onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xóa đoạn chat');
      this.setState({ actionLoading: false });
    }
  };

  handleOpenReport = () => this.setState({ showReportModal: true, reportReason: '', reportDescription: '' });
  handleCloseReport = () => this.setState({ showReportModal: false });

  handleSubmitReport = async () => {
    const participant = this.getParticipant();
    if (!participant) return;
    const { reportReason, reportDescription } = this.state;
    if (!reportReason) { alert('Vui lòng chọn lý do báo cáo'); return; }
    this.setState({ reportSubmitting: true });
    try {
      await api.reportUser(participant._id, reportReason, reportDescription);
      this.setState({ showReportModal: false });
      alert('Báo cáo đã được gửi đến quản trị viên. Cảm ơn bạn đã phản hồi!');
    } catch (err) { alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo'); }
    finally { this.setState({ reportSubmitting: false }); }
  };

  getParticipant = () => {
    const { currentConversation } = this.context;
    const currentUserId = localStorage.getItem('userId');
    if (!currentConversation || currentConversation.type === 'group') return null;
    return currentConversation.participants?.find(p => p._id !== currentUserId) || null;
  };

  getAvatarUrl = (participant) => {
    if (!participant) return null;
    if (participant.avatar) {
      if (participant.avatar.startsWith('http')) return participant.avatar;
      return `${process.env.REACT_APP_API_URL.replace('/api', '')}${participant.avatar}`;
    }
    const name = participant.fullName || participant.username || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=8b5cf6&color=fff`;
  };

  getConversationName = () => {
    const { currentConversation } = this.context;
    if (!currentConversation) return '';
    if (currentConversation.type === 'group') return currentConversation.name || 'Nhóm không tên';
    const p = this.getParticipant();
    return p?.fullName || p?.username || 'Chat';
  };

  renderSectionHeader = (label, sectionKey) => (
    <button className="conv-info-section-header" onClick={() => this.setState(prev => ({ [sectionKey]: !prev[sectionKey] }))}>
      <span>{label}</span>
      <svg
        className={`conv-info-chevron ${this.state[sectionKey] ? 'open' : ''}`}
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  );

  renderActionRow = (icon, label, danger = false, onClick = null, disabled = false) => (
    <button
      className={`conv-info-action-row${danger ? ' danger' : ''}`}
      onClick={onClick}
      disabled={disabled || !onClick}
    >
      <span className="conv-info-action-icon">{icon}</span>
      <span className="conv-info-action-label">{label}</span>
    </button>
  );

  renderReportModal = () => {
    const { reportReason, reportDescription, reportSubmitting } = this.state;
    const participant = this.getParticipant();
    const name = participant?.fullName || participant?.username || '';
    return (
      <div className="report-modal-overlay" onClick={this.handleCloseReport}>
        <div className="report-modal" onClick={e => e.stopPropagation()}>
          <div className="report-modal-header">
            <h3>Báo cáo {name}</h3>
            <button className="report-modal-close" onClick={this.handleCloseReport}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p className="report-modal-subtitle">Vui lòng cho chúng tôi biết vấn đề bạn đang gặp phải. Báo cáo của bạn sẽ được gửi đến quản trị viên.</p>
          <div className="report-reasons">
            {REPORT_REASONS.map(reason => (
              <label key={reason} className={`report-reason-item${reportReason === reason ? ' selected' : ''}`}>
                <input type="radio" name="reportReason" value={reason} checked={reportReason === reason} onChange={() => this.setState({ reportReason: reason })} />
                <span>{reason}</span>
              </label>
            ))}
          </div>
          <div className="report-description-wrap">
            <textarea
              className="report-description"
              placeholder="Mô tả thêm chi tiết (không bắt buộc)..."
              value={reportDescription}
              onChange={e => this.setState({ reportDescription: e.target.value })}
              rows={3}
              maxLength={500}
            />
            <span className="report-char-count">{reportDescription.length}/500</span>
          </div>
          <div className="report-modal-actions">
            <button className="report-cancel-btn" onClick={this.handleCloseReport} disabled={reportSubmitting}>Hủy</button>
            <button className="report-submit-btn" onClick={this.handleSubmitReport} disabled={!reportReason || reportSubmitting}>
              {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const { currentConversation, onlineUsers } = this.context;
    const { onClose } = this.props;
    const { sectionCustomize, sectionActions, sectionPrivacy, showReportModal, actionLoading } = this.state;

    if (!currentConversation) return null;

    const isGroup = currentConversation.type === 'group';
    const participant = this.getParticipant();
    const avatarUrl = isGroup ? null : this.getAvatarUrl(participant);
    const name = this.getConversationName();
    const isOnline = participant && onlineUsers instanceof Set
      ? onlineUsers.has(participant._id)
      : false;

    const blocked = participant ? this.isBlocked(participant._id) : false;
    const restricted = participant ? this.isRestricted(participant._id) : false;

    return (
      <>
      <div className="conv-info-panel">
        {/* Close button */}
        <button className="conv-info-close" onClick={onClose} title="Đóng">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="conv-info-scroll">
          {/* ── AVATAR + NAME HEADER ── */}
          <div className="conv-info-hero">
            <div className="conv-info-hero-avatar">
              {isGroup ? (
                <div className="conv-info-group-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
              ) : (
                <>
                  <img src={avatarUrl} alt={name} />
                  <span className={`conv-info-online-dot ${isOnline ? 'online' : 'offline'}`}></span>
                </>
              )}
            </div>
            <h2 className="conv-info-hero-name">{name}</h2>
            <p className="conv-info-hero-status">
              {isGroup
                ? `${currentConversation.participants?.length || 0} thành viên`
                : isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </p>

            {/* Quick action buttons */}
            <div className="conv-info-quick-actions">
              <div className="conv-info-quick-btn-wrap">
                <button className="conv-info-quick-btn" title="Gọi thoại">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.13 6.13l1.88-1.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </button>
                <span>Gọi thoại</span>
              </div>

              <div className="conv-info-quick-btn-wrap">
                <button className="conv-info-quick-btn" title="Gọi video">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </button>
                <span>Gọi video</span>
              </div>

              {!isGroup && participant && (
                <div className="conv-info-quick-btn-wrap">
                  <a className="conv-info-quick-btn" href={`/profile/${participant._id}`} title="Trang cá nhân">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </a>
                  <span>Trang cá nhân</span>
                </div>
              )}

              <div className="conv-info-quick-btn-wrap">
                <button className="conv-info-quick-btn" title="Tắt thông báo">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </button>
                <span>Thông báo</span>
              </div>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="conv-info-divider"/>

          {/* ── SECTION: TÙY CHỈNH ── */}
          {this.renderSectionHeader('Tùy chỉnh', 'sectionCustomize')}
          {sectionCustomize && (
            <div className="conv-info-section-body">
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                </svg>,
                'Chủ đề'
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>,
                'Cảm xúc nhanh'
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6"/>
                  <path d="M14 3v5h5"/>
                  <path d="M17.5 17.5 23 23"/>
                  <circle cx="19" cy="19" r="3"/>
                </svg>,
                'Biệt danh'
              )}
            </div>
          )}

          <div className="conv-info-divider"/>

          {/* ── SECTION: HÀNH ĐỘNG KHÁC ── */}
          {this.renderSectionHeader('Hành động khác', 'sectionActions')}
          {sectionActions && (
            <div className="conv-info-section-body">
              {!isGroup && this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>,
                `Tạo nhóm chat${participant ? ` với ${participant.fullName || participant.username}` : ''}`
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>,
                'Xem file phương tiện, file và liên kết'
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22"/>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
                </svg>,
                'Tin nhắn đã ghim'
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>,
                'Tìm kiếm trong cuộc trò chuyện'
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>,
                'Chia sẻ thông tin liên hệ'
              )}
            </div>
          )}

          <div className="conv-info-divider"/>

          {/* ── SECTION: QUYỀN RIÊNG TƯ ── */}
          {this.renderSectionHeader('Quyền riêng tư và hỗ trợ', 'sectionPrivacy')}
          {sectionPrivacy && (
            <div className="conv-info-section-body">
              {!isGroup && this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  <path d="M18.63 13A18 18 0 0 1 18 8 6 6 0 0 0 6.06 8c0 .2-.04.4-.06.6A18.13 18.13 0 0 1 3 19h15l.63-6z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>,
                restricted ? 'Bỏ hạn chế' : 'Hạn chế', false, this.handleRestrict, actionLoading
              )}
              {!isGroup && this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>,
                blocked ? 'Bỏ chặn' : 'Chặn', !blocked, this.handleBlock, actionLoading
              )}
              {!isGroup && this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>,
                'Báo cáo', false, this.handleOpenReport, actionLoading
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>,
                'Xóa đoạn chat', true, this.handleDelete, actionLoading
              )}
            </div>
          )}
        </div>
      </div>

      {showReportModal && this.renderReportModal()}
      </>
    );
  }
}

export default ConversationInfo;
