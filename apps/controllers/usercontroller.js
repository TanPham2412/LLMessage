var express = require("express");
var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
var { authenticate, isAdmin } = require(global.__basedir + "/apps/middleware/auth");

class UserController {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        // All routes require authentication
        this.router.use(authenticate);

        // GET /me - Get current authenticated user info
        this.router.get("/me", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var user = await userRepository.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user info', error: error.message });
    }
});

// POST /make-admin/:userId - DEBUG ONLY: Make user admin (remove in production)
        this.router.post("/make-admin/:userId", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var User = require(global.__basedir + "/apps/Entity/User");
        var { userId } = req.params;

        var user = await User.findByIdAndUpdate(userId, { role: 'admin' }, { new: true });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        console.log(`User ${user.username} promoted to admin`);
        res.json({
            success: true,
            message: `User ${user.username} is now admin`,
            data: { id: user._id, username: user.username, role: user.role }
        });
    } catch (error) {
        console.error('Make admin error:', error);
        res.status(500).json({ success: false, message: 'Failed to make admin', error: error.message });
    }
});

// GET /debug/users-roles - DEBUG ONLY: List all users with roles
        this.router.get("/debug/users-roles", async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var users = await User.find({}).select('username email role createdAt').limit(20);

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get users roles error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
});

// GET / - Get all users (with search and pagination)
        this.router.get("/", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var { search, page, limit } = req.query;
        page = page || 1;
        limit = limit || 20;
        var currentUserId = req.user.id;

        var query = {
            _id: { $ne: currentUserId }
        };

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        var skip = (page - 1) * limit;
        var users = await userRepository.getUserList(query, skip, limit * 1);
        var count = await userRepository.countUsers(query);

        res.json({
            success: true,
            data: users,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
});

// GET /search - Search users
        this.router.get("/search", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var { query } = req.query;
        var currentUserId = req.user.id;

        if (!query || query.trim().length === 0) {
            return res.json({ success: true, data: [] });
        }

        var users = await userRepository.searchUsers(query, currentUserId, 10);

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ success: false, message: 'Search failed', error: error.message });
    }
});

// GET /online - Get online users
        this.router.get("/online", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var users = await userRepository.getOnlineUsers();

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Get online users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch online users', error: error.message });
    }
});

// GET /admin/stats - Admin dashboard statistics (Admin only)
        this.router.get("/admin/stats", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var Message = require(global.__basedir + "/apps/Entity/Message");
        var Conversation = require(global.__basedir + "/apps/Entity/Conversation");

        // Get total users
        var totalUsers = await User.countDocuments();

        // Get total messages
        var totalMessages = await Message.countDocuments({ isDeleted: false });

        // Get online users count
        var onlineUsers = await User.countDocuments({ isOnline: true });

        // Get total conversations
        var totalConversations = await Conversation.countDocuments({ isActive: true });

        res.json({
            success: true,
            data: {
                totalUsers: totalUsers,
                totalMessages: totalMessages,
                onlineUsers: onlineUsers,
                totalConversations: totalConversations
            }
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
    }
});

// GET /:id - Get user by ID
        this.router.get("/:id", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var { id } = req.params;

        var User = require(global.__basedir + "/apps/Entity/User");
        var user = await User.findById(id)
            .select('username fullName avatar isOnline lastSeen bio createdAt');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
    }
});

// PUT /:id - Admin only: Update user
        this.router.put("/:id", isAdmin, async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var { id } = req.params;
        var updateData = req.body;

        delete updateData.password;
        delete updateData.role;

        var User = require(global.__basedir + "/apps/Entity/User");
        var user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
            .select('username fullName avatar bio');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
    }
});

// DELETE /:id - Admin only: Delete user
        this.router.delete("/:id", isAdmin, async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var { id } = req.params;

        var user = await userRepository.deleteUser(id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
});

// POST /:userId/warn - Admin only: Send warning to user
        this.router.post("/:userId/warn", isAdmin, async function(req, res) {
    try {
        const { userId } = req.params;
        const { messageId, reason } = req.body;
        const adminId = req.user.id;

        // Validate inputs
        if (!messageId || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'messageId and reason are required' 
            });
        }

        // Validate reason
        const validReasons = ['violence', 'spam', 'explicit', 'scam', 'copyright'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid reason. Must be one of: ' + validReasons.join(', ') 
            });
        }

        var WarningService = require(global.__basedir + "/apps/Services/WarningService");
        var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
        var NotificationRepository = require(global.__basedir + "/apps/Repository/NotificationRepository");

        var userRepository = new UserRepository();
        var notificationRepository = new NotificationRepository();
        var warningService = new WarningService(userRepository, notificationRepository);

        const result = await warningService.sendWarning(userId, messageId, reason, adminId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Emit socket event to notify the user in real-time
        var io = req.app.get('io');
        if (io) {
            io.to(`user_${userId}`).emit('user-warning', {
                warningCount: result.data.warningCount,
                accountStatus: result.data.accountStatus
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Send warning error:', error);
        res.status(500).json({ success: false, message: 'Failed to send warning', error: error.message });
    }
});

    }

    getRouter() {
        return this.router;
    }
}

module.exports = new UserController().getRouter();
