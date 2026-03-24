var express = require("express");
var router = express.Router();
var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
var { authenticate, isAdmin } = require(global.__basedir + "/apps/middleware/auth");

// All routes require authentication
router.use(authenticate);

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

module.exports = router;
