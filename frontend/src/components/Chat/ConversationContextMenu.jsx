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
          <span className="context-menu-icon">📌</span>
          <span className="context-menu-text">{isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
        </div>

        <div className="context-menu-item" onClick={() => this.handleAction('createGroup')}>
          <span className="context-menu-icon">👫</span>
          <span className="context-menu-text">Tạo nhóm chat</span>
        </div>

        <div className="context-menu-divider"></div>

        <div className="context-menu-item" onClick={() => this.handleAction('restrict')}>
          <span className="context-menu-icon">🔕</span>
          <span className="context-menu-text">{isRestricted ? 'Bỏ hạn chế' : 'Hạn chế'}</span>
        </div>

        <div className="context-menu-item warning" onClick={() => this.handleAction('block')}>
          <span className="context-menu-icon">🚫</span>
          <span className="context-menu-text">{isBlocked ? 'Bỏ chặn' : 'Chặn'}</span>
        </div>

        <div className="context-menu-divider"></div>

        <div className="context-menu-item danger" onClick={() => this.handleAction('delete')}>
          <span className="context-menu-icon">🗑️</span>
          <span className="context-menu-text">Xóa trò chuyện</span>
        </div>
      </div>
    );
  }
}

export default ConversationContextMenu;
