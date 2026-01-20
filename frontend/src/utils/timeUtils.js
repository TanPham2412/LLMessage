export const getTimeAgo = (date) => {
  if (!date) return 'Không rõ';
  
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) {
    return 'Vừa xong';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `Ngoại tuyến ${minutes} phút trước`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Ngoại tuyến ${hours} giờ trước`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `Ngoại tuyến ${days} ngày trước`;
  }
  
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Ngoại tuyến ${months} tháng trước`;
  }
  
  const years = Math.floor(months / 12);
  return `Ngoại tuyến ${years} năm trước`;
};

export const getOnlineStatus = (user, isOnline) => {
  if (isOnline) {
    return { text: 'Đang hoạt động', className: 'online' };
  }
  
  return { text: getTimeAgo(user.lastSeen), className: 'offline' };
};
