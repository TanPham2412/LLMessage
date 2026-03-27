var Notification = require(global.__basedir + "/apps/Entity/Notification");

class NotificationRepository {
    constructor() {

    }

    async create(notificationData) {
        const notification = await Notification.create(notificationData);
        return notification;
    }

    async findById(id) {
        return await Notification.findById(id).populate('recipient').populate('sender');
    }

    async findByUserId(userId, limit = 20, skip = 0) {
        return await Notification.find({ recipient: userId })
            .populate('sender')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);
    }

    async countByUserId(userId) {
        return await Notification.countDocuments({ recipient: userId });
    }

    async countUnreadByUserId(userId) {
        return await Notification.countDocuments({ recipient: userId, isRead: false });
    }

    async markAsRead(id) {
        return await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    }

    async markAllAsRead(userId) {
        return await Notification.updateMany({ recipient: userId }, { isRead: true });
    }

    async deleteNotification(id) {
        return await Notification.findByIdAndDelete(id);
    }

    async deleteByUserId(userId) {
        return await Notification.deleteMany({ recipient: userId });
    }
}

module.exports = NotificationRepository;
