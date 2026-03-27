var express = require("express");
var router = express.Router();
var MessageService = require(global.__basedir + "/apps/Services/MessageService");
var { authenticate, isAdmin } = require(global.__basedir + "/apps/middleware/auth");
var multer = require('multer');
var path = require('path');
var fs = require('fs');

// Upload config
var uploadDir = global.__basedir + '/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        var ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

var allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|xlsx|xls|ppt|pptx|rar|7z|mp3|mp4|mov|avi)$/i;
var allowedMimetypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'audio/mpeg', 'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'application/octet-stream'
];

var fileFilter = function(req, file, cb) {
    var extname = allowedExtensions.test(file.originalname);
    var isMimetypeAllowed = allowedMimetypes.includes(file.mimetype);

    if (extname && (isMimetypeAllowed || file.mimetype === 'application/octet-stream')) {
        return cb(null, true);
    } else {
        cb(new Error('File type not allowed'));
    }
};

var upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

// socketHandler sẽ được set từ app.js
var socketHandler = null;
router.setSocketHandler = function(handler) {
    socketHandler = handler;
};

// All routes require authentication
router.use(authenticate);

// POST / - Send message (with optional file upload)
router.post("/", upload.single('file'), async function(req, res) {
    try {
        var messageService = new MessageService();
        var { conversationId, content, type, contactData } = req.body;
        var senderId = req.user.id;

        var fileData = null;
        if (req.file) {
            var originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
            fileData = {
                fileUrl: "/uploads/" + req.file.filename,
                fileName: originalName,
                fileSize: req.file.size,
                type: req.file.mimetype.startsWith('image/') ? 'image' : 'file'
            };
        }

        var result = await messageService.sendMessage(conversationId, senderId, content, type, fileData, contactData ? (typeof contactData === 'string' ? JSON.parse(contactData) : contactData) : null);

        if (!result.success) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
    }
});

// GET /conversation/:conversationId - Get messages for a conversation
router.get("/conversation/:conversationId", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { conversationId } = req.params;
        var { page, limit } = req.query;
        page = page || 1;
        limit = limit || 50;
        var userId = req.user.id;

        var result = await messageService.getMessages(conversationId, userId, page, limit);

        if (!result.success) {
            var statusCode = result.message === 'Conversation not found' ? 404 : 403;
            return res.status(statusCode).json({ success: false, message: result.message });
        }

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
    }
});

// PUT /:messageId/read - Mark message as read
router.put("/:messageId/read", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { messageId } = req.params;
        var userId = req.user.id;

        var result = await messageService.markAsRead(messageId, userId);

        if (!result.success) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark message as read', error: error.message });
    }
});

// PUT /:messageId - Edit message
router.put("/:messageId", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { messageId } = req.params;
        var { content } = req.body;
        var userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Content cannot be empty' });
        }

        var result = await messageService.editMessage(messageId, userId, content);

        if (!result.success) {
            var statusCode = result.forbidden ? 403 : 400;
            if (result.message === 'Message not found') statusCode = 404;
            return res.status(statusCode).json({ success: false, message: result.message });
        }

        // Emit socket event for real-time update
        if (socketHandler && socketHandler.io && result.data.conversation) {
            socketHandler.io.to("conversation:" + result.data.conversation).emit('message-edited', {
                _id: result.data._id,
                conversation: result.data.conversation,
                content: result.data.content,
                editedAt: result.data.editedAt,
                isEdited: result.data.isEdited
            });
        }

        res.json({ success: true, message: 'Message edited successfully', data: { 
            _id: result.data._id,
            conversation: result.data.conversation,
            content: result.data.content,
            editedAt: result.data.editedAt,
            isEdited: result.data.isEdited
        } });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ success: false, message: 'Failed to edit message', error: error.message });
    }
});

// DELETE /:messageId/me - Delete message for me only
router.delete("/:messageId/me", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { messageId } = req.params;
        var userId = req.user.id;

        var result = await messageService.deleteMessageForMe(messageId, userId);
        if (!result.success) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.json({ success: true, message: 'Message removed from your view', data: result.data });
    } catch (error) {
        console.error('Delete for me error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete message', error: error.message });
    }
});

// POST /:messageId/pin - Pin or unpin a message
router.post("/:messageId/pin", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { messageId } = req.params;
        var { conversationId } = req.body;
        var userId = req.user.id;

        if (!conversationId) {
            return res.status(400).json({ success: false, message: 'conversationId is required' });
        }

        var result = await messageService.pinMessage(messageId, userId, conversationId);
        if (!result.success) {
            var statusCode = result.forbidden ? 403 : 400;
            return res.status(statusCode).json({ success: false, message: result.message });
        }

        // Emit socket event to all participants
        if (socketHandler && socketHandler.io) {
            socketHandler.io.to("conversation:" + conversationId).emit('message-pinned', {
                messageId: messageId,
                conversationId: conversationId,
                isPinned: result.isPinned
            });
            // Emit system notification message
            if (result.isPinned && result.systemMessage) {
                socketHandler.io.to("conversation:" + conversationId).emit('receive-message', result.systemMessage);
            }
        }

        res.json({ success: true, isPinned: result.isPinned });
    } catch (error) {
        console.error('Pin message error:', error);
        res.status(500).json({ success: false, message: 'Failed to pin message', error: error.message });
    }
});

