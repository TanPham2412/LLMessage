import React, { Component } from 'react';
import api from '../../services/api';
import { SocketContext } from '../../context/SocketContext.jsx';
import '../../styles/FriendNotifications.css';

class FriendNotifications extends Component {
  static contextType = SocketContext;

  constructor(props) {
    super(props);
    this.state = {
      friendRequests: [],
      notifications: [],
      loading: false,
      error: null
    };
  }

  componentDidMount() {
    this.loadFriendRequests();
    this.loadNotifications(); // Load notifications from database
    this.setupSocketListeners();
    this.notifyCountChange();
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.friendRequests.length !== this.state.friendRequests.length ||
      prevState.notifications.length !== this.state.notifications.length
    ) {
      this.notifyCountChange();
    }
  }

  componentWillUnmount() {
    this.removeSocketListeners();
  }

  notifyCountChange = () => {
    const { friendRequests, notifications } = this.state;
    const totalCount = friendRequests.length + notifications.length;
    
    if (this.props.onCountChange) {
      this.props.onCountChange(totalCount);
    }
  }

  setupSocketListeners = () => {
    const { socket } = this.context;
    
    if (socket) {
      socket.on('friend-request-received', this.handleFriendRequestReceived);
      socket.on('friend-request-accepted', this.handleFriendRequestAccepted);
      socket.on('friend-request-rejected', this.handleFriendRequestRejected);
    }
  }

  removeSocketListeners = () => {
    const { socket } = this.context;
    
    if (socket) {
      socket.off('friend-request-received', this.handleFriendRequestReceived);
      socket.off('friend-request-accepted', this.handleFriendRequestAccepted);
      socket.off('friend-request-rejected', this.handleFriendRequestRejected);
    }
  }

  handleFriendRequestReceived = (data) => {
    console.log('Friend request received:', data);
    
    // Thêm vào danh sách friend requests
    this.setState(prevState => ({
      friendRequests: [
        {
          _id: data.requestId,
          from: data.from,
          createdAt: data.createdAt
        },
        ...prevState.friendRequests
      ]
    }));

    // Thêm thông báo
    this.addNotification({
      type: 'friend-request',
      message: `${data.from.fullName || data.from.username} đã gửi lời mời kết bạn`,
      from: data.from,
      createdAt: data.createdAt
    });
  }

  handleFriendRequestAccepted = (data) => {
    console.log('Friend request accepted:', data);
    
    this.addNotification({
      type: 'accepted',
      message: data.message,
      from: data.from,
      createdAt: data.createdAt
    });
  }

  handleFriendRequestRejected = (data) => {
    console.log('Friend request rejected:', data);
    
    this.addNotification({
      type: 'rejected',
      message: data.message,
      from: data.from,
      createdAt: data.createdAt
    });
  }

  addNotification = (notification) => {
    this.setState(prevState => ({
      notifications: [
        { ...notification, id: Date.now() },
        ...prevState.notifications
      ].slice(0, 20) // Giữ tối đa 20 thông báo
    }));
  }

  loadNotifications = async () => {
    try {
      const response = await api.getNotifications({ limit: 20 });
      
      if (response.success) {
        // Transform database notifications to match component format
        const dbNotifications = response.data.map(notif => ({
          id: notif._id,
          type: this.mapNotificationType(notif.type),
          message: notif.message,
          from: notif.sender,
          createdAt: notif.createdAt,
          isRead: notif.isRead
        }));
        
        this.setState({
          notifications: dbNotifications
        });
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  }

  mapNotificationType = (dbType) => {
    const typeMap = {
      'friend-request': 'friend-request',
      'friend-accepted': 'accepted',
      'friend-rejected': 'rejected'
    };
    return typeMap[dbType] || dbType;
  }

  loadFriendRequests = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const response = await api.getFriendRequests();
      
      if (response.success) {
        this.setState({
          friendRequests: response.data,
          loading: false
        });
      }
    } catch (error) {
      console.error('Load friend requests error:', error);
      this.setState({
        error: 'Không thể tải lời mời kết bạn',
        loading: false
      });
    }
  }

  handleAcceptRequest = async (requestId) => {
    try {
      this.setState({ loading: true });
      
      const response = await api.acceptFriendRequest(requestId);
      
      if (response.success) {
        // Xóa khỏi danh sách friend requests
        this.setState(prevState => ({
          friendRequests: prevState.friendRequests.filter(req => req._id !== requestId),
          loading: false
        }));

        // Backend socket sẽ tự động gửi notification cho người gửi lời mời
      }
    } catch (error) {
      console.error('Accept friend request error:', error);
      this.setState({
        error: error.response?.data?.message || 'Không thể chấp nhận lời mời',
        loading: false
      });
    }
  }

  handleRejectRequest = async (requestId) => {
    try {
      this.setState({ loading: true });
      
      const response = await api.rejectFriendRequest(requestId);
      
      if (response.success) {
        // Xóa khỏi danh sách friend requests
        this.setState(prevState => ({
          friendRequests: prevState.friendRequests.filter(req => req._id !== requestId),
          loading: false
        }));

        // Backend socket sẽ tự động gửi notification cho người gửi lời mời
      }
    } catch (error) {
      console.error('Reject friend request error:', error);
      this.setState({
        error: error.response?.data?.message || 'Không thể từ chối lời mời',
        loading: false
      });
    }
  }

  clearNotification = async (notificationId) => {
    try {
      // Xóa khỏi database nếu có _id từ DB
      if (notificationId.length === 24) { // MongoDB ObjectId length
        await api.deleteNotification(notificationId);
      }
      
      // Xóa khỏi state
      this.setState(prevState => ({
        notifications: prevState.notifications.filter(n => n.id !== notificationId)
      }));
    } catch (error) {
      console.error('Clear notification error:', error);
      // Vẫn xóa khỏi UI nếu lỗi
      this.setState(prevState => ({
        notifications: prevState.notifications.filter(n => n.id !== notificationId)
      }));
    }
  }

  getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  }

  render() {
    const { friendRequests, notifications, loading } = this.state;
    const { activeTab = 'requests' } = this.props;

    const totalCount = friendRequests.length + notifications.length;

    return (
      <div className="friend-notifications-dropdown">
        <div className="notifications-header">
          <h3>Thông báo</h3>
          <span className="notification-count">{totalCount}</span>
        </div>

        <div className="notifications-tabs">
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => this.props.onTabChange?.('requests')}
          >
            Lời mời kết bạn
            {friendRequests.length > 0 && (
              <span className="tab-badge">{friendRequests.length}</span>
            )}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => this.props.onTabChange?.('notifications')}
          >
            Thông báo
            {notifications.length > 0 && (
              <span className="tab-badge">{notifications.length}</span>
            )}
          </button>
        </div>

        <div className="notifications-body">
          {activeTab === 'requests' && (
            <div className="friend-requests-list">
              {loading ? (
                <div className="loading-message">Đang tải...</div>
              ) : friendRequests.length === 0 ? (
                <div className="empty-message">
                  <div className="empty-icon">👥</div>
                  <p>Không có lời mời kết bạn nào</p>
                </div>
              ) : (
                friendRequests.map((request) => (
                  <div key={request._id} className="friend-request-item">
                    <div className="request-avatar">
                      {request.from.avatar ? (
                        <img src={request.from.avatar} alt={request.from.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {(request.from.fullName || request.from.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="request-info">
                      <div className="request-name">
                        {request.from.fullName || request.from.username}
                      </div>
                      <div className="request-time">
                        {this.getTimeAgo(request.createdAt)}
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn-accept"
                          onClick={() => this.handleAcceptRequest(request._id)}
                          disabled={loading}
                        >
                          Xác nhận
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => this.handleRejectRequest(request._id)}
                          disabled={loading}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="empty-message">
                  <div className="empty-icon">🔔</div>
                  <p>Không có thông báo nào</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`notification-item notification-${notification.type}`}
                  >
                    <div className="notification-avatar">
                      {notification.from?.avatar ? (
                        <img src={notification.from.avatar} alt="" />
                      ) : notification.from ? (
                        <div className="avatar-placeholder">
                          {(notification.from.fullName || notification.from.username).charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="notification-icon">
                          {notification.type === 'accepted' && '✓'}
                          {notification.type === 'rejected' && '✕'}
                          {notification.type === 'friend-request' && '👥'}
                          {notification.type === 'success' && '✓'}
                          {notification.type === 'info' && 'ℹ'}
                        </div>
                      )}
                    </div>
                    <div className="notification-content">
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {this.getTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                    <button
                      className="notification-close"
                      onClick={() => this.clearNotification(notification.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default FriendNotifications;
