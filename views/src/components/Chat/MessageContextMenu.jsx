import React from 'react';
import '../../styles/MessageContextMenu.css';

const MessageContextMenu = ({ 
  message, 
  position, 
  currentUserId,
  onEdit, 
  onDelete, 
  onClose 
}) => {
  // Only show menu for own messages
  const isOwnMessage = message.sender?._id === currentUserId;
  
  if (!isOwnMessage) {
    return null;
  }

  const handleEdit = () => {
    onEdit(message);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) {
      onDelete(message._id);
      onClose();
    }
  };

  return (
    <div 
      className="message-context-menu"
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 1000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="context-menu-item" onClick={handleEdit}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        Chỉnh sửa
      </button>
      <button className="context-menu-item delete" onClick={handleDelete}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
        Thu hồi
      </button>
    </div>
  );
};

export default MessageContextMenu;