// GET /conversation/:conversationId/pinned - Get pinned messages
router.get("/conversation/:conversationId/pinned", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { conversationId } = req.params;
        var userId = req.user.id;

        var result = await messageService.getPinnedMessages(conversationId, userId);
        if (!result.success) {
            var statusCode = result.forbidden ? 403 : 404;
            return res.status(statusCode).json({ success: false, message: result.message });
        }

        res.json({ success: true, data: result.data });
    } catch (error) {
        console.error('Get pinned messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pinned messages', error: error.message });
    }
});

// GET /conversation/:conversationId/media - Get media files & links
router.get("/conversation/:conversationId/media", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { conversationId } = req.params;
        var userId = req.user.id;

        var result = await messageService.getMediaFiles(conversationId, userId);
        if (!result.success) {
            var statusCode = result.forbidden ? 403 : 404;
            return res.status(statusCode).json({ success: false, message: result.message });
        }

        res.json({ success: true, data: result.data });
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch media', error: error.message });
    }
});

// GET /conversation/:conversationId/search - Search messages by content
router.get("/conversation/:conversationId/search", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { conversationId } = req.params;
        var { q } = req.query;
        var userId = req.user.id;

        if (!q || q.trim().length < 1) {
            return res.json({ success: true, data: [] });
        }

        var result = await messageService.searchMessages(conversationId, userId, q.trim());
        if (!result.success) {
            var statusCode = result.forbidden ? 403 : 404;
            return res.status(statusCode).json({ success: false, message: result.message });
        }

        res.json({ success: true, data: result.data });
    } catch (error) {
        console.error('Search messages error:', error);
        res.status(500).json({ success: false, message: 'Search failed', error: error.message });
    }
});

// DELETE /:messageId - Delete message for all (thu hồi)
router.delete("/:messageId", async function(req, res) {
    try {
        var messageService = new MessageService();
        var { messageId } = req.params;
        var userId = req.user.id;

        var result = await messageService.deleteMessage(messageId, userId);

        if (!result.success) {
            var statusCode = result.forbidden ? 403 : 400;
            if (result.message === 'Message not found') statusCode = 404;
            return res.status(statusCode).json({ success: false, message: result.message });
        }

        // Emit socket event for real-time update
        if (socketHandler && socketHandler.io && result.data.conversation) {
            socketHandler.io.to("conversation:" + result.data.conversation).emit('message-deleted', {
                _id: result.data._id,
                conversation: result.data.conversation,
                isDeleted: result.data.isDeleted,
                deletedAt: result.data.deletedAt
            });
        }

        res.json({ success: true, message: 'Message deleted successfully', data: {
            _id: result.data._id,
            conversation: result.data.conversation,
            isDeleted: result.data.isDeleted,
            deletedAt: result.data.deletedAt
        } });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete message', error: error.message });
    }
});

// POST /:messageId/restore - Admin: Restore soft-deleted message
router.post("/:messageId/restore", authenticate, isAdmin, async function(req, res) {
    try {
        var messageService = new MessageService();
        var { messageId } = req.params;

        var result = await messageService.restoreMessage(messageId);

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        // Emit socket event for real-time update
        if (socketHandler && socketHandler.io && result.data.conversation) {
            socketHandler.io.to("conversation:" + result.data.conversation._id).emit('message-restored', {
                _id: result.data._id,
                conversation: result.data.conversation._id || result.data.conversation,
                isDeleted: result.data.isDeleted
            });
        }

        res.json({ success: true, message: 'Message restored successfully', data: result.data });
    } catch (error) {
        console.error('Restore message error:', error);
        res.status(500).json({ success: false, message: 'Failed to restore message', error: error.message });
    }
});

// GET /admin/all - Admin: Get all messages with filters
router.get("/admin/all", isAdmin, async function(req, res) {
    try {
        var messageService = new MessageService();
        var { page, limit, search, type, senderId, conversationId, dateFrom, dateTo, showDeleted } = req.query;
        page = page || 1;
        limit = limit || 50;

        var filters = {
            search: search || null,
            type: type || 'all',
            senderId: senderId || null,
            conversationId: conversationId || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            showDeleted: showDeleted || false
        };

        var result = await messageService.getAllMessages(page, limit, filters);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Get all messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
    }
});

module.exports = router;
