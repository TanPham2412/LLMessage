const User = require('../models/User');
const jwt = require('jsonwebtoken');

class AuthController {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpire = process.env.JWT_EXPIRE || '7d';
  }

  generateToken(userId) {
    return jwt.sign({ id: userId }, this.jwtSecret, {
      expiresIn: this.jwtExpire
    });
  }

  async register(req, res) {
    try {
      const { username, email, password, fullName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password,
        fullName: fullName || username
      });

      // Generate token
      const token = this.generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password, loginId } = req.body;
      
      // Hỗ trợ cả loginId (username hoặc email) và email riêng lẻ
      const identifier = loginId || email;

      // Tìm user bằng email hoặc username
      const user = await User.findOne({
        $or: [{ email: identifier }, { username: identifier }]
      }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Thông tin đăng nhập không chính xác'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Thông tin đăng nhập không chính xác'
        });
      }

      // Update online status
      user.isOnline = true;
      user.lastSeen = Date.now();
      await user.save();

      // Generate token
      const token = this.generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      const userId = req.user.id;

      // Update online status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: Date.now()
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  async getMe(req, res) {
    try {
      const user = await User.findById(req.user.id)
        .populate('friends', 'username fullName avatar isOnline lastSeen')
        .populate('friendRequests.from', 'username fullName avatar');

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
      console.error('Get me error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user data',
        error: error.message
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { fullName, bio, avatar } = req.body;

      const updateData = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (bio !== undefined) updateData.bio = bio;
      if (avatar !== undefined) updateData.avatar = avatar;

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user.getPublicProfile()
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId).select('+password');

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
