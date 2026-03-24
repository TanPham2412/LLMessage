import React, { Component } from 'react';
import '../../styles/ConversationContextMenu.css';

class ConversationContextMenu extends Component {
  constructor(props) {
    super(props);
    this.menuRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    document.addEventListener('contextmenu', this.handleOutsideContextMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
    document.removeEventListener('contextmenu', this.handleOutsideContextMenu);
  }

  handleClickOutside = (event) => {
    if (this.menuRef.current && !this.menuRef.current.contains(event.target)) {
      this.props.onClose();
    }
  };

  handleOutsideContextMenu = (event) => {
    if (this.menuRef.current && !this.menuRef.current.contains(event.target)) {
      this.props.onClose();
    }
  };

  handleAction = (action) => {
    this.props.onAction(action);
    this.props.onClose();
  };

  render() {
    const { x, y, conversation, isPinned, isRestricted, isBlocked } = this.props;
    const isGroup = conversation?.type === 'group';

    return (
      <div
        ref={this.menuRef}
        className="conversation-context-menu"
        style={{
          position: 'fixed',
          left: `${x}px`,
          top: `${y}px`,
          zIndex: 10000
        }}
      >
        <div className="context-menu-item" onClick={() => this.handleAction('pin')}>
          <span className="context-menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"/>
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
            </svg>
          </span>
          <span className="context-menu-text">{isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
        </div>

        {!isGroup && (
          <div className="context-menu-item" onClick={() => this.handleAction('createGroup')}>
            <span className="context-menu-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <span className="context-menu-text">Tạo nhóm chat</span>
          </div>
        )}

        {!isGroup && <div className="context-menu-divider"></div>}

        {!isGroup && (
          <div className="context-menu-item" onClick={() => this.handleAction('restrict')}>
            <span className="context-menu-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                <path d="M18.63 13A18 18 0 0 1 18 8 6 6 0 0 0 6.06 8c0 .2-.04.4-.06.6A18.13 18.13 0 0 1 3 19h15l.63-6z"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </span>
            <span className="context-menu-text">{isRestricted ? 'Bỏ hạn chế' : 'Hạn chế'}</span>
          </div>
        )}

        {!isGroup && (
          <div className="context-menu-item warning" onClick={() => this.handleAction('block')}>
            <span className="context-menu-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </span>
            <span className="context-menu-text">{isBlocked ? 'Bỏ chặn' : 'Chặn'}</span>
          </div>
        )}

        <div className="context-menu-divider"></div>

        <div className="context-menu-item danger" onClick={() => this.handleAction('delete')}>
          <span className="context-menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </span>
          <span className="context-menu-text">Xóa trò chuyện</span>
        </div>
      </div>
    );
  }
}

export default ConversationContextMenu;
