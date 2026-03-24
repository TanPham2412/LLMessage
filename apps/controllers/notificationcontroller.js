var express = require("express");
var router = express.Router();
var Notification = require(global.__basedir + "/apps/Entity/Notification");
var User = require(global.__basedir + "/apps/Entity/User");
var { authenticate } = require(global.__basedir + "/apps/middleware/auth");

// socketHandler sẽ được set từ app.js
var socketHandler = null;
router.setSocketHandler = function(handler) {
    socketHandler = handler;
};

// All routes require authentication
router.use(authenticate);

// GET / - Get all notifications
router.get("/", async function(req, res) {
    try {
        var userId = req.user.id;
        var { page, limit, unreadOnly } = req.query;
        page = page || 1;
        limit = limit || 20;

        var query = { recipient: userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        var notifications = await Notification.find(query)
            .populate('sender', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        var count = await Notification.countDocuments(query);

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
        res.status(500).json({ success: false, message: 'Failed to get notifications', error: error.message });
    }
});

// GET /unread-count - Get unread count
router.get("/unread-count", async function(req, res) {
    try {
        var userId = req.user.id;

        var count = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.json({ success: true, data: { count: count } });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Failed to get unread count', error: error.message });
    }
});

// PUT /:notificationId/read - Mark notification as read
router.put("/:notificationId/read", async function(req, res) {
    try {
        var { notificationId } = req.params;
        var userId = req.user.id;

        var notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark as read', error: error.message });
    }
});

// PUT /mark-all-read - Mark all as read
router.put("/mark-all-read", async function(req, res) {
    try {
        var userId = req.user.id;

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark all as read', error: error.message });
    }
});

// DELETE /:notificationId - Delete notification
router.delete("/:notificationId", async function(req, res) {
    try {
        var { notificationId } = req.params;
        var userId = req.user.id;

        var notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
    }
});

// DELETE / - Clear all notifications
router.delete("/", async function(req, res) {
    try {
        var userId = req.user.id;

        await Notification.deleteMany({ recipient: userId });

        res.json({ success: true, message: 'All notifications cleared' });
    } catch (error) {
        console.error('Clear all error:', error);
        res.status(500).json({ success: false, message: 'Failed to clear notifications', error: error.message });
    }
});

// POST /report - Report a user
router.post("/report", async function(req, res) {
    try {
        var reporterId = req.user.id;
        var { reportedUserId, reason, description } = req.body;

        if (!reportedUserId || !reason) {
            return res.status(400).json({ success: false, message: 'reportedUserId and reason are required' });
        }

        var reporter = await User.findById(reporterId).select('fullName username');
        var reportedUser = await User.findById(reportedUserId).select('fullName username');
        var admins = await User.find({ role: 'admin' }).select('_id');

        if (!reportedUser) {
            return res.status(404).json({ success: false, message: 'Reported user not found' });
        }

        if (admins.length === 0) {
            return res.status(500).json({ success: false, message: 'No admin found to receive report' });
        }

        var reporterName = (reporter && reporter.fullName) || (reporter && reporter.username) || 'Người dùng';
        var reportedName = reportedUser.fullName || reportedUser.username;
        var title = 'Báo cáo người dùng: ' + reportedName;
        var message = reporterName + ' đã báo cáo ' + reportedName + ' vì lý do: ' + reason + (description ? '. Chi tiết: ' + description : '');

        await Promise.all(
            admins.map(function(admin) {
                return Notification.create({
                    recipient: admin._id,
                    sender: reporterId,
                    type: 'report',
                    title: title,
                    message: message,
                    data: { reportedUserId: reportedUserId, reason: reason, description: description, reporterId: reporterId }
                });
            })
        );

        if (socketHandler) {
            admins.forEach(function(admin) {
                socketHandler.sendNotificationToUser(admin._id.toString(), 'new-report', {
                    title: title,
                    message: message,
                    reportedUserId: reportedUserId,
                    reason: reason
                });
            });
        }

        res.json({ success: true, message: 'Báo cáo đã được gửi đến quản trị viên' });
    } catch (error) {
        console.error('Report user error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit report', error: error.message });
    }
});

module.exports = router;
