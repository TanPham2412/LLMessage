import React, { Component } from 'react';
import { ChatContext } from '../../context/ChatContext.jsx';
import { getTimeAgo } from '../../utils/timeUtils';
import api from '../../services/api.js';
import ConversationInfo, { THEMES } from './ConversationInfo.jsx';

class ChatWindow extends Component {
  static contextType = ChatContext;

  constructor(props) {
    super(props);
    
    this.state = {
      message: '',
      selectedFile: null,
      currentTime: Date.now(),
      statusHidden: false,
      isUserNearBottom: true,
      prevMessagesLength: 0,
      prevConversationId: null,
      chatTheme: null,
      dragOver: false,
      lightboxUrl: null, // URL of image shown in fullscreen lightbox
      // showInfoPanel is now managed by parent ChatHome via props
    };

    this.dragCounter = 0;
    this.messagesEndRef = React.createRef();
    this.messagesContainerRef = React.createRef();
    this.timeUpdateInterval = null;
    this._lastIncomingTheme = null;
  }

  componentDidMount() {
    // Dùng capture phase trên document để chặn browser mở file TRƯỚC khi browser xử lý
    this._docDragEnter = (e) => {
      const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
      const hasDraggable = types.includes('Files') || types.includes('text/uri-list') || types.length > 0;
      if (hasDraggable) {
        e.preventDefault();
        this.dragCounter++;
        if (this.dragCounter === 1) this.setState({ dragOver: true });
      }
    };
    this._docDragOver = (e) => {
      // Luôn preventDefault để ngăn browser mở file/URL trong tab mới
      // bất kể loại dữ liệu (Files, text/uri-list từ Edge downloads panel, v.v.)
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    this._docDragLeave = (e) => {
      // relatedTarget === null nghĩa là cursor rời khỏi cửa sổ browser
      if (!e.relatedTarget) {
        this.dragCounter = 0;
        this.setState({ dragOver: false });
      }
    };
    this._docDrop = async (e) => {
      e.preventDefault();
      this.dragCounter = 0;
      this.setState({ dragOver: false });
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert('File quá lớn (tối đa 10MB)');
          return;
        }
        const { currentConversation } = this.context;
        if (currentConversation) {
          await this.context.sendMessage('', 'file', file);
        }
      }
    };
    document.addEventListener('dragenter', this._docDragEnter, true);
    document.addEventListener('dragover',  this._docDragOver,  true);
    document.addEventListener('dragleave', this._docDragLeave, true);
    document.addEventListener('drop',      this._docDrop,      true);

    // Cập nhật thời gian mỗi 10 giây cho trạng thái real-time
    this.timeUpdateInterval = setInterval(() => {
      this.setState({ currentTime: Date.now() });
    }, 10000);
    
    // Initialize conversation tracking
    const { currentConversation, messages } = this.context;
    this.setState({ 
      prevConversationId: currentConversation?._id,
      prevMessagesLength: messages?.length || 0
    });
    this.loadTheme(currentConversation?._id);
    
