import React, { useEffect, useRef } from 'react';
import '../../styles/MessageContextMenu.css';

const MessageContextMenu = ({ 
  message, 
  position,
  currentUserId,
  isPinned,
  onEdit, 
  onDeleteForMe,
  onDeleteForAll,
  onPin,
  onClose 
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = position.x;
      let y = position.y;
      if (x + rect.width > vw) x = vw - rect.width - 8;
      if (y + rect.height > vh) y = vh - rect.height - 8;
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
    }
  }, [position]);

  if (!message) return null;

  const now = Date.now();
  const msgAge = now - new Date(message.createdAt).getTime();
  const isOwn = message.sender._id === currentUserId || message.sender === currentUserId;
  const canEdit = isOwn && message.type === 'text' && !message.isDeleted && msgAge < 15 * 60 * 1000;
  const canDeleteForAll = isOwn && !message.isDeleted && msgAge < 12 * 60 * 60 * 1000;
  const canDeleteForMe = !message.isDeleted;

  const handle = (fn) => (e) => {
    e.stopPropagation();
    fn();
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="message-context-menu"
      style={{ position: 'fixed', top: `${position.y}px`, left: `${position.x}px`, zIndex: 9999 }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Ghim / Bỏ ghim - mọi tin nhắn */}
      {!message.isDeleted && (
        <button className="context-menu-item" onClick={handle(() => onPin(message))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="17" x2="12" y2="22"/>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
          </svg>
          {isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
        </button>
      )}

      {/* Chỉnh sửa - chỉ tin nhắn text của mình < 15 phút */}
      {canEdit && (
        <button className="context-menu-item" onClick={handle(() => onEdit(message))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
          Chỉnh sửa
        </button>
      )}

      {/* Xóa phía tôi - mọi tin nhắn chưa bị xóa */}
      {canDeleteForMe && (
        <button className="context-menu-item" onClick={handle(() => onDeleteForMe(message._id))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Xóa phía tôi
        </button>
      )}

      {/* Thu hồi (xóa cả mọi phía) - chỉ tin nhắn của mình < 12 tiếng */}
      {canDeleteForAll && (
        <button className="context-menu-item delete" onClick={handle(() => {
          if (window.confirm('Thu hồi tin nhắn này? Tất cả mọi người sẽ không còn thấy nó.')) {
            onDeleteForAll(message._id);
          }
        })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          Thu hồi (xóa mọi phía)
        </button>
      )}
    </div>
  );
};

export default MessageContextMenu;
