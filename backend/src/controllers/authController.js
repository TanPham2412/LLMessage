const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class AuthController {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpire = process.env.JWT_EXPIRE || '7d';
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  generateToken(userId) {
    return jwt.sign({ id: userId }, this.jwtSecret, {
      expiresIn: this.jwtExpire
    });
  }

  async register(req, res) {
    try {
      const { username, email, password, fullName } = req.body;

      // Kiểm tra user đã tồn tại chưa
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Tạo user mới
      const user = await User.create({
        username,
        email,
        password,
        fullName: fullName || username
      });

      // Tạo token
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

      // Kiểm tra mật khẩu
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Thông tin đăng nhập không chính xác'
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Generate temporary token for 2FA validation
        const tempToken = jwt.sign(
          { id: user._id, temp: true, purpose: '2fa' },
          this.jwtSecret,
          { expiresIn: '10m' } // 10 minutes expiry
        );

        return res.json({
          success: true,
          requiresTwoFactor: true,
          message: 'Please enter your 2FA code',
          data: {
            tempToken,
            userId: user._id
          }
        });
      }

      // Cập nhật trạng thái online
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

      // Cập nhật trạng thái online
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

  /**
   * Validate 2FA OTP during login
   */
  async validate2FALogin(req, res) {
    try {
      const { tempToken, code, backupCode } = req.body;

      if (!tempToken) {
        return res.status(400).json({
          success: false,
          message: 'Temporary token is required'
        });
      }

      // Verify temp token
      let decoded;
      try {
        decoded = jwt.verify(tempToken, this.jwtSecret);
        if (!decoded.temp || decoded.purpose !== '2fa') {
          return res.status(401).json({
            success: false,
            message: 'Invalid temporary token'
          });
        }
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Temporary token expired or invalid'
        });
      }

      // Get user with 2FA secret
      const user = await User.findById(decoded.id).select('+twoFactorSecret +twoFactorBackupCodes');

      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled for this user'
        });
      }

      let isValid = false;

      // Check backup code first if provided
      if (backupCode) {
        const backupCodeEntry = user.twoFactorBackupCodes.find(
          bc => bc.code === backupCode && !bc.used
        );

        if (backupCodeEntry) {
          // Mark backup code as used
          backupCodeEntry.used = true;
          backupCodeEntry.usedAt = new Date();
          await user.save();
          isValid = true;
        }
      } 
      // Check TOTP code
      else if (code) {
        isValid = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: code,
          window: 2 // Allow 2 time steps before/after
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Please provide either 2FA code or backup code'
        });
      }

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }

      // Update online status
      user.isOnline = true;
      user.lastSeen = Date.now();
      await user.save();

      // Generate real token
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
      console.error('Validate 2FA login error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate 2FA code',
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

      // Xác thực mật khẩu hiện tại
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Cập nhật mật khẩu
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

  async googleAuth(req, res) {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          success: false,
          message: 'Google credential is required'
        });
      }

      // Debug: Log Client ID được sử dụng
      console.log('Backend GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);

      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, name, picture } = payload;

      // Tìm user với googleId hoặc email
      let user = await User.findOne({
        $or: [{ googleId }, { email }]
      });

      if (user) {
        // Nếu user đã tồn tại nhưng chưa có googleId, cập nhật
        if (!user.googleId) {
          user.googleId = googleId;
          user.authProvider = 'google';
          if (picture && !user.avatar) {
            user.avatar = picture;
          }
          await user.save();
        }

        // Cập nhật trạng thái online
        user.isOnline = true;
        user.lastSeen = Date.now();
        await user.save();
      } else {
        // Tạo user mới từ Google
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 7);
        
        user = await User.create({
          googleId,
          email,
          username,
          fullName: name || email.split('@')[0],
          avatar: picture || '',
          authProvider: 'google',
          isOnline: true
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Generate temporary token for 2FA validation
        const tempToken = jwt.sign(
          { id: user._id, temp: true, purpose: '2fa' },
          this.jwtSecret,
          { expiresIn: '10m' } // Temp token expires in 10 minutes
        );

        return res.json({
          success: true,
          requiresTwoFactor: true,
          data: {
            tempToken,
            userId: user._id
          }
        });
      }

      // Generate token
      const token = this.generateToken(user._id);

      res.json({
        success: true,
        message: 'Google authentication successful',
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Google authentication failed',
        error: error.message
      });
    }
  }
  // ========== 2FA ENDPOINTS ==========

  /**
   * Setup 2FA - Generate secret and QR code
   */
  async setup2FA(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled'
        });
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `ChatApp (${user.email})`,
        length: 32
      });

      // Lưu secret tạm thời (chưa enable)
      user.twoFactorSecret = secret.base32;
      await user.save();

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

      res.json({
        success: true,
        message: '2FA setup initiated',
        data: {
          secret: secret.base32,
          qrCode: qrCodeDataURL,
          otpauthUrl: secret.otpauth_url
        }
      });
    } catch (error) {
      console.error('Setup 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup 2FA',
        error: error.message
      });
    }
  }

  /**
   * Verify and Enable 2FA
   */
  async verify2FA(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: '2FA token is required'
        });
      }

      const user = await User.findById(userId).select('+twoFactorSecret');

      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({
          success: false,
          message: 'Please setup 2FA first'
        });
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Generate backup codes
      const backupCodes = [];
      const plainBackupCodes = [];
      
      for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        plainBackupCodes.push(code);
        backupCodes.push({
          code: crypto.createHash('sha256').update(code).digest('hex'),
          used: false
        });
      }

      // Enable 2FA
      user.twoFactorEnabled = true;
      user.twoFactorBackupCodes = backupCodes;
      await user.save();

      res.json({
        success: true,
        message: '2FA enabled successfully',
        data: {
          backupCodes: plainBackupCodes
        }
      });
    } catch (error) {
      console.error('Verify 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify 2FA',
        error: error.message
      });
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(req, res) {
    try {
      const userId = req.user.id;
      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({
          success: false,
          message: 'Password and 2FA token are required'
        });
      }

      const user = await User.findById(userId).select('+password +twoFactorSecret');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Verify 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Disable 2FA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      user.twoFactorBackupCodes = [];
      await user.save();

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA',
        error: error.message
      });
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      const user = await User.findById(userId).select('+password');

      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Generate new backup codes
      const backupCodes = [];
      const plainBackupCodes = [];
      
      for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        plainBackupCodes.push(code);
        backupCodes.push({
          code: crypto.createHash('sha256').update(code).digest('hex'),
          used: false
        });
      }

      user.twoFactorBackupCodes = backupCodes;
      await user.save();

      res.json({
        success: true,
        message: 'Backup codes regenerated successfully',
        data: {
          backupCodes: plainBackupCodes
        }
      });
    } catch (error) {
      console.error('Regenerate backup codes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate backup codes',
        error: error.message
      });
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select('+twoFactorBackupCodes');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const unusedBackupCodes = user.twoFactorBackupCodes 
        ? user.twoFactorBackupCodes.filter(bc => !bc.used).length 
        : 0;

      res.json({
        success: true,
        data: {
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorMethod: user.twoFactorMethod,
          unusedBackupCodes
        }
      });
    } catch (error) {
      console.error('Get 2FA status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get 2FA status',
        error: error.message
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới'
        });
      }

      // Check password length
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
      }

      // Get user with password
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user uses Google auth (no password)
      if (user.authProvider === 'google' && !user.password) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản Google không thể thay đổi mật khẩu. Vui lòng quản lý mật khẩu qua Google.'
        });
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu hiện tại không chính xác'
        });
      }

      // Check if new password is same as current
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Mật khẩu đã được thay đổi thành công'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể thay đổi mật khẩu',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
