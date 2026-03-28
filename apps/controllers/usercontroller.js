var express = require("express");
var router = express.Router();
var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
var { authenticate, isAdmin } = require(global.__basedir + "/apps/middleware/auth");

// All routes require authentication
router.use(authenticate);

// GET /me - Get current authenticated user info
router.get("/me", async function(req, res) {
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
router.post("/make-admin/:userId", async function(req, res) {
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

// GET /debug/users-roles - DEBUG ONLY: List all users with roles and status
router.get("/debug/users-roles", async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var users = await User.find({}).select('username email role accountStatus warnings createdAt').limit(20);

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
router.get("/", async function(req, res) {
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
router.get("/search", async function(req, res) {
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
router.get("/online", async function(req, res) {
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
router.get("/admin/stats", isAdmin, async function(req, res) {
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

        // Get locked accounts count
        var lockedAccounts = await User.countDocuments({ accountStatus: 'locked' });

        // Get users with warnings
        var usersWithWarnings = await User.countDocuments({ warnings: { $gt: 0 } });

        res.json({
            success: true,
            data: {
                totalUsers: totalUsers,
                totalMessages: totalMessages,
                onlineUsers: onlineUsers,
                totalConversations: totalConversations,
                lockedAccounts: lockedAccounts,
                usersWithWarnings: usersWithWarnings
            }
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
    }
});

// GET /:id - Get user by ID
router.get("/:id", async function(req, res) {
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
router.put("/:id", isAdmin, async function(req, res) {
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
router.delete("/:id", isAdmin, async function(req, res) {
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
router.post("/:userId/warn", isAdmin, async function(req, res) {
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

// GET /admin/violations - Admin: Get users with warnings
router.get("/admin/violations", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { limit, page } = req.query;
        limit = limit || 20;
        page = page || 1;

        var skip = (page - 1) * limit;

        var usersWithWarnings = await User.find({ warnings: { $gt: 0 } })
            .select('username fullName email role warnings accountStatus violationHistory createdAt')
            .sort({ warnings: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        var count = await User.countDocuments({ warnings: { $gt: 0 } });

        res.json({
            success: true,
            data: usersWithWarnings,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get violations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch violations', error: error.message });
    }
});

// GET /admin/list - Admin: Get all users with detailed info
router.get("/admin/list", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { search, role, status, limit, page } = req.query;
        limit = limit || 20;
        page = page || 1;

        var query = {};

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role && role !== 'all') {
            query.role = role;
        }

        if (status && status !== 'all') {
            query.accountStatus = status;
        }

        var skip = (page - 1) * limit;

        var users = await User.find(query)
            .select('username fullName email role accountStatus isOnline lastSeen warnings createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        var count = await User.countDocuments(query);

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
        console.error('Get users list error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
});

// POST /admin/user/:userId/block - Admin: Deactivate user account
router.post("/admin/user/:userId/block", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { userId } = req.params;

        var user = await User.findByIdAndUpdate(
            userId,
            { accountStatus: 'inactive' },
            { new: true }
        ).select('username email accountStatus');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User account deactivated successfully',
            data: user
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ success: false, message: 'Failed to deactivate user', error: error.message });
    }
});

// POST /admin/user/:userId/unblock - Admin: Activate user account
router.post("/admin/user/:userId/unblock", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { userId } = req.params;

        var user = await User.findByIdAndUpdate(
            userId,
            { accountStatus: 'active' },
            { new: true }
        ).select('username email accountStatus');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User account activated successfully',
            data: user
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ success: false, message: 'Failed to activate user', error: error.message });
    }
});

// POST /admin/user/:userId/promote - Admin: Promote user to admin
router.post("/admin/user/:userId/promote", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { userId } = req.params;

        var user = await User.findByIdAndUpdate(
            userId,
            { role: 'admin' },
            { new: true }
        ).select('username email role');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User promoted to admin successfully',
            data: user
        });
    } catch (error) {
        console.error('Promote user error:', error);
        res.status(500).json({ success: false, message: 'Failed to promote user', error: error.message });
    }
});

// POST /admin/user/:userId/demote - Admin: Demote admin to user
router.post("/admin/user/:userId/demote", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { userId } = req.params;

        // Prevent demoting the current admin
        if (userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot demote yourself' });
        }

        var user = await User.findByIdAndUpdate(
            userId,
            { role: 'user' },
            { new: true }
        ).select('username email role');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User demoted from admin successfully',
            data: user
        });
    } catch (error) {
        console.error('Demote user error:', error);
        res.status(500).json({ success: false, message: 'Failed to demote user', error: error.message });
    }
});

// POST /admin/user/:userId/reset-warnings - Admin: Clear all warnings
router.post("/admin/user/:userId/reset-warnings", isAdmin, async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { userId } = req.params;

        var user = await User.findByIdAndUpdate(
            userId,
            { 
                warnings: 0,
                violationHistory: [],
                accountStatus: 'active'
            },
            { new: true }
        ).select('username email warnings accountStatus');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Warnings cleared successfully',
            data: user
        });
    } catch (error) {
        console.error('Reset warnings error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset warnings', error: error.message });
    }
});

// POST /debug/test-locked-status/:userId - DEBUG ONLY: Set user status to inactive for testing
router.post("/debug/test-locked-status/:userId", async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var { userId } = req.params;

        var user = await User.findByIdAndUpdate(
            userId,
            { accountStatus: 'inactive' },
            { new: true }
        ).select('username email accountStatus warnings');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: `User ${user.username} status set to inactive for testing`,
            data: user
        });
    } catch (error) {
        console.error('Debug set inactive status error:', error);
        res.status(500).json({ success: false, message: 'Failed to set inactive status', error: error.message });
    }
});

