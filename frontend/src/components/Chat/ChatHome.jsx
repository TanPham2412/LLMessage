import React, { Component } from 'react';
import { AuthContext } from '../../context/AuthContext.jsx';
import { ChatContext } from '../../context/ChatContext.jsx';
import { SocketContext } from '../../context/SocketContext.jsx';
import ConversationList from './ConversationList.jsx';
import ChatWindow from './ChatWindow.jsx';
import CreateGroupModal from './CreateGroupModal.jsx';
import FriendNotifications from './FriendNotifications.jsx';
import FriendsList from './FriendsList.jsx';
import UserSettings from './UserSettings.jsx';
import api from '../../services/api';
import '../../styles/Chat.css';

class ChatHome extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      showSidebar: true,
      showUserMenu: false,
      showCreateGroupModal: false,
      showFriendsList: false,
      showNotifications: false,
      notificationTab: 'requests',
      notificationCount: 0,
      showSettingsModal: false
    };
    
    this.menuRef = React.createRef();
    this.notificationRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    this.loadNotificationCount();
    this.setupSocketListeners();
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
    this.removeSocketListeners();
  }

  setupSocketListeners = () => {
    // Lấy socket từ context
    const socket = this.getSocket();
    console.log('🔌 ChatHome setupSocketListeners, socket:', socket ? 'connected' : 'not available');
    if (socket) {
      console.log('📡 Setting up socket event listeners in ChatHome');
      socket.on('friend-request-received', this.handleSocketNotification);
      socket.on('friend-request-accepted', this.handleSocketNotification);
      socket.on('friend-request-rejected', this.handleSocketNotification);
    }
  }

  removeSocketListeners = () => {
    const socket = this.getSocket();
    if (socket) {
      socket.off('friend-request-received', this.handleSocketNotification);
      socket.off('friend-request-accepted', this.handleSocketNotification);
      socket.off('friend-request-rejected', this.handleSocketNotification);
    }
  }

  getSocket = () => {
    // Socket sẽ được truyền từ props
    return this.props.socket || null;
  }

  handleSocketNotification = (data) => {
    console.log('🔔 ChatHome received socket notification:', data);
    // Tăng count khi nhận notification mới
    this.loadNotificationCount(); // Reload count từ API để đảm bảo chính xác
  }

  loadNotificationCount = async () => {
    try {
      const response = await api.getUnreadNotificationCount();
      if (response.success) {
        // Tải danh sách lời mời kết bạn
        const friendReqResponse = await api.getFriendRequests();
        const friendRequestCount = friendReqResponse.success ? friendReqResponse.data.length : 0;
        
        // Tổng số = unread notifications + friend requests
        this.setState({
          notificationCount: response.data.count + friendRequestCount
        });
      }
    } catch (error) {
      console.error('Load notification count error:', error);
    }
  }

  handleClickOutside = (event) => {
    if (this.menuRef.current && !this.menuRef.current.contains(event.target)) {
      this.setState({ showUserMenu: false });
    }
    if (this.notificationRef.current && !this.notificationRef.current.contains(event.target)) {
      this.setState({ showNotifications: false });
    }
  };

  toggleSidebar = () => {
    this.setState(prevState => ({
      showSidebar: !prevState.showSidebar
    }));
  };

  toggleUserMenu = () => {
    this.setState(prevState => ({
      showUserMenu: !prevState.showUserMenu
    }));
  };

  handleOpenCreateGroup = () => {
    this.setState({ showCreateGroupModal: true, showUserMenu: false });
  };

  handleCloseCreateGroup = () => {
    this.setState({ showCreateGroupModal: false });
  };

  handleOpenFriendsList = () => {
    this.setState({ showFriendsList: true, showUserMenu: false });
  };

  handleCloseFriendsList = () => {
    this.setState({ showFriendsList: false });
  };

  handleOpenSettings = () => {
    this.setState({ showSettingsModal: true, showUserMenu: false });
  };

  handleCloseSettings = () => {
    this.setState({ showSettingsModal: false });
  };

  toggleNotifications = () => {
    this.setState(prevState => ({
      showNotifications: !prevState.showNotifications,
      showUserMenu: false
    }));
  };

  handleNotificationTabChange = (tab) => {
    this.setState({ notificationTab: tab });
  };

  handleNotificationCountChange = (count) => {
    this.setState({ notificationCount: count });
  };

  handleLogout = async () => {
    await this.context.logout();
    window.location.href = '/login';
  };

  render() {
    const { user } = this.context;
    const { showSidebar, showUserMenu, showNotifications, notificationTab, notificationCount } = this.state;

    return (
      <div className="chat-home">
        <div className="top-header">
          <div className="header-actions">
            {/* Notification Bell */}
            <div className="notification-container" ref={this.notificationRef}>
              <button className="notification-bell-btn" onClick={this.toggleNotifications}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </button>

              {showNotifications && (
                <FriendNotifications 
                  activeTab={notificationTab}
                  onTabChange={this.handleNotificationTabChange}
                  onCountChange={this.handleNotificationCountChange}
                />
              )}
            </div>

            {/* User Menu */}
            <div className="user-menu-container" ref={this.menuRef}>
              <button className="user-info-btn" onClick={this.toggleUserMenu}>
                <div className="user-avatar">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar.startsWith('http') 
                        ? user.avatar 
                        : `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.avatar}`
                      } 
                      alt={user.fullName || user.username}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.username || 'U')}&size=80&background=8b5cf6&color=fff`}
                      alt={user?.fullName || user?.username}
                      style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                    />
                  )}
                </div>
                <span className="user-name">
                  {user?.fullName || user?.username}
                </span>
                <span className="dropdown-arrow">{showUserMenu ? '▲' : '▼'}</span>
              </button>

              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <div className="user-menu-header">
                    <div className="user-menu-avatar">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar.startsWith('http') 
                            ? user.avatar 
                            : `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.avatar}`
                          } 
                          alt={user.fullName || user.username}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.username || 'U')}&size=80&background=8b5cf6&color=fff`}
                          alt={user?.fullName || user?.username}
                          style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                        />
                      )}
                    </div>
                    <div className="user-menu-info">
                      <div className="user-menu-name">{user?.fullName || user?.username}</div>
                      <div className="user-menu-email">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="user-menu-divider"></div>
                  
                  <div className="user-menu-items">
                    {user?.role === 'admin' && (
                      <a href="/admin" className="user-menu-item">
                        <span className="menu-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        </span>
                        <span className="menu-text">Quản Trị</span>
                      </a>
                    )}
                    
                    <a href="/profile" className="user-menu-item">
                      <span className="menu-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                      <span className="menu-text">Trang Cá Nhân</span>
                    </a>
                    
                    <button className="user-menu-item" onClick={this.handleOpenFriendsList}>
                      <span className="menu-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </span>
                      <span className="menu-text">Danh Sách Bạn Bè</span>
                    </button>
                    
                    <button className="user-menu-item" onClick={this.handleOpenCreateGroup}>
                      <span className="menu-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                      </span>
                      <span className="menu-text">Tạo Nhóm Chat</span>
                    </button>
                    
                    <button className="user-menu-item" onClick={this.handleOpenSettings}>
                      <span className="menu-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                      </span>
                      <span className="menu-text">Cài Đặt & Quyền Riêng Tư</span>
                    </button>
                    
                    <div className="user-menu-divider"></div>
                    
                    <button className="user-menu-item logout-item" onClick={this.handleLogout}>
                      <span className="menu-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                      </span>
                      <span className="menu-text">Đăng Xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <ChatContext.Consumer>
          {(chatContext) => (
            <>
              {showSidebar && (
                <div className="sidebar">
                  <div className="sidebar-header">
                    <h2>Ứng Dụng Chat</h2>
                    <div className="search-bar">
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm cuộc trò chuyện..."
                      />
                    </div>
                  </div>
                  <ConversationList />
                </div>
              )}
              
              <div className="main-chat">
                <ChatWindow />
              </div>
            </>
          )}
        </ChatContext.Consumer>

        {this.state.showCreateGroupModal && (
          <CreateGroupModal onClose={this.handleCloseCreateGroup} />
        )}

        {this.state.showFriendsList && (
          <FriendsList onClose={this.handleCloseFriendsList} />
        )}

        {this.state.showSettingsModal && (
          <UserSettings onClose={this.handleCloseSettings} />
        )}
      </div>
    );
  }
}

// Wrapper class component to provide socket from context
class ChatHomeWithSocket extends Component {
  render() {
    const props = this.props;
    return (
      <SocketContext.Consumer>
        {({ socket }) => <ChatHome {...props} socket={socket} />}
      </SocketContext.Consumer>
    );
  }
}

export default ChatHomeWithSocket;