    // Check status visibility for current conversation
    this.checkStatusVisibility();
  }

  componentWillUnmount() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    // Gỡ event chặn browser drop khi unmount
    document.removeEventListener('dragenter', this._docDragEnter, true);
    document.removeEventListener('dragover',  this._docDragOver,  true);
    document.removeEventListener('dragleave', this._docDragLeave, true);
    document.removeEventListener('drop',      this._docDrop,      true);
  }

  componentDidUpdate(prevProps, prevState) {
    const { messages, currentConversation, incomingTheme } = this.context;
    const currentMessagesLength = messages?.length || 0;
    const prevMessagesLength = prevState.prevMessagesLength;
    const currentConversationId = currentConversation?._id;
    const prevConversationId = prevState.prevConversationId;

    // Áp dụng chủ đề khi người kia thay đổi (tin nhắn hệ thống sẽ tự hiện qua receive-message)
    if (incomingTheme && incomingTheme !== this._lastIncomingTheme) {
      this._lastIncomingTheme = incomingTheme;
      if (incomingTheme.conversationId === currentConversationId) {
        try {
          localStorage.setItem(`chat_theme_${currentConversationId}`, JSON.stringify(incomingTheme.theme));
        } catch (e) { /* ignore storage errors */ }
        this.setState({ chatTheme: incomingTheme.theme });
      }
    }
    
    // Check if conversation changed
    const conversationChanged = currentConversationId && currentConversationId !== prevConversationId;
    
    if (conversationChanged) {
      // Conversation changed - reset tracking and scroll to bottom
      this.setState({ 
        prevConversationId: currentConversationId,
        prevMessagesLength: currentMessagesLength,
        isUserNearBottom: true 
      });
      this.loadTheme(currentConversationId);
      this.checkStatusVisibility();
      setTimeout(() => this.scrollToBottom(), 100);
    } else {
      // Same conversation - check for new messages
      if (currentMessagesLength > prevMessagesLength) {
        // New messages arrived
        if (this.state.isUserNearBottom) {
          this.scrollToBottom();
        }
        // Update messages length
        this.setState({ prevMessagesLength: currentMessagesLength });
      }
    }
  }

  loadTheme = (convId) => {
    if (!convId) { this.setState({ chatTheme: null }); return; }
    const saved = localStorage.getItem(`chat_theme_${convId}`);
    this.setState({ chatTheme: saved ? JSON.parse(saved) : null });
  };

  handleThemeChange = (theme) => {
    this.setState({ chatTheme: theme });
  };

  checkStatusVisibility = async () => {
    const { currentConversation } = this.context;
    const currentUserId = localStorage.getItem('userId');
    
    if (!currentConversation || currentConversation.type === 'group') {
      this.setState({ statusHidden: false });
      return;
    }
    
    const participant = currentConversation.participants?.find(p => p._id !== currentUserId);
    if (!participant) {
      this.setState({ statusHidden: false });
      return;
    }
    
    try {
      const response = await api.checkStatusVisibility(participant._id);
      this.setState({ statusHidden: response.data.isHidden });
    } catch (error) {
      console.error('Error checking status visibility:', error);
      this.setState({ statusHidden: false });
    }
  };

  scrollToBottom = () => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  handleScroll = (e) => {
    const container = e.target;
    const threshold = 150; // pixels from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    
    // Update state only if changed
    if (isNearBottom !== this.state.isUserNearBottom) {
      this.setState({ isUserNearBottom: isNearBottom });
    }
  };

  handleMessageChange = (e) => {
    this.setState({ message: e.target.value });
  };

  handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      this.setState({ selectedFile: file });
    }
  };

  handleSendMessage = async (e) => {
    e.preventDefault();
    
    const { message, selectedFile } = this.state;

    if (!message.trim() && !selectedFile) return;

    await this.context.sendMessage(
      message,
      selectedFile ? 'file' : 'text',
      selectedFile
    );

    this.setState({ message: '', selectedFile: null });
  };

  formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  renderOnlineStatus = () => {
    const { currentConversation, onlineUsers } = this.context;
    const { currentTime, statusHidden } = this.state; // Get statusHidden from state
    const currentUserId = localStorage.getItem('userId');
    
    if (!currentConversation?.participants) return null;
    
    // Nếu là group, hiển thị số thành viên
    if (currentConversation.type === 'group') {
      return (
        <div className="chat-header-status group">
          {currentConversation.participants?.length || 0} thành viên
        </div>
      );
    }
    
    // Nếu là private, hiển thị trạng thái online/offline
    const participant = currentConversation.participants.find(
      p => p._id !== currentUserId
    );
    
    if (!participant) return null;
    
    // If participant has hidden their status from me (restricted/blocked me), don't show anything
    if (statusHidden) {
      console.log('🚫 Status hidden for participant:', participant.fullName || participant.username);
      return null;
    }
    
    // CRITICAL: Dựa vào participant.isOnline từ state (đã được update từ socket events)
    // thay vì chỉ dựa vào onlineUsers Set
    const isOnline = onlineUsers.has(participant._id);
    
    console.log('🔍 Checking online status:', {
      participantId: participant._id,
      participantName: participant.fullName || participant.username,
      participantIsOnline: participant.isOnline,
      isOnlineInSet: isOnline,
      onlineUsersSize: onlineUsers.size,
      lastSeen: participant.lastSeen,
      statusHidden
    });
    
    if (isOnline) {
      return (
        <div className="chat-header-status online">
          <span className="status-dot"></span>
          Trực tuyến
        </div>
      );
    } else {
      // Use currentTime to ensure recalculation on every timer tick
      const statusText = participant.lastSeen ? getTimeAgo(participant.lastSeen) : 'Ngoại tuyến';
      console.log('📊 Displaying offline status:', statusText);
      return (
        <div className="chat-header-status offline">
          {statusText}
        </div>
      );
    }
  };

  parseSystemMessage = (content, currentUserId) => {
    if (content?.startsWith('__NICKNAME_SET__|')) {
      try {
        const data = JSON.parse(content.slice('__NICKNAME_SET__|'.length));
        const curId = currentUserId?.toString();
        if (curId === data.setterId) {
          return `Bạn đã đặt biệt danh cho ${data.targetName} là: ${data.nickname}`;
        } else if (curId === data.targetId) {
          return `${data.setterName} đã đặt biệt danh cho bạn là: ${data.nickname}`;
        }
        return `${data.setterName} đã đặt biệt danh cho ${data.targetName} là: ${data.nickname}`;
      } catch {
        return content;
      }
    }
    return content;
  };

  getConversationName = () => {
    const { currentConversation, currentConversationNicknames } = this.context;
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    
    // Nếu là group, hiển thị tên nhóm
    if (currentConversation.type === 'group') {
      return currentConversation.name || 'Nhóm không tên';
    }
    
    // Nếu là private, hiển thị tên người kia
    const participant = currentConversation.participants?.find(p => p._id !== currentUserId);
    if (!participant) return 'Chat';

    // 1) resolvedNicknames có sẵn trong conversation object (từ API list)
    const fromConv = currentConversation.resolvedNicknames?.[participant._id?.toString()];
    if (fromConv) return fromConv;

    // 2) Fallback: nick từ context (load sau khi select)
    if (currentConversationNicknames?.length) {
      const pId = participant._id?.toString();
      const nick = currentConversationNicknames.find(n => {
        const tid = (n.target?._id || n.target)?.toString();
        return tid === pId;
      });
      if (nick) return nick.nickname;
    }

    return participant?.fullName || participant?.username || 'Chat';
  };

  getConversationAvatar = () => {
    const { currentConversation } = this.context;
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;
    
    // Nếu là group, hiển thị icon nhóm
    if (currentConversation.type === 'group') {
      return (
        <span className="group-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </span>
      );
    }
    
    // Nếu là private, lấy thông tin participant
    const participant = currentConversation.participants?.find(p => p._id !== currentUserId);
    const name = participant?.fullName || participant?.username || 'User';
    
    // Nếu có avatar, hiển thị ảnh
    if (participant?.avatar) {
      const avatarUrl = participant.avatar.startsWith('http') 
        ? participant.avatar 
        : `${process.env.REACT_APP_API_URL.replace('/api', '')}${participant.avatar}`;
      return <img src={avatarUrl} alt={name} />;
    }
    
    // Nếu không có avatar, hiển thị avatar mặc định từ UI Avatars
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=8b5cf6&color=fff`;
    return <img src={defaultAvatar} alt={name} />;
  };

  // Deterministic spread helper (avoids Math.random in render)
  _ds = (i, max, min = 0) => min + ((i * 137.5 + i * i * 31.7 + 17.3) % (max - min));

  renderThemeDecorations = () => {
    const { chatTheme } = this.state;
    const activeTheme = chatTheme || THEMES[0];
    const themeId = activeTheme.id;
    const ds = this._ds;
    const p = [];

    switch (themeId) {

      /* ── WINTER: gentle snow dots falling straight down ───────── */
      case 'winter': {
        for (let i = 0; i < 22; i++) {
          const size = ds(i * 7, 7, 2);
          p.push(
            <span key={`sn${i}`} className="deco-particle deco-snow" style={{
              left: `${ds(i * 5, 97, 1)}%`,
              top: `-${size * 2}px`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: ds(i * 11, 0.65, 0.2),
              animation: `snowFall ${ds(i * 3, 9, 6).toFixed(1)}s ${ds(i * 7, 12, 0).toFixed(1)}s linear infinite`,
            }} />
          );
        }
        break;
      }

      /* ── UNIVERSE: twinkling stars + slow-floating objects ─────── */
      case 'universe': {
        for (let i = 0; i < 30; i++) {
          const size = ds(i * 7, 3, 1);
          p.push(
            <span key={`st${i}`} className="deco-particle deco-star" style={{
              left: `${ds(i * 5, 97, 1)}%`,
              top: `${ds(i * 7, 93, 1)}%`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: ds(i * 13, 0.85, 0.1),
              animation: `twinkleStar ${ds(i * 3, 4, 1.5).toFixed(1)}s ${ds(i * 7, 5, 0).toFixed(1)}s ease-in-out infinite`,
            }} />
          );
        }
        p.push(
          <span key="planet" className="deco-particle" style={{ left: '12%', top: '8%', opacity: 0.6, animation: 'driftOrbit 28s 0s ease-in-out infinite' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <ellipse cx="22" cy="26" rx="20" ry="6" stroke="rgba(190,140,255,0.4)" strokeWidth="2" />
              <circle cx="22" cy="22" r="12" fill="rgba(130,70,240,0.55)" />
              <circle cx="17" cy="18" r="4" fill="rgba(170,110,255,0.3)" />
            </svg>
          </span>
        );
        p.push(
          <span key="moon" className="deco-particle" style={{ right: '10%', top: '15%', opacity: 0.55, animation: 'driftOrbit 34s 6s ease-in-out infinite' }}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M22 15A10 10 0 1 1 12 5a7 7 0 0 0 10 10z" fill="rgba(240,230,180,0.8)" />
            </svg>
          </span>
        );
        p.push(
          <span key="comet" className="deco-particle" style={{ left: '55%', top: '52%', opacity: 0.45, animation: 'driftOrbit 22s 11s ease-in-out infinite' }}>
            <svg width="48" height="14" viewBox="0 0 48 14" fill="none">
              <circle cx="42" cy="7" r="5" fill="rgba(255,255,200,0.85)" />
              <path d="M0 7 Q20 3 37 7 Q20 11 0 7Z" fill="rgba(255,255,180,0.2)" />
            </svg>
          </span>
        );
        p.push(
          <span key="planet2" className="deco-particle" style={{ right: '6%', bottom: '22%', opacity: 0.45, animation: 'driftOrbit 38s 15s ease-in-out infinite' }}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" fill="rgba(80,180,255,0.55)" />
              <circle cx="8" cy="9" r="3" fill="rgba(120,220,255,0.25)" />
            </svg>
          </span>
        );
        break;
      }

      /* ── OCEAN: fish at fixed spots bobbing + rising bubbles ───── */
      case 'ocean': {
        const fishDefs = [
          { key: 'f0', x: '8%',  y: '20%', w: 38, c: ['rgba(80,185,255,0.68)','rgba(40,140,220,0.45)'], dur: 18, delay: 0,  flip: false },
          { key: 'f1', x: '60%', y: '38%', w: 28, c: ['rgba(255,150,80,0.65)','rgba(220,100,40,0.45)'],  dur: 22, delay: 5,  flip: true  },
          { key: 'f2', x: '20%', y: '62%', w: 32, c: ['rgba(100,225,160,0.65)','rgba(60,175,115,0.45)'], dur: 26, delay: 9,  flip: false },
          { key: 'f3', x: '75%', y: '72%', w: 22, c: ['rgba(220,100,255,0.6)', 'rgba(170,60,220,0.4)'],  dur: 20, delay: 14, flip: true  },
        ];
        fishDefs.forEach(({ key, x, y, w, c: [body, tail], dur, delay, flip }) => {
          p.push(
            <span key={key} className="deco-particle" style={{
              left: x, top: y, opacity: 0.65,
              transform: flip ? 'scaleX(-1)' : 'none',
              animation: `driftOrbit ${dur}s ${delay}s ease-in-out infinite`,
            }}>
              <svg width={w} height={Math.round(w * 0.6)} viewBox="0 0 36 22" fill="none">
                <path d="M4 11 Q12 2 22 11 Q12 20 4 11Z" fill={body} />
                <path d="M22 11 Q30 5 35 11 Q30 17 22 11Z" fill={tail} />
                <circle cx="8" cy="10" r="2" fill="rgba(255,255,255,0.88)" />
                <circle cx="8.5" cy="10.5" r="1" fill="rgba(0,0,0,0.55)" />
              </svg>
            </span>
          );
        });
        p.push(
          <span key="jly" className="deco-particle" style={{ right: '8%', top: '14%', opacity: 0.5, animation: 'driftOrbit 16s 3s ease-in-out infinite' }}>
            <svg width="30" height="40" viewBox="0 0 32 42" fill="none">
              <path d="M1 14 Q16 0 31 14" fill="rgba(180,120,255,0.5)" />
              <path d="M1 14 Q16 24 31 14" fill="rgba(140,80,230,0.28)" />
              <line x1="7" y1="14" x2="5" y2="40" stroke="rgba(200,160,255,0.35)" strokeWidth="1.2" />
              <line x1="14" y1="17" x2="13" y2="41" stroke="rgba(200,160,255,0.3)" strokeWidth="1.2" />
              <line x1="19" y1="17" x2="20" y2="41" stroke="rgba(200,160,255,0.3)" strokeWidth="1.2" />
              <line x1="25" y1="14" x2="27" y2="40" stroke="rgba(200,160,255,0.35)" strokeWidth="1.2" />
            </svg>
          </span>
        );
        for (let i = 0; i < 12; i++) {
          const size = ds(i * 7, 14, 4);
          p.push(
            <span key={`bb${i}`} className="deco-particle deco-bubble" style={{
              left: `${ds(i * 7, 92, 3)}%`,
              bottom: `-${size}px`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: ds(i * 9, 0.45, 0.1),
              animation: `floatUp ${ds(i * 3, 11, 6).toFixed(1)}s ${ds(i * 11, 13, 0).toFixed(1)}s linear infinite`,
            }} />
          );
        }
        break;
      }

      /* ── SPRING: falling petals + fixed butterflies ───────────── */
      case 'spring': {
        const petalFills = [
          'rgba(255,160,190,0.65)', 'rgba(255,185,210,0.6)',
          'rgba(255,140,175,0.65)', 'rgba(240,165,198,0.6)',
        ];
        for (let i = 0; i < 14; i++) {
          const w = ds(i * 9, 12, 6), h = w * 1.6;
          p.push(
            <span key={`pt${i}`} className="deco-particle deco-petal" style={{
              left: `${ds(i * 5, 96, 1)}%`,
              top: `-${h}px`,
              width: `${w}px`,
              height: `${h}px`,
              background: petalFills[i % 4],
              transform: `rotate(${ds(i * 13, 60, -30)}deg)`,
              opacity: ds(i * 11, 0.6, 0.35),
              animation: `petalFall ${ds(i * 3, 10, 6).toFixed(1)}s ${ds(i * 7, 12, 0).toFixed(1)}s linear infinite`,
            }} />
          );
        }
        [[18, 28, 18, 0], [65, 52, 24, 7]].forEach(([left, top, dur, delay], i) => {
          p.push(
            <span key={`bf${i}`} className="deco-particle" style={{ left: `${left}%`, top: `${top}%`, opacity: 0.6, animation: `driftOrbit ${dur}s ${delay}s ease-in-out infinite` }}>
              <svg width="30" height="22" viewBox="0 0 32 24" fill="none">
                <path d="M16 12 Q4 0 0 7 Q4 16 16 12Z" fill="rgba(255,130,200,0.7)" />
                <path d="M16 12 Q28 0 32 7 Q28 16 16 12Z" fill="rgba(255,155,215,0.7)" />
                <path d="M16 12 Q5 15 2 22 Q9 20 16 12Z" fill="rgba(255,110,185,0.55)" />
                <path d="M16 12 Q27 15 30 22 Q23 20 16 12Z" fill="rgba(255,130,200,0.55)" />
                <ellipse cx="16" cy="12" rx="1.5" ry="5" fill="rgba(60,20,40,0.75)" />
              </svg>
            </span>
          );
        });
        break;
      }

      /* ── SUMMER: fixed sun + fixed clouds ─────────────────────── */
      case 'summer': {
        p.push(
          <span key="sun" className="deco-particle" style={{ right: '8%', top: '5%', opacity: 0.78, animation: 'driftOrbit 30s 0s ease-in-out infinite' }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="11" fill="rgba(255,215,40,0.88)" />
              {[0,45,90,135,180,225,270,315].map((a, i) => (
                <line key={i}
                  x1={26 + 14 * Math.cos(a * Math.PI / 180)}
                  y1={26 + 14 * Math.sin(a * Math.PI / 180)}
                  x2={26 + 22 * Math.cos(a * Math.PI / 180)}
                  y2={26 + 22 * Math.sin(a * Math.PI / 180)}
                  stroke="rgba(255,195,25,0.75)" strokeWidth="2.5" strokeLinecap="round" />
              ))}
            </svg>
          </span>
        );
        [['6%', '8%', 46, 0.42, 32, 0], ['30%', '18%', 36, 0.35, 40, 8], ['62%', '6%', 28, 0.3, 28, 16]].forEach(([left, top, size, opa, dur, delay], i) => {
          p.push(
            <span key={`cl${i}`} className="deco-particle" style={{ left, top, opacity: opa, animation: `driftOrbit ${dur}s ${delay}s ease-in-out infinite` }}>
              <svg width={size} height={Math.round(size * 0.58)} viewBox="0 0 60 36" fill="none">
                <circle cx="18" cy="22" r="14" fill="rgba(255,255,255,0.75)" />
                <circle cx="32" cy="13" r="17" fill="rgba(255,255,255,0.8)" />
                <circle cx="47" cy="22" r="13" fill="rgba(255,255,255,0.72)" />
                <rect x="5" y="22" width="50" height="14" fill="rgba(255,255,255,0.72)" />
              </svg>
            </span>
          );
        });
        break;
      }

      /* ── AUTUMN: SVG leaves falling ───────────────────────────── */
      case 'autumn': {
        const leafColors = [
          'rgba(210,70,25,0.7)', 'rgba(195,115,15,0.68)',
          'rgba(175,55,18,0.66)', 'rgba(185,135,25,0.64)', 'rgba(220,95,35,0.68)',
        ];
        const veinColors = [
          'rgba(255,175,125,0.4)', 'rgba(255,195,115,0.38)',
          'rgba(255,155,105,0.38)', 'rgba(255,205,135,0.38)', 'rgba(255,185,125,0.4)',
        ];
        for (let i = 0; i < 18; i++) {
          const size = ds(i * 7, 17, 9);
          p.push(
            <span key={`lf${i}`} className="deco-particle" style={{
              left: `${ds(i * 5, 96, 1)}%`,
              top: `-${size * 1.5}px`,
              opacity: ds(i * 11, 0.7, 0.4),
              animation: `leafFall ${ds(i * 3, 8, 5).toFixed(1)}s ${ds(i * 7, 11, 0).toFixed(1)}s linear infinite`,
            }}>
              <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 20 25" fill="none">
                <path d="M10 0 Q18 5 18 13 Q18 22 10 25 Q2 22 2 13 Q2 5 10 0Z" fill={leafColors[i % 5]} />
                <line x1="10" y1="1" x2="10" y2="24" stroke={veinColors[i % 5]} strokeWidth="1" />
                <line x1="10" y1="8" x2="5" y2="13" stroke={veinColors[i % 5]} strokeWidth="0.7" />
                <line x1="10" y1="8" x2="15" y2="13" stroke={veinColors[i % 5]} strokeWidth="0.7" />
                <line x1="10" y1="14" x2="4" y2="18" stroke={veinColors[i % 5]} strokeWidth="0.7" />
                <line x1="10" y1="14" x2="16" y2="18" stroke={veinColors[i % 5]} strokeWidth="0.7" />
              </svg>
            </span>
          );
        }
        break;
      }

      /* ── LOVE: SVG hearts rising up ───────────────────────────── */
      case 'love': {
        const heartFills = [
          'rgba(255,70,110,0.72)', 'rgba(255,100,150,0.65)', 'rgba(255,55,95,0.7)',
          'rgba(220,70,130,0.65)', 'rgba(255,120,170,0.62)', 'rgba(200,55,100,0.68)',
        ];
        for (let i = 0; i < 16; i++) {
          const size = ds(i * 7, 18, 8);
          p.push(
            <span key={`ht${i}`} className="deco-particle" style={{
              left: `${ds(i * 5, 92, 3)}%`,
              bottom: `-${size}px`,
              opacity: ds(i * 11, 0.6, 0.35),
              animation: `floatUp ${ds(i * 3, 11, 6).toFixed(1)}s ${ds(i * 7, 13, 0).toFixed(1)}s linear infinite`,
            }}>
              <svg width={size} height={Math.round(size * 0.92)} viewBox="0 0 20 18" fill="none">
                <path d="M10 17 Q1 11 1 6 A5 5 0 0 1 10 4.5 A5 5 0 0 1 19 6 Q19 11 10 17Z" fill={heartFills[i % 6]} />
              </svg>
            </span>
          );
        }
        break;
      }

      /* ── FOREST: firefly dots + falling SVG leaves ────────────── */
      case 'forest': {
        for (let i = 0; i < 20; i++) {
          const size = ds(i * 9, 5, 2);
          p.push(
            <span key={`ff${i}`} className="deco-particle deco-firefly" style={{
              left: `${ds(i * 5, 96, 1)}%`,
              top: `${ds(i * 7, 90, 3)}%`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: ds(i * 13, 0.8, 0.12),
              animation: `twinkleStar ${ds(i * 3, 3.5, 1.5).toFixed(1)}s ${ds(i * 7, 5, 0).toFixed(1)}s ease-in-out infinite`,
            }} />
          );
        }
        for (let i = 0; i < 8; i++) {
          const size = ds(i * 7, 15, 8);
          p.push(
            <span key={`fl${i}`} className="deco-particle" style={{
              left: `${ds(i * 5, 96, 1)}%`,
              top: `-${size * 1.5}px`,
              opacity: ds(i * 11, 0.55, 0.3),
              animation: `leafFall ${ds(i * 3, 9, 6).toFixed(1)}s ${ds(i * 7, 10, 0).toFixed(1)}s linear infinite`,
            }}>
              <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 20 25" fill="none">
                <path d="M10 0 Q18 5 18 13 Q18 22 10 25 Q2 22 2 13 Q2 5 10 0Z" fill="rgba(55,175,80,0.65)" />
                <line x1="10" y1="1" x2="10" y2="24" stroke="rgba(145,225,145,0.4)" strokeWidth="1" />
              </svg>
            </span>
          );
        }
        break;
      }

      /* ── SUNSET: fixed warm clouds ────────────────────────────── */
      case 'sunset': {
        [['4%','7%',48,0.42,36,0],['32%','18%',36,0.35,44,10],['64%','8%',40,0.38,30,20]].forEach(([left, top, size, opa, dur, delay], i) => {
          p.push(
            <span key={`sc${i}`} className="deco-particle" style={{ left, top, opacity: opa, animation: `driftOrbit ${dur}s ${delay}s ease-in-out infinite` }}>
              <svg width={size} height={Math.round(size * 0.58)} viewBox="0 0 60 36" fill="none">
                <circle cx="18" cy="22" r="14" fill="rgba(255,170,110,0.6)" />
                <circle cx="32" cy="13" r="17" fill="rgba(255,150,95,0.65)" />
                <circle cx="47" cy="22" r="13" fill="rgba(255,170,115,0.58)" />
                <rect x="5" y="22" width="50" height="14" fill="rgba(255,160,105,0.58)" />
              </svg>
            </span>
          );
        });
        break;
      }

      /* ── SAKURA: falling pink oval petals ─────────────────────── */
      case 'sakura': {
        const sakFills = [
          'rgba(255,162,192,0.7)', 'rgba(255,182,208,0.65)',
          'rgba(255,145,180,0.68)', 'rgba(242,158,192,0.63)',
        ];
        for (let i = 0; i < 24; i++) {
          const w = ds(i * 7, 12, 6), h = w * 1.55;
          p.push(
            <span key={`sk${i}`} className="deco-particle deco-petal" style={{
              left: `${ds(i * 5, 97, 1)}%`,
              top: `-${h}px`,
              width: `${w}px`,
              height: `${h}px`,
              background: sakFills[i % 4],
              transform: `rotate(${ds(i * 13, 50, -25)}deg)`,
              opacity: ds(i * 11, 0.62, 0.35),
              animation: `petalFall ${ds(i * 3, 11, 6).toFixed(1)}s ${ds(i * 7, 13, 0).toFixed(1)}s linear infinite`,
            }} />
          );
        }
        break;
      }

      default:
        break;
    }

    if (!p.length) return null;
    return <div className="chat-theme-overlay" aria-hidden="true">{p}</div>;
  };
  render() {
    const { currentConversation, messages, loading } = this.context;
    const { message, selectedFile, chatTheme } = this.state;
    const showInfoPanel = this.props.showInfoPanel;
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;

    // Build theme styles
    const defaultTheme = THEMES[0];
    const activeTheme = chatTheme || defaultTheme;
    const chatBg = (activeTheme.chatBg || '#0a0e27').trim();
    const chatMessagesStyle = {
      background: chatBg,
      '--bubble-sent': activeTheme.bubbleSent,
      '--bubble-received': activeTheme.bubbleReceived,
    };

    if (!currentConversation) {
      return (
        <div className="chat-window-empty">
          <h2>Chào mừng đến với Ứng Dụng Chat</h2>
          <p>Chọn một cuộc trò chuyện để bắt đầu</p>
        </div>
      );
    }

    return (
      <>
      <div
        className="chat-window-with-info"
      >
      <div className="chat-window">
        {this.state.dragOver && (
          <div
            className="chat-drop-overlay"
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
            onDragLeave={(e) => {
              e.preventDefault(); e.stopPropagation();
              if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) {
                this.dragCounter = 0;
                this.setState({ dragOver: false });
              }
            }}
            onDrop={async (e) => {
              e.preventDefault(); e.stopPropagation();
              this.dragCounter = 0;
              this.setState({ dragOver: false });
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                const file = files[0];
                if (file.size > 10 * 1024 * 1024) { alert('File quá lớn (tối đa 10MB)'); return; }
                await this.context.sendMessage('', 'file', file);
              }
            }}
          >
            <div className="chat-drop-overlay-inner">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              <p>Thả để gửi</p>
            </div>
          </div>
        )}
        <div className="chat-window-header">
          <div
            className="chat-window-header-info clickable-header"
            onClick={this.props.onToggleInfoPanel}
            title="Xem thông tin cuộc trò chuyện"
            style={{ cursor: 'pointer' }}
          >
            <div className={`chat-header-avatar ${currentConversation.type === 'group' ? 'group-avatar' : ''}`}>
              {this.getConversationAvatar()}
            </div>
            <div>
              <h3>{this.getConversationName()}</h3>
              {this.renderOnlineStatus()}
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-header-btn" title="Gọi thoại">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.13 6.13l1.88-1.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <button className="chat-header-btn" title="Gọi video">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </button>
            <button
              className={`chat-header-btn${this.props.showInfoPanel ? ' active' : ''}`}
              title="Thông tin cuộc trò chuyện"
              onClick={this.props.onToggleInfoPanel}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          </div>
        </div>

        <div 
          className="chat-messages" 
          ref={this.messagesContainerRef}
          onScroll={this.handleScroll}
          style={chatMessagesStyle}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              const file = files[0];
              if (file.size > 10 * 1024 * 1024) { alert('File quá lớn (tối đa 10MB)'); return; }
              await this.context.sendMessage('', 'file', file);
            }
          }}
        >
          {this.renderThemeDecorations()}
          {messages.map((msg) => {
            // Tin nhắn hệ thống (ví dụ: thông báo đổi chủ đề)
            if (msg.type === 'system') {
              const displayText = this.parseSystemMessage(msg.content, currentUserId);
              return (
                <div key={msg._id} className="message-system">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.75}}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span className="message-system-content">{displayText}</span>
                  <span className="message-system-time">{this.formatTime(msg.createdAt)}</span>
                </div>
              );
            }
            return (
            <div
              key={msg._id}
              className={`message ${
                msg.sender._id === currentUserId ? 'message-sent' : 'message-received'
              } ${msg.isBlocked ? 'message-blocked' : ''}`}
            >
              {/* Avatar + tên người gửi trong nhóm (chỉ tin nhắn nhận được) */}
              {currentConversation.type === 'group' && msg.sender._id !== currentUserId && (
                <div className="message-sender-info">
                  <img
                    className="message-sender-avatar"
                    src={
                      msg.sender.avatar && msg.sender.avatar.startsWith('http')
                        ? msg.sender.avatar
                        : msg.sender.avatar
                        ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${msg.sender.avatar}`
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.fullName || msg.sender.username || 'U')}&size=60&background=8b5cf6&color=fff`
                    }
                    alt={msg.sender.fullName || msg.sender.username}
                  />
                  <span className="message-sender-name">{msg.sender.fullName || msg.sender.username}</span>
                </div>
              )}
              <div className="message-content">
                {msg.isBlocked && (
                  <div className="message-blocked-warning">
                    <span className="blocked-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </span>
                    <span className="blocked-text">{msg.blockedMessage || 'Tin nhắn không được gửi'}</span>
                  </div>
                )}
                {msg.type === 'image' && !msg.isBlocked && (
                  <img
                    src={`http://localhost:5000${msg.fileUrl}`}
                    alt="attachment"
                    className="message-image"
                    draggable={false}
                    onClick={() => this.setState({ lightboxUrl: `http://localhost:5000${msg.fileUrl}` })}
                  />
                )}
                {msg.content && !msg.isBlocked && <p>{msg.content}</p>}
                {msg.type === 'file' && msg.fileName && !msg.isBlocked && (
                  <a
                    href={`http://localhost:5000/api/files/download/${msg.fileUrl.split('/').pop()}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {msg.fileName}
                  </a>
                )}
              </div>
              <div className="message-time">{this.formatTime(msg.createdAt)}</div>
            </div>
            );
          })}
          <div ref={this.messagesEndRef} />
        </div>

        <form 
          className="chat-input-form"
          onSubmit={this.handleSendMessage}
        >
          {selectedFile && (
            <div className="selected-file">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'4px'}}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {selectedFile.name}
              <button
                type="button"
                onClick={() => this.setState({ selectedFile: null })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          <div className="chat-input-container">
            <input
              type="file"
              id="file-upload"
              onChange={this.handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.xlsx,.xls,.ppt,.pptx,.rar,.7z,.mp3,.mp4,.mov,.avi,.csv"
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="btn-file" title="Đính kèm file">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </label>

            <input
              type="text"
              value={message}
              onChange={this.handleMessageChange}
              placeholder="Aa"
              className="message-input"
            />

            <button type="submit" className="btn-send" disabled={!message.trim() && !selectedFile} title="Gửi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Conversation Info Panel */}
      {showInfoPanel && (
        <ConversationInfo
          onClose={this.props.onToggleInfoPanel}
          onThemeChange={this.handleThemeChange}
          currentTheme={chatTheme}
          onCreateGroupWithFriend={this.props.onCreateGroupWithFriend}
        />
      )}
      </div>

      {/* Lightbox */}
      {this.state.lightboxUrl && (
        <div
          className="lightbox-overlay"
          onClick={() => this.setState({ lightboxUrl: null })}
        >
          <button
            className="lightbox-close"
            onClick={() => this.setState({ lightboxUrl: null })}
            title="Đóng"
          >✕</button>
          <img
            src={this.state.lightboxUrl}
            alt="preview"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      </>
    );
  }
}

export default ChatWindow;

