import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import api from '../../services/api.js';
import '../../styles/ConversationInfo.css';

export const THEMES = [
  {
    id: 'default',
    name: 'Mặc định',
    preview: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    chatBg: `
      radial-gradient(ellipse at 15% 85%, rgba(139, 92, 246, 0.45) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 15%, rgba(236, 72, 153, 0.38) 0%, transparent 55%),
      radial-gradient(ellipse at 50% 50%, rgba(99, 32, 196, 0.18) 0%, transparent 65%),
      linear-gradient(135deg, #0d0520 0%, #1a0a2e 60%, #0a0e27 100%)`,
    bubbleSent: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    bubbleReceived: 'rgba(30, 20, 55, 0.88)',
  },
  {
    id: 'messenger',
    name: 'Messenger',
    preview: 'linear-gradient(135deg, #0084ff, #00c6ff)',
    chatBg: `
      radial-gradient(ellipse at 20% 80%, rgba(0, 132, 255, 0.4) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 20%, rgba(0, 198, 255, 0.3) 0%, transparent 55%),
      radial-gradient(ellipse at 55% 50%, rgba(0, 80, 180, 0.18) 0%, transparent 60%),
      linear-gradient(160deg, #000f22 0%, #001a3d 100%)`,
    bubbleSent: 'linear-gradient(135deg, #0084ff, #00c6ff)',
    bubbleReceived: 'rgba(10, 30, 65, 0.88)',
  },
  {
    id: 'spring',
    name: 'Mùa Xuân',
    preview: 'linear-gradient(135deg, #56ab2f, #a8e063)',
    chatBg: `
      radial-gradient(ellipse at 10% 70%, rgba(86, 171, 47, 0.38) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 20%, rgba(168, 224, 99, 0.25) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 95%, rgba(56, 142, 60, 0.3) 0%, transparent 45%),
      radial-gradient(ellipse at 70% 60%, rgba(100, 200, 60, 0.12) 0%, transparent 40%),
      linear-gradient(160deg, #030d06 0%, #091810 100%)`,
    bubbleSent: 'linear-gradient(135deg, #56ab2f, #a8e063)',
    bubbleReceived: 'rgba(10, 28, 12, 0.9)',
  },
  {
    id: 'summer',
    name: 'Mùa Hè',
    preview: 'linear-gradient(135deg, #f7971e, #ffd200)',
    chatBg: `
      radial-gradient(ellipse at 50% 5%, rgba(255, 210, 0, 0.45) 0%, transparent 55%),
      radial-gradient(ellipse at 10% 75%, rgba(247, 151, 30, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 80%, rgba(255, 140, 0, 0.2) 0%, transparent 45%),
      radial-gradient(ellipse at 40% 50%, rgba(200, 100, 0, 0.1) 0%, transparent 50%),
      linear-gradient(160deg, #0f0800 0%, #1e1000 60%, #2d1800 100%)`,
    bubbleSent: 'linear-gradient(135deg, #f7971e, #ffd200)',
    bubbleReceived: 'rgba(40, 25, 0, 0.9)',
  },
  {
    id: 'autumn',
    name: 'Mùa Thu',
    preview: 'linear-gradient(135deg, #e96c1e, #d4a00d)',
    chatBg: `
      radial-gradient(ellipse at 75% 20%, rgba(233, 108, 30, 0.4) 0%, transparent 55%),
      radial-gradient(ellipse at 20% 75%, rgba(212, 100, 13, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 55% 90%, rgba(180, 60, 5, 0.25) 0%, transparent 45%),
      radial-gradient(ellipse at 30% 30%, rgba(255, 160, 30, 0.12) 0%, transparent 40%),
      linear-gradient(160deg, #0d0400 0%, #1e0900 60%, #2d1000 100%)`,
    bubbleSent: 'linear-gradient(135deg, #e96c1e, #ff8c42)',
    bubbleReceived: 'rgba(40, 15, 0, 0.9)',
  },
  {
    id: 'winter',
    name: 'Mùa Đông',
    preview: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    chatBg: `
      radial-gradient(ellipse at 25% 20%, rgba(79, 172, 254, 0.35) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 75%, rgba(0, 242, 254, 0.28) 0%, transparent 55%),
      radial-gradient(ellipse at 55% 45%, rgba(150, 220, 255, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 10% 90%, rgba(50, 150, 220, 0.2) 0%, transparent 40%),
      linear-gradient(160deg, #020a12 0%, #07121e 60%, #0d1e30 100%)`,
    bubbleSent: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    bubbleReceived: 'rgba(8, 22, 42, 0.9)',
  },
  {
    id: 'ocean',
    name: 'Đại Dương',
    preview: 'linear-gradient(135deg, #005c97, #363795)',
    chatBg: `
      radial-gradient(ellipse at 50% 100%, rgba(0, 120, 210, 0.55) 0%, transparent 55%),
      radial-gradient(ellipse at 15% 30%, rgba(0, 92, 151, 0.35) 0%, transparent 50%),
      radial-gradient(ellipse at 90% 55%, rgba(54, 55, 149, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 60% 20%, rgba(0, 60, 130, 0.2) 0%, transparent 45%),
      linear-gradient(160deg, #000610 0%, #000e1e 60%, #001428 100%)`,
    bubbleSent: 'linear-gradient(135deg, #0575e6, #021b79)',
    bubbleReceived: 'rgba(0, 12, 35, 0.92)',
  },
  {
    id: 'universe',
    name: 'Vũ Trụ',
    preview: 'linear-gradient(135deg, #7b2ff7, #f107a3)',
    chatBg: `
      radial-gradient(ellipse at 20% 30%, rgba(123, 47, 247, 0.55) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 70%, rgba(241, 7, 163, 0.48) 0%, transparent 50%),
      radial-gradient(ellipse at 60% 10%, rgba(100, 0, 220, 0.35) 0%, transparent 45%),
      radial-gradient(ellipse at 35% 85%, rgba(200, 0, 130, 0.28) 0%, transparent 45%),
      radial-gradient(ellipse at 50% 50%, rgba(60, 0, 100, 0.2) 0%, transparent 60%),
      linear-gradient(160deg, #03000e 0%, #0a0025 50%, #00000f 100%)`,
    bubbleSent: 'linear-gradient(135deg, #7b2ff7, #f107a3)',
    bubbleReceived: 'rgba(12, 0, 35, 0.92)',
  },
  {
    id: 'love',
    name: 'Tình Yêu',
    preview: 'linear-gradient(135deg, #e91e63, #ff6b8a)',
    chatBg: `
      radial-gradient(ellipse at 50% 25%, rgba(233, 30, 99, 0.48) 0%, transparent 55%),
      radial-gradient(ellipse at 15% 80%, rgba(194, 24, 91, 0.35) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 15%, rgba(255, 107, 138, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(180, 10, 70, 0.2) 0%, transparent 45%),
      linear-gradient(160deg, #080005 0%, #150008 60%, #200010 100%)`,
    bubbleSent: 'linear-gradient(135deg, #e91e63, #c2185b)',
    bubbleReceived: 'rgba(32, 4, 18, 0.9)',
  },
  {
    id: 'forest',
    name: 'Rừng Xanh',
    preview: 'linear-gradient(135deg, #2d6a4f, #52b788)',
    chatBg: `
      radial-gradient(ellipse at 50% 5%, rgba(100, 220, 100, 0.18) 0%, transparent 50%),
      radial-gradient(ellipse at 10% 55%, rgba(45, 106, 79, 0.4) 0%, transparent 55%),
      radial-gradient(ellipse at 90% 80%, rgba(82, 183, 136, 0.28) 0%, transparent 50%),
      radial-gradient(ellipse at 60% 50%, rgba(30, 90, 50, 0.15) 0%, transparent 50%),
      linear-gradient(160deg, #010803 0%, #061008 60%, #0a1a0d 100%)`,
    bubbleSent: 'linear-gradient(135deg, #2d6a4f, #52b788)',
    bubbleReceived: 'rgba(5, 18, 8, 0.9)',
  },
  {
    id: 'sunset',
    name: 'Hoàng Hôn',
    preview: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
    chatBg: `
      radial-gradient(ellipse at 50% 0%, rgba(255, 170, 50, 0.55) 0%, transparent 55%),
      radial-gradient(ellipse at 25% 60%, rgba(252, 74, 26, 0.38) 0%, transparent 52%),
      radial-gradient(ellipse at 85% 80%, rgba(247, 183, 51, 0.25) 0%, transparent 48%),
      radial-gradient(ellipse at 70% 30%, rgba(255, 80, 10, 0.18) 0%, transparent 45%),
      linear-gradient(160deg, #080300 0%, #120600 60%, #1e0a00 100%)`,
    bubbleSent: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
    bubbleReceived: 'rgba(30, 10, 0, 0.9)',
  },
  {
    id: 'sakura',
    name: 'Hoa Anh Đào',
    preview: 'linear-gradient(135deg, #f953c6, #b91d73)',
    chatBg: `
      radial-gradient(ellipse at 30% 20%, rgba(249, 83, 198, 0.48) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 65%, rgba(185, 29, 115, 0.4) 0%, transparent 52%),
      radial-gradient(ellipse at 60% 90%, rgba(255, 180, 230, 0.2) 0%, transparent 45%),
      radial-gradient(ellipse at 15% 75%, rgba(210, 40, 140, 0.25) 0%, transparent 48%),
      linear-gradient(160deg, #070005 0%, #110009 60%, #1a000f 100%)`,
    bubbleSent: 'linear-gradient(135deg, #f953c6, #b91d73)',
    bubbleReceived: 'rgba(22, 3, 15, 0.9)',
  },
  {
    id: 'custom',
    name: 'Tùy chỉnh',
    preview: 'linear-gradient(135deg, #4a4a4a, #888)',
    chatBg: null,
    bubbleSent: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    bubbleReceived: 'rgba(30, 41, 59, 0.8)',
    isCustom: true,
  },
];

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
      showThemePicker: false,
      customBgUrl: '',
      customBgInput: '',
      reportReason: '',
      reportDescription: '',
      reportSubmitting: false,
      actionLoading: false,
      selectedTheme: null,  // theme được chọn trong picker (chưa áp dụng)
      personalOnly: true,   // chỉ áp dụng cho bản thân hay cả hai
      // Nickname panel
      showNicknamePanel: false,
      nicknames: [],
      nicknameLoading: false,
      savingNickname: false,
      editingTargetId: null,
      editNicknameValue: '',
      editNicknamePublic: true,
      // Pinned messages panel
      showPinnedPanel: false,
      pinnedMessages: [],
      pinnedLoading: false,
      // Media viewer panel
      showMediaPanel: false,
      mediaFiles: [],
      mediaLoading: false,
      lightboxUrl: null,
      // Search panel
      showSearchPanel: false,
      searchQuery: '',
      searchResults: [],
      searchLoading: false,
      // Share contact panel
      showSharePanel: false,
      shareFriends: [],
      shareLoading: false,
      shareSending: null,
      shareSearch: '',
      shareContactTarget: null,
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

  handleOpenThemePicker = () => {
    const convId = this.context.currentConversation?._id;
    const saved = convId ? localStorage.getItem(`chat_theme_${convId}`) : null;
    const parsed = saved ? JSON.parse(saved) : null;
    this.setState({
      showThemePicker: true,
      customBgInput: parsed?.customBgUrl || '',
      customBgUrl: parsed?.customBgUrl || '',
      selectedTheme: parsed || null,
    });
  };

  handleCloseThemePicker = () => this.setState({ showThemePicker: false });

  // Áp dụng chủ đề đã chọn: lưu localStorage, thông báo ChatWindow, và emit socket nếu cần
  handleApplyTheme = () => {
    const { selectedTheme, personalOnly } = this.state;
    if (!selectedTheme) return;
    const convId = this.context.currentConversation?._id;
    if (!convId) return;

    const data = { ...selectedTheme };
    try {
      localStorage.setItem(`chat_theme_${convId}`, JSON.stringify(data));
    } catch (e) {
      console.warn('Theme too large for localStorage, applying in-memory only');
    }

    if (this.props.onThemeChange) this.props.onThemeChange(data);

    // Phát sóng đến đối phương qua socket nếu không phải chế độ cá nhân
    if (!personalOnly) {
      const { socketService } = this.context;
      if (socketService && socketService.socket) {
        socketService.socket.emit('theme-change', {
          conversationId: convId,
          theme: data
        });
      }
    }

    this.setState({ showThemePicker: false });
  };

  handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Vui lòng chọn file ảnh!'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const customTheme = THEMES.find(t => t.isCustom);
      const builtTheme = { ...customTheme, chatBg: `url("${dataUrl}") center/cover no-repeat`, customBgUrl: dataUrl };
      this.setState({ selectedTheme: builtTheme });
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  renderThemePicker = () => {
    const { customBgInput, selectedTheme, personalOnly } = this.state;
    const convId = this.context.currentConversation?._id;
    const saved = convId ? localStorage.getItem(`chat_theme_${convId}`) : null;
    const activeThemeId = saved ? JSON.parse(saved).id : 'default';
    const selectedId = selectedTheme?.id;

    return (
      <div className="theme-picker-overlay" onClick={this.handleCloseThemePicker}>
        <div className="theme-picker-modal" onClick={e => e.stopPropagation()}>
          <div className="theme-picker-header">
            <h3>Chọn chủ đề</h3>
            <button className="theme-picker-close" onClick={this.handleCloseThemePicker}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="theme-grid">
            {THEMES.filter(t => !t.isCustom).map(theme => (
              <button
                key={theme.id}
                className={`theme-swatch${activeThemeId === theme.id ? ' active' : ''}${selectedId === theme.id ? ' selected' : ''}`}
                onClick={() => this.setState({ selectedTheme: theme })}
                title={theme.name}
              >
                {/* Mini chat preview card */}
                <div className="theme-card" style={{ background: theme.chatBg || '#0a0e27' }}>
                  <div className="theme-card-bubble theme-card-received"
                    style={{ background: theme.bubbleReceived }} />
                  <div className="theme-card-bubble theme-card-sent"
                    style={{ background: theme.bubbleSent }} />
                  <div className="theme-card-bubble theme-card-received theme-card-bubble--sm"
                    style={{ background: theme.bubbleReceived }} />
                  {activeThemeId === theme.id && (
                    <div className="theme-swatch-check">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span>{theme.name}</span>
              </button>
            ))}
          </div>

          <div className="theme-custom-section">
            <p className="theme-custom-label">🎨 Hình nền tùy chỉnh</p>

            {/* Upload from computer */}
            <div className="theme-upload-row">
              <label className="theme-upload-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Tải từ máy tính
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={this.handleFileUpload}
                />
              </label>
              <span className="theme-upload-or">hoặc</span>
            </div>

            {/* URL input */}
            <div className="theme-custom-input-row">
              <input
                type="text"
                className="theme-custom-input"
                placeholder="Dán link ảnh: https://example.com/image.jpg"
                value={customBgInput}
                onChange={e => this.setState({ customBgInput: e.target.value })}
              />
              <button
                className="theme-custom-apply-btn"
                disabled={!customBgInput.trim()}
                onClick={() => {
                  const customTheme = THEMES.find(t => t.isCustom);
                  const builtTheme = {
                    ...customTheme,
                    chatBg: `url("${customBgInput.trim()}") center/cover no-repeat`,
                    customBgUrl: customBgInput.trim()
                  };
                  this.setState({ selectedTheme: builtTheme });
                }}
              >
                Chọn
              </button>
            </div>

            {(selectedId === 'custom' || (activeThemeId === 'custom' && !selectedId)) && (
              <p className="theme-custom-current">✓ Đang dùng hình nền tùy chỉnh</p>
            )}
          </div>

          {/* Apply section */}
          <div className="theme-apply-section">
            <label className="theme-personal-toggle">
              <input
                type="checkbox"
                checked={personalOnly}
                onChange={e => this.setState({ personalOnly: e.target.checked })}
              />
              <span>Chỉ áp dụng cho tôi</span>
            </label>
            {!personalOnly && (
              <p className="theme-apply-note">Cả hai người sẽ thấy chủ đề này</p>
            )}
            <button
              className="theme-apply-btn"
              disabled={!selectedTheme}
              onClick={this.handleApplyTheme}
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    );
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

  handleCreateGroup = () => {
    const participant = this.getParticipant();
    if (participant && this.props.onCreateGroupWithFriend) {
      this.props.onCreateGroupWithFriend(participant._id);
    }
  };

  handleOpenPinnedPanel = async () => {
    const convId = this.context.currentConversation?._id;
    if (!convId) return;
    this.setState({ showPinnedPanel: true, pinnedLoading: true, pinnedMessages: [] });
    try {
      const res = await api.getPinnedMessages(convId);
      this.setState({ pinnedMessages: res.data || [], pinnedLoading: false });
    } catch {
      this.setState({ pinnedLoading: false });
    }
  };

  handleClosePinnedPanel = () => this.setState({ showPinnedPanel: false });

  handleOpenMediaPanel = async () => {
    const convId = this.context.currentConversation?._id;
    if (!convId) return;
    this.setState({ showMediaPanel: true, mediaLoading: true, mediaFiles: [] });
    try {
      const res = await api.getMediaFiles(convId);
      this.setState({ mediaFiles: res.data || [], mediaLoading: false });
    } catch {
      this.setState({ mediaLoading: false });
    }
  };

  handleCloseMediaPanel = () => this.setState({ showMediaPanel: false, lightboxUrl: null });

  handleOpenSearchPanel = () => this.setState({ showSearchPanel: true, searchQuery: '', searchResults: [] });
  handleCloseSearchPanel = () => this.setState({ showSearchPanel: false, searchQuery: '', searchResults: [] });

  handleSearchMessages = async (q) => {
    const convId = this.context.currentConversation?._id;
    if (!convId || !q.trim()) { this.setState({ searchResults: [] }); return; }
    this.setState({ searchLoading: true });
    try {
      const res = await api.searchMessages(convId, q.trim());
      this.setState({ searchResults: res.data || [], searchLoading: false });
    } catch {
      this.setState({ searchLoading: false });
    }
  };

  handleOpenSharePanel = async () => {
    // The person whose contact we're sharing = the other person in current conversation
    const contactTarget = this.getParticipant(); // null for groups
    this.setState({
      showSharePanel: true, shareLoading: true,
      shareFriends: [], shareSending: null, shareSearch: '',
      shareContactTarget: contactTarget || null,
    });
    try {
      const res = await api.getFriends();
      let friends = res.data || [];
      // Exclude the person being shared from the send-to list
      if (contactTarget) {
        friends = friends.filter(f => f._id !== contactTarget._id && f._id?.toString() !== contactTarget._id?.toString());
      }
      this.setState({ shareFriends: friends, shareLoading: false });
    } catch {
      this.setState({ shareLoading: false });
    }
  };
  handleCloseSharePanel = () => this.setState({ showSharePanel: false });

  handleSendContact = async (friend) => {
    const { shareContactTarget } = this.state;
    if (!shareContactTarget) return;
    this.setState({ shareSending: friend._id });
    try {
      const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      const contactData = {
        userId: shareContactTarget._id,
        name: shareContactTarget.fullName || shareContactTarget.username,
        username: shareContactTarget.username,
        avatar: shareContactTarget.avatar
          ? (shareContactTarget.avatar.startsWith('http') ? shareContactTarget.avatar : API_BASE + shareContactTarget.avatar)
          : null,
      };
      // Get or create a conversation with the selected friend
      const convRes = await api.createConversation(friend._id);
      const targetConvId = convRes.data?._id || convRes.data?.conversation?._id;
      if (!targetConvId) throw new Error('Could not get conversation');
      await api.sendContactMessage(targetConvId, contactData);
      this.setState({ shareSending: null, showSharePanel: false });
    } catch {
      this.setState({ shareSending: null });
      alert('Không thể chia sẻ liên hệ');
    }
  };

  renderSearchPanel = () => {
    const { searchQuery, searchResults, searchLoading } = this.state;
    const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return (
      <div className="nickname-panel-overlay" onClick={this.handleCloseSearchPanel}>
        <div className="nickname-panel" onClick={e => e.stopPropagation()}>
          <div className="nickname-panel-header">
            <button className="nickname-back-btn" onClick={this.handleCloseSearchPanel}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h3>Tìm kiếm tin nhắn</h3>
          </div>
          <div className="search-panel-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-panel-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-panel-input"
              placeholder="Nhập để tìm kiếm..."
              value={searchQuery}
              autoFocus
              onChange={e => {
                const q = e.target.value;
                this.setState({ searchQuery: q });
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.handleSearchMessages(q), 350);
              }}
            />
          </div>
          {searchLoading ? (
            <div className="nickname-loading">Đang tìm...</div>
          ) : searchResults.length === 0 && searchQuery.trim() ? (
            <div className="nickname-loading" style={{color:'#8892a4'}}>Không tìm thấy tin nhắn nào</div>
          ) : (
            <div className="pinned-messages-list">
              {searchResults.map(msg => (
                <div key={msg._id} className="pinned-message-item" style={{cursor:'pointer'}} onClick={() => {
                  this.handleCloseSearchPanel();
                  if (this.props.onScrollToMessage) this.props.onScrollToMessage(msg._id);
                }}>
                  <div className="pinned-message-sender">
                    <img
                      src={msg.sender?.avatar
                        ? (msg.sender.avatar.startsWith('http') ? msg.sender.avatar : API_BASE + msg.sender.avatar)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.fullName || 'U')}&size=32&background=8b5cf6&color=fff`}
                      alt="" className="pinned-avatar"
                    />
                    <span className="pinned-sender-name">{msg.sender?.fullName || msg.sender?.username}</span>
                    <span className="pinned-time">{new Date(msg.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="pinned-message-content"><span>{msg.content}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  renderSharePanel = () => {
    const { shareFriends, shareLoading, shareSending, shareSearch, shareContactTarget } = this.state;
    const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const filtered = shareFriends.filter(f =>
      (f.fullName || f.username || '').toLowerCase().includes(shareSearch.toLowerCase())
    );
    const targetAvatarUrl = shareContactTarget?.avatar
      ? (shareContactTarget.avatar.startsWith('http') ? shareContactTarget.avatar : API_BASE + shareContactTarget.avatar)
      : shareContactTarget
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(shareContactTarget.fullName || shareContactTarget.username || 'U')}&size=48&background=8b5cf6&color=fff`
        : null;
    return (
      <div className="nickname-panel-overlay" onClick={this.handleCloseSharePanel}>
        <div className="nickname-panel" onClick={e => e.stopPropagation()}>
          <div className="nickname-panel-header">
            <button className="nickname-back-btn" onClick={this.handleCloseSharePanel}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h3>Chia sẻ liên hệ</h3>
          </div>
          {!shareContactTarget ? (
            <div className="nickname-loading" style={{color:'#8892a4'}}>Chức năng này chỉ dùng được trong cuộc trò chuyện 1-1</div>
          ) : (
            <>
              {/* The contact being shared */}
              <div className="share-contact-preview">
                <span className="share-contact-preview-label">Chia sẻ thông tin của</span>
                <div className="share-contact-preview-info">
                  <img src={targetAvatarUrl} alt="" className="share-contact-preview-avatar" />
                  <div>
                    <span className="share-friend-name">{shareContactTarget.fullName || shareContactTarget.username}</span>
                    {shareContactTarget.username && <span className="share-friend-username" style={{marginLeft:6}}>@{shareContactTarget.username}</span>}
                  </div>
                </div>
              </div>
              <div style={{padding:'0 16px 6px',fontSize:12,color:'#8892a4',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Gửi đến</div>
              <div className="search-panel-input-wrap" style={{marginTop:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-panel-icon">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="search-panel-input"
                  placeholder="Tìm kiếm bạn bè..."
                  value={shareSearch}
                  onChange={e => this.setState({ shareSearch: e.target.value })}
                />
              </div>
              {shareLoading ? (
                <div className="nickname-loading">Đang tải...</div>
              ) : filtered.length === 0 ? (
                <div className="nickname-loading" style={{color:'#8892a4'}}>Không có bạn bè nào</div>
              ) : (
                <div className="nickname-list">
                  {filtered.map(friend => {
                    const avatarUrl = friend.avatar
                      ? (friend.avatar.startsWith('http') ? friend.avatar : API_BASE + friend.avatar)
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName || friend.username || 'U')}&size=40&background=8b5cf6&color=fff`;
                    return (
                      <div key={friend._id} className="share-friend-item">
                        <img src={avatarUrl} alt="" className="share-friend-avatar" />
                        <div className="share-friend-info">
                          <span className="share-friend-name">{friend.fullName || friend.username}</span>
                          {friend.fullName && <span className="share-friend-username">@{friend.username}</span>}
                        </div>
                        <button
                          className="share-friend-btn"
                          disabled={shareSending === friend._id}
                          onClick={() => this.handleSendContact(friend)}
                        >
                          {shareSending === friend._id ? '...' : 'Gửi'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  renderPinnedPanel = () => {
    const { pinnedMessages, pinnedLoading } = this.state;
    const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return (
      <div className="nickname-panel-overlay" onClick={this.handleClosePinnedPanel}>
        <div className="nickname-panel" onClick={e => e.stopPropagation()}>
          <div className="nickname-panel-header">
            <button className="nickname-back-btn" onClick={this.handleClosePinnedPanel}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h3>Tin nhắn đã ghim</h3>
          </div>
          {pinnedLoading ? (
            <div className="nickname-loading">Đang tải...</div>
          ) : pinnedMessages.length === 0 ? (
            <div className="nickname-loading" style={{color:'#8892a4'}}>Chưa có tin nhắn nào được ghim</div>
          ) : (
            <div className="pinned-messages-list">
              {pinnedMessages.map(msg => (
                <div key={msg._id} className="pinned-message-item" onClick={() => {
                  this.handleClosePinnedPanel();
                  if (this.props.onScrollToMessage) this.props.onScrollToMessage(msg._id);
                }} style={{cursor:'pointer'}}>
                  <div className="pinned-message-sender">
                    <img
                      src={msg.sender?.avatar
                        ? (msg.sender.avatar.startsWith('http') ? msg.sender.avatar : API_BASE + msg.sender.avatar)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.fullName || 'U')}&size=32&background=8b5cf6&color=fff`}
                      alt="" className="pinned-avatar"
                    />
                    <span className="pinned-sender-name">{msg.sender?.fullName || msg.sender?.username}</span>
                    <span className="pinned-time">{new Date(msg.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="pinned-message-content">
                    {msg.type === 'image' ? (
                      <img src={API_BASE + msg.fileUrl} alt="" className="pinned-image" />
                    ) : msg.type === 'file' ? (
                      <span>📎 {msg.fileName}</span>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  renderMediaPanel = () => {
    const { mediaFiles, mediaLoading, lightboxUrl } = this.state;
    const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const images = mediaFiles.filter(m => m.type === 'image');
    const files = mediaFiles.filter(m => m.type === 'file');
    return (
      <div className="nickname-panel-overlay" onClick={this.handleCloseMediaPanel}>
        <div className="nickname-panel media-panel" onClick={e => e.stopPropagation()}>
          <div className="nickname-panel-header">
            <button className="nickname-back-btn" onClick={this.handleCloseMediaPanel}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h3>Ảnh & File</h3>
          </div>
          {lightboxUrl && (
            <div className="media-lightbox" onClick={() => this.setState({ lightboxUrl: null })}>
              <img src={lightboxUrl} alt="" />
            </div>
          )}
          {mediaLoading ? (
            <div className="nickname-loading">Đang tải...</div>
          ) : mediaFiles.length === 0 ? (
            <div className="nickname-loading" style={{color:'#8892a4'}}>Chưa có file hoặc ảnh nào</div>
          ) : (
            <div className="media-panel-scroll">
              {images.length > 0 && (
                <>
                  <p className="media-section-label">Ảnh ({images.length})</p>
                  <div className="media-image-grid">
                    {images.map(m => (
                      <img
                        key={m._id}
                        src={API_BASE + m.fileUrl}
                        alt={m.fileName || 'img'}
                        className="media-thumb"
                        onClick={() => this.setState({ lightboxUrl: API_BASE + m.fileUrl })}
                      />
                    ))}
                  </div>
                </>
              )}
              {files.length > 0 && (
                <>
                  <p className="media-section-label">File ({files.length})</p>
                  <div className="media-file-list">
                    {files.map(m => (
                      <a
                        key={m._id}
                        href={API_BASE + m.fileUrl}
                        download={m.fileName}
                        className="media-file-item"
                        onClick={e => e.stopPropagation()}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                        <span>{m.fileName || 'File'}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  handleOpenNicknamePanel = async () => {
    const convId = this.context.currentConversation?._id;
    if (!convId) return;
    // Pre-fill with context data to avoid blank panel while loading
    const preloaded = this.context.currentConversationNicknames || [];
    this.setState({ showNicknamePanel: true, nicknameLoading: preloaded.length === 0, nicknames: preloaded });
    try {
      const res = await api.getNicknames(convId);
      this.setState({ nicknames: res.data || [], nicknameLoading: false });
    } catch {
      this.setState({ nicknameLoading: false });
    }
  };

  handleCloseNicknamePanel = () => {
    this.setState({ showNicknamePanel: false, editingTargetId: null, editNicknameValue: '', editNicknamePublic: true });
  };

  handleStartEditNickname = (participant) => {
    const currentUserId = localStorage.getItem('userId');
    const pId = participant._id?.toString();
    const existing = this.state.nicknames.find(n => {
      const sid = (n.setter?._id || n.setter)?.toString();
      const tid = (n.target?._id || n.target)?.toString();
      return sid === currentUserId && tid === pId;
    });
    this.setState({
      editingTargetId: pId,
      editNicknameValue: existing?.nickname || '',
      editNicknamePublic: existing ? !!existing.isPublic : true,
    });
  };

  handleCancelEditNickname = () => {
    this.setState({ editingTargetId: null, editNicknameValue: '', editNicknamePublic: true });
  };

  handleDeleteNickname = async (pId) => {
    const convId = this.context.currentConversation?._id;
    if (!convId || !pId) return;
    if (!window.confirm('Xóa biệt danh này?')) return;
    try {
      const res = await api.setNickname(convId, pId, '', true);
      this.setState({ nicknames: res.data || [] });
      if (this.context.refreshCurrentNicknames) {
        this.context.refreshCurrentNicknames();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  handleSaveNickname = async () => {
    const { editingTargetId, editNicknameValue, editNicknamePublic } = this.state;
    const convId = this.context.currentConversation?._id;
    if (!convId || !editingTargetId) return;
    this.setState({ savingNickname: true });
    try {
      const res = await api.setNickname(convId, editingTargetId, editNicknameValue, editNicknamePublic);
      this.setState({
        nicknames: res.data || [],
        editingTargetId: null,
        editNicknameValue: '',
        editNicknamePublic: true,
      });
      // Refresh context so chat header/list update immediately
      if (this.context.refreshCurrentNicknames) {
        this.context.refreshCurrentNicknames();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      this.setState({ savingNickname: false });
    }
  };

  renderNicknamePanel = () => {
    const { nicknames, nicknameLoading, savingNickname, editingTargetId, editNicknameValue, editNicknamePublic } = this.state;
    const { currentConversation } = this.context;
    const currentUserId = localStorage.getItem('userId');
    const participants = currentConversation?.participants || [];

    const getDisplayEntryFor = (p) => {
      const pId = p._id?.toString();
      const mine = nicknames.find(n => {
        const sid = (n.setter?._id || n.setter)?.toString();
        const tid = (n.target?._id || n.target)?.toString();
        return sid === currentUserId && tid === pId;
      });
      if (mine) return mine;
      return nicknames.find(n => {
        const tid = (n.target?._id || n.target)?.toString();
        return n.isPublic && tid === pId;
      });
    };

    return (
      <div className="nickname-panel-overlay" onClick={this.handleCloseNicknamePanel}>
        <div className="nickname-panel" onClick={e => e.stopPropagation()}>
          <div className="nickname-panel-header">
            <button className="nickname-back-btn" onClick={this.handleCloseNicknamePanel}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h3>Biệt danh</h3>
          </div>

          {nicknameLoading ? (
            <div className="nickname-loading">Đang tải...</div>
          ) : (
            <div className="nickname-list">
              {participants.map(p => {
                const pId = p._id?.toString();
                const entry = getDisplayEntryFor(p);
                const avatarUrl = this.getAvatarUrl(p);
                const isEditing = editingTargetId === pId;
                const originalName = p.fullName || p.username;
                const displayName = entry ? entry.nickname : originalName;

                return (
                  <div key={pId} className="nickname-item">
                    <div
                      className="nickname-item-row"
                      onClick={() => !isEditing && this.handleStartEditNickname(p)}
                    >
                      <img className="nickname-item-avatar" src={avatarUrl} alt={originalName} />
                      <div className="nickname-item-names">
                        <span className="nickname-item-display">{displayName}</span>
                        {entry && displayName !== originalName && (
                          <span className="nickname-item-original">{originalName}</span>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="nickname-action-icons">
                          {entry && (
                            <svg
                              className="nickname-delete-icon"
                              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              onClick={e => { e.stopPropagation(); this.handleDeleteNickname(pId); }}
                              title="Xóa biệt danh"
                            >
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6"/>
                              <path d="M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
                            </svg>
                          )}
                          <svg className="nickname-edit-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="nickname-edit-form" onClick={e => e.stopPropagation()}>
                        <input
                          className="nickname-edit-input"
                          value={editNicknameValue}
                          onChange={e => this.setState({ editNicknameValue: e.target.value })}
                          placeholder="Nhập biệt danh..."
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') this.handleSaveNickname(); if (e.key === 'Escape') this.handleCancelEditNickname(); }}
                        />
                        <label className="nickname-public-label">
                          <input
                            type="checkbox"
                            checked={editNicknamePublic}
                            onChange={e => this.setState({ editNicknamePublic: e.target.checked })}
                          />
                          <span>Công khai (cả hai đều thấy)</span>
                        </label>
                        <div className="nickname-edit-actions">
                          <button className="nickname-cancel-btn" onClick={this.handleCancelEditNickname}>Hủy</button>
                          <button className="nickname-save-btn" onClick={this.handleSaveNickname} disabled={savingNickname}>
                            {savingNickname ? 'Đang lưu...' : 'Lưu'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
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
    const { sectionCustomize, sectionActions, sectionPrivacy, showReportModal, showThemePicker, actionLoading } = this.state;

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
                'Chủ đề', false, this.handleOpenThemePicker
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
                'Biệt danh', false, this.handleOpenNicknamePanel
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
                `Tạo nhóm chat${participant ? ` với ${participant.fullName || participant.username}` : ''}`,
                false,
                this.handleCreateGroup
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>,
                'Xem file phương tiện, file và liên kết',
                false, this.handleOpenMediaPanel
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22"/>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
                </svg>,
                'Tin nhắn đã ghim',
                false, this.handleOpenPinnedPanel
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>,
                'Tìm kiếm trong cuộc trò chuyện',
                false, this.handleOpenSearchPanel
              )}
              {this.renderActionRow(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>,
                'Chia sẻ thông tin liên hệ',
                false, this.handleOpenSharePanel
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
      {showThemePicker && this.renderThemePicker()}
      {this.state.showNicknamePanel && this.renderNicknamePanel()}
      {this.state.showMediaPanel && this.renderMediaPanel()}
      {this.state.showPinnedPanel && this.renderPinnedPanel()}
      {this.state.showSearchPanel && this.renderSearchPanel()}
      {this.state.showSharePanel && this.renderSharePanel()}
      </>
    );
  }
}

export default ConversationInfo;
