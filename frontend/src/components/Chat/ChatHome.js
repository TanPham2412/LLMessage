import React, { Component } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ChatContext } from '../../context/ChatContext';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import '../../styles/Chat.css';

class ChatHome extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      showSidebar: true
    };
  }

  toggleSidebar = () => {
    this.setState(prevState => ({
      showSidebar: !prevState.showSidebar
    }));
  };

  handleLogout = async () => {
    await this.context.logout();
    window.location.href = '/login';
  };

  render() {
    const { user } = this.context;
    const { showSidebar } = this.state;

    return (
      <div className="chat-home">
        <div className="chat-header">
          <h2>Ứng Dụng Chat</h2>
          <div className="header-actions">
            <span className="user-info">
              {user?.fullName || user?.username}
            </span>
            {user?.role === 'admin' && (
              <a href="/admin" className="btn-admin">Quản Trị</a>
            )}
            <button onClick={this.handleLogout} className="btn-logout">
              Đăng Xuất
            </button>
          </div>
        </div>

        <div className="chat-container">
          <ChatContext.Consumer>
            {(chatContext) => (
              <>
                {showSidebar && (
                  <div className="sidebar">
                    <ConversationList />
                  </div>
                )}
                
                <div className="main-chat">
                  <ChatWindow />
                </div>
              </>
            )}
          </ChatContext.Consumer>
        </div>
      </div>
    );
  }
}

export default ChatHome;
