import React, { useState, useRef, useEffect } from 'react';
import '../../styles/MessageActions.css';

const MessageActions = ({ 
  message, 
  currentUserId,
  onEdit, 
  onDelete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Only show for own messages
  if (!message || !message.sender || message.sender._id !== currentUserId) {
    return null;
  }

  // Don't show for deleted messages
  if (message.isDeleted) {
    return null;
  }

  // Check time restrictions
  const now = Date.now();
  const msgAge = now - new Date(message.createdAt).getTime();
  const canEdit = message.type === 'text' && msgAge < 15 * 60 * 1000;
  const canDelete = msgAge < 12 * 60 * 60 * 1000;

  // Don't show if can't do anything
  if (!canEdit && !canDelete) {
    return null;
  }

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(message);
    setIsOpen(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) {
      onDelete(message._id);
    }
    setIsOpen(false);
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div 
      className="message-actions" 
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        className="menu-toggle"
        onClick={toggleMenu}
        title="Tùy chọn"
        aria-label="Tùy chọn"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>

      {isOpen && (
        <div className="message-menu-dropdown">
          {canEdit && message.type === 'text' && (
            <button 
              className="menu-option edit-option" 
              onClick={handleEdit}
              title="Chỉnh sửa tin nhắn (15 phút)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
              </svg>
              <span>Chỉnh sửa</span>
            </button>
          )}
          {canDelete && (
            <button 
              className="menu-option delete-option"
              onClick={handleDelete}
              title="Thu hồi tin nhắn (12 tiếng)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span>Thu hồi</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