// GET /debug/check-user-status - DEBUG: Check first 5 users and their status
router.get("/debug/check-user-status", async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        var users = await User.find({}).select('username email role accountStatus warnings').limit(5);

        // Also get admin list result  
        const adminListUsers = await User.find({}).select('username fullName email role accountStatus isOnline lastSeen warnings createdAt').limit(5);

        res.json({
            success: true,
            data: {
                rawUsers: users,
                adminListFormat: adminListUsers,
                sample: users[0] ? {
                    username: users[0].username,
                    accountStatus: users[0].accountStatus,
                    accountStatusType: typeof users[0].accountStatus,
                    accountStatusValue: users[0].accountStatus || 'UNDEFINED'
                } : null
            }
        });
    } catch (error) {
        console.error('Debug check user status error:', error);
        res.status(500).json({ success: false, message: 'Failed to check user status', error: error.message });
    }
});

// POST /debug/deactivate-users - DEBUG: Quickly deactivate first 2 users for testing
router.post("/debug/deactivate-users", async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        
        // Get first 2 users and deactivate them
        const users = await User.find({}).limit(2);
        
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'No users found' });
        }

        const updates = [];
        
        for (let user of users) {
            const updated = await User.findByIdAndUpdate(
                user._id, 
                { accountStatus: 'inactive' }, 
                { new: true }
            ).select('username accountStatus');
            updates.push({ username: updated.username, status: updated.accountStatus });
        }

        res.json({
            success: true,
            message: `${updates.length} users deactivated for testing`,
            data: updates
        });
    } catch (error) {
        console.error('Debug deactivate users error:', error);
        res.status(500).json({ success: false, message: 'Failed to deactivate users', error: error.message });
    }
});

// POST /debug/setup-test-users - DEBUG: Create some inactive users for testing
router.post("/debug/setup-test-users", async function(req, res) {
    try {
        var User = require(global.__basedir + "/apps/Entity/User");
        
        // Get first 3 users
        const users = await User.find({}).limit(3);
        
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'No users found' });
        }

        // Update them with different statuses
        const updates = [];
        if (users[0]) {
            const update1 = await User.findByIdAndUpdate(users[0]._id, { accountStatus: 'inactive' }, { new: true }).select('username accountStatus');
            updates.push({ username: update1.username, newStatus: update1.accountStatus });
        }
        if (users[1]) {
            const update2 = await User.findByIdAndUpdate(users[1]._id, { accountStatus: 'active' }, { new: true }).select('username accountStatus');
            updates.push({ username: update2.username, newStatus: update2.accountStatus });
        }
        if (users[2]) {
            const update3 = await User.findByIdAndUpdate(users[2]._id, { accountStatus: 'active' }, { new: true }).select('username accountStatus');
            updates.push({ username: update3.username, newStatus: update3.accountStatus });
        }

        res.json({
            success: true,
            message: 'Test users updated with different statuses',
            data: updates
        });
    } catch (error) {
        console.error('Debug setup test users error:', error);
        res.status(500).json({ success: false, message: 'Failed to setup test users', error: error.message });
    }
});

module.exports = router;
