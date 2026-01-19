const User = require('../models/User');

class UserController {
  async getAllUsers(req, res) {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const currentUserId = req.user.id;

      const query = {
        _id: { $ne: currentUserId }
      };

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('username fullName avatar isOnline lastSeen bio')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ username: 1 });

      const count = await User.countDocuments(query);

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
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .select('username fullName avatar isOnline lastSeen bio createdAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message
      });
    }
  }

  async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const currentUserId = req.user.id;

      if (!query || query.trim().length === 0) {
        return res.json({
          success: true,
          data: []
        });
      }

      const users = await User.find({
        _id: { $ne: currentUserId },
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { fullName: { $regex: query, $options: 'i' } }
        ]
      })
        .select('username fullName avatar isOnline')
        .limit(10);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.role;

      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('username fullName avatar bio');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }

  async getOnlineUsers(req, res) {
    try {
      const users = await User.find({ isOnline: true })
        .select('username fullName avatar isOnline');

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get online users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch online users',
        error: error.message
      });
    }
  }
}

module.exports = new UserController();
