const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationController {
  constructor() {
    this.socketHandler = null;
  }

  setSocketHandler(socketHandler) {
    this.socketHandler = socketHandler;
  }
  // Get all notifications for current user
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const query = { recipient: userId };
      if (unreadOnly === 'true') {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .populate('sender', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const count = await Notification.countDocuments(query);

      res.json({
        success: true,
        data: notifications,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        error: error.message
      });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: error.message
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark as read',
        error: error.message
      });
    }
  }

  // Mark all as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all as read',
        error: error.message
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }

  // Clear all notifications
  async clearAll(req, res) {
    try {
      const userId = req.user.id;

      await Notification.deleteMany({ recipient: userId });

      res.json({
        success: true,
        message: 'All notifications cleared'
      });
    } catch (error) {
      console.error('Clear all error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear notifications',
        error: error.message
      });
    }
  }

  // Helper method to create notification
  static async createNotification(recipientId, senderId, type, title, message, data = {}) {
    try {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        data
      });

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Report a user - sends notification to all admins
  async reportUser(req, res) {
    try {
      const reporterId = req.user.id;
      const { reportedUserId, reason, description } = req.body;

      if (!reportedUserId || !reason) {
        return res.status(400).json({ success: false, message: 'reportedUserId and reason are required' });
      }

      const [reporter, reportedUser, admins] = await Promise.all([
        User.findById(reporterId).select('fullName username'),
        User.findById(reportedUserId).select('fullName username'),
        User.find({ role: 'admin' }).select('_id')
      ]);

      if (!reportedUser) {
        return res.status(404).json({ success: false, message: 'Reported user not found' });
      }

      if (admins.length === 0) {
        return res.status(500).json({ success: false, message: 'No admin found to receive report' });
      }

      const reporterName = reporter?.fullName || reporter?.username || 'Người dùng';
      const reportedName = reportedUser.fullName || reportedUser.username;
      const title = `Báo cáo người dùng: ${reportedName}`;
      const message = `${reporterName} đã báo cáo ${reportedName} vì lý do: ${reason}${description ? '. Chi tiết: ' + description : ''}`;

      const notifications = await Promise.all(
        admins.map(admin =>
          Notification.create({
            recipient: admin._id,
            sender: reporterId,
            type: 'report',
            title,
            message,
            data: { reportedUserId, reason, description, reporterId }
          })
        )
      );

      // Emit real-time socket notification to admins
      if (this.socketHandler) {
        admins.forEach(admin => {
          this.socketHandler.sendNotificationToUser(admin._id.toString(), 'new-report', {
            title,
            message,
            reportedUserId,
            reason
          });
        });
      }

      res.json({ success: true, message: 'Báo cáo đã được gửi đến quản trị viên' });
    } catch (error) {
      console.error('Report user error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit report', error: error.message });
    }
  }
}

module.exports = new NotificationController();
