import React, { Component } from 'react';
import { AuthContext } from '../../context/AuthContext.jsx';
import { ChatContext } from '../../context/ChatContext.jsx';
import { SocketContext } from '../../context/SocketContext.jsx';
import ConversationList from './ConversationList.jsx';
import ChatWindow from './ChatWindow.jsx';
import AddFriendModal from './AddFriendModal.jsx';
import CreateGroupModal from './CreateGroupModal.jsx';
import FriendNotifications from './FriendNotifications.jsx';
import api from '../../services/api';
import '../../styles/Chat.css';

class ChatHome extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      showSidebar: true,
      showUserMenu: false,
      showAddFriendModal: false,
      showCreateGroupModal: false,
      showNotifications: false,
      notificationTab: 'requests',
      notificationCount: 0
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

  handleOpenAddFriend = () => {
    this.setState({ 
      showAddFriendModal: true,
      showUserMenu: false 
    });
  };

  handleCloseAddFriend = () => {
    this.setState({ showAddFriendModal: false });
  };

  handleOpenCreateGroup = () => {
    this.setState({ showCreateGroupModal: true, showUserMenu: false });
  };

  handleCloseCreateGroup = () => {
    this.setState({ showCreateGroupModal: false });
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
                🔔
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
                  {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
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
                      {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
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
                        <span className="menu-icon">👑</span>
                        <span className="menu-text">Quản Trị</span>
                      </a>
                    )}
                    
                    <button className="user-menu-item" onClick={() => alert('Tính năng đang phát triển')}>
                      <span className="menu-icon">👤</span>
                      <span className="menu-text">Trang Cá Nhân</span>
                    </button>
                    
                    <button className="user-menu-item" onClick={this.handleOpenAddFriend}>
                      <span className="menu-icon">👥</span>
                      <span className="menu-text">Thêm Bạn Bè</span>
                    </button>
                    
                    <button className="user-menu-item" onClick={this.handleOpenCreateGroup}>
                      <span className="menu-icon">👫</span>
                      <span className="menu-text">Tạo Nhóm Chat</span>
                    </button>
                    
                    <button className="user-menu-item" onClick={() => alert('Tính năng đang phát triển')}>
                      <span className="menu-icon">⚙️</span>
                      <span className="menu-text">Cài Đặt & Quyền Riêng Tư</span>
                    </button>
                    
                    <div className="user-menu-divider"></div>
                    
                    <button className="user-menu-item logout-item" onClick={this.handleLogout}>
                      <span className="menu-icon">🚪</span>
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

        {this.state.showAddFriendModal && (
          <AddFriendModal onClose={this.handleCloseAddFriend} />
        )}

        {this.state.showCreateGroupModal && (
          <CreateGroupModal onClose={this.handleCloseCreateGroup} />
        )}
      </div>
    );
  }
}

// Wrapper component to provide socket from context
const ChatHomeWithSocket = (props) => (
  <SocketContext.Consumer>
    {({ socket }) => <ChatHome {...props} socket={socket} />}
  </SocketContext.Consumer>
);

export default ChatHomeWithSocket;
