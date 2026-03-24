var express = require("express");
var router = express.Router();
var AuthService = require(global.__basedir + "/apps/Services/AuthService");
var { authenticate } = require(global.__basedir + "/apps/middleware/auth");
var { OAuth2Client } = require('google-auth-library');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
var crypto = require('crypto');
var config = require(global.__basedir + "/Config/Setting.json");
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
var upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

var googleClient = new OAuth2Client(config.google.clientId);

// POST /register
router.post("/register", async function(req, res) {
    try {
        var authService = new AuthService();
        var { username, email, password, fullName } = req.body;

        var User = require(global.__basedir + "/apps/Entity/User");
        var existingUser = await User.findOne({
            $or: [{ email: email }, { username: username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        var result = await authService.register(username, email, password, fullName);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        var token = authService.generateToken(result.user._id);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user: result.user.getPublicProfile(), token: token }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// POST /login
router.post("/login", async function(req, res) {
    try {
        var authService = new AuthService();
        var { email, password, loginId } = req.body;
        var identifier = loginId || email;

        var user = await authService.login(identifier);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác' });
        }

        var isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác' });
        }

        if (user.twoFactorEnabled) {
            var tempToken = authService.generateTempToken(user._id);
            return res.json({
                success: true,
                requiresTwoFactor: true,
                message: 'Please enter your 2FA code',
                data: { tempToken: tempToken, userId: user._id }
            });
        }

        user.isOnline = true;
        user.lastSeen = Date.now();
        await user.save();

        var token = authService.generateToken(user._id);
        res.json({
            success: true,
            message: 'Login successful',
            data: { user: user.getPublicProfile(), token: token }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});

// POST /google
router.post("/google", async function(req, res) {
    try {
        var authService = new AuthService();
        var { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }

        var ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: config.google.clientId
        });

        var payload = ticket.getPayload();
        var googleId = payload.sub;
        var email = payload.email;
        var name = payload.name;
        var picture = payload.picture;

        var user = await authService.getUserForGoogleAuth(googleId, email);

        if (user) {
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = 'google';
                if (picture && !user.avatar) {
                    user.avatar = picture;
                }
                await user.save();
            }
            user.isOnline = true;
            user.lastSeen = Date.now();
            await user.save();
        } else {
            var User = require(global.__basedir + "/apps/Entity/User");
            var username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 7);
            user = await User.create({
                googleId: googleId,
                email: email,
                username: username,
                fullName: name || email.split('@')[0],
                avatar: picture || '',
                authProvider: 'google',
                isOnline: true
            });
        }

        if (user.twoFactorEnabled) {
            var tempToken = authService.generateTempToken(user._id);
            return res.json({
                success: true,
                requiresTwoFactor: true,
                data: { tempToken: tempToken, userId: user._id }
            });
        }

        var token = authService.generateToken(user._id);
        res.json({
            success: true,
            message: 'Google authentication successful',
            data: { user: user.getPublicProfile(), token: token }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ success: false, message: 'Google authentication failed', error: error.message });
    }
});

// POST /2fa/validate-login
router.post("/2fa/validate-login", async function(req, res) {
    try {
        var authService = new AuthService();
        var { tempToken, code, backupCode } = req.body;

        if (!tempToken) {
            return res.status(400).json({ success: false, message: 'Temporary token is required' });
        }

        var decoded;
        try {
            decoded = authService.verifyToken(tempToken);
            if (!decoded.temp || decoded.purpose !== '2fa') {
                return res.status(401).json({ success: false, message: 'Invalid temporary token' });
            }
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Temporary token expired or invalid' });
        }

        var user = await authService.getUserWithTwoFactor(decoded.id);

        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: '2FA is not enabled for this user' });
        }

        var isValid = false;

        if (backupCode) {
            var backupCodeEntry = user.twoFactorBackupCodes.find(function(bc) {
                return bc.code === backupCode && !bc.used;
            });
            if (backupCodeEntry) {
                backupCodeEntry.used = true;
                backupCodeEntry.usedAt = new Date();
                await user.save();
                isValid = true;
            }
        } else if (code) {
            isValid = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: code,
                window: 2
            });
        } else {
            return res.status(400).json({ success: false, message: 'Please provide either 2FA code or backup code' });
        }

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
        }

        user.isOnline = true;
        user.lastSeen = Date.now();
        await user.save();

        var token = authService.generateToken(user._id);
        res.json({
            success: true,
            message: 'Login successful',
            data: { user: user.getPublicProfile(), token: token }
        });
    } catch (error) {
        console.error('Validate 2FA login error:', error);
        res.status(500).json({ success: false, message: 'Failed to validate 2FA code', error: error.message });
    }
});

// POST /logout (protected)
router.post("/logout", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;

        await authService.updateOnlineStatus(userId, false);

        res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Logout failed', error: error.message });
    }
});

// GET /me (protected)
router.get("/me", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var user = await authService.getUserWithFriends(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user data', error: error.message });
    }
});

// PUT /profile (protected)
router.put("/profile", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;
        var { fullName, bio, avatar, dateOfBirth, gender, phone, location, website } = req.body;

        var updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (bio !== undefined) updateData.bio = bio;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
        if (gender !== undefined) updateData.gender = gender;
        if (phone !== undefined) updateData.phone = phone;
        if (location !== undefined) updateData.location = location;
        if (website !== undefined) updateData.website = website;

        var user = await authService.updateProfile(userId, updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
    }
});

// POST /upload-avatar (protected)
router.post("/upload-avatar", authenticate, upload.single('avatar'), async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        var avatarPath = "/uploads/" + req.file.filename;
        var user = await authService.updateProfile(userId, { avatar: avatarPath });

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: { avatar: avatarPath, user: user.getPublicProfile() }
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload avatar', error: error.message });
    }
});

// PUT /password (protected)
router.put("/password", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;
        var { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        var user = await authService.getUserWithPassword(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({ success: false, message: 'Tài khoản Google không thể thay đổi mật khẩu.' });
        }

        var isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
        }

        var isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({ success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Mật khẩu đã được thay đổi thành công' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Không thể thay đổi mật khẩu', error: error.message });
    }
});

// POST /2fa/setup (protected)
router.post("/2fa/setup", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;
        var user = await authService.getUserById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: '2FA is already enabled' });
        }

        var secret = speakeasy.generateSecret({
            name: "ChatApp (" + user.email + ")",
            length: 32
        });

        user.twoFactorSecret = secret.base32;
        await user.save();

        var qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            message: '2FA setup initiated',
            data: { secret: secret.base32, qrCode: qrCodeDataURL, otpauthUrl: secret.otpauth_url }
        });
    } catch (error) {
        console.error('Setup 2FA error:', error);
        res.status(500).json({ success: false, message: 'Failed to setup 2FA', error: error.message });
    }
});

// POST /2fa/verify (protected)
router.post("/2fa/verify", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;
        var { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: '2FA token is required' });
        }

        var User = require(global.__basedir + "/apps/Entity/User");
        var user = await User.findById(userId).select('+twoFactorSecret');

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ success: false, message: 'Please setup 2FA first' });
        }

        var verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
        }

        var backupCodes = [];
        var plainBackupCodes = [];
        for (var i = 0; i < 10; i++) {
            var codeStr = crypto.randomBytes(4).toString('hex').toUpperCase();
            plainBackupCodes.push(codeStr);
            backupCodes.push({
                code: crypto.createHash('sha256').update(codeStr).digest('hex'),
                used: false
            });
        }

        user.twoFactorEnabled = true;
        user.twoFactorBackupCodes = backupCodes;
        await user.save();

        res.json({
            success: true,
            message: '2FA enabled successfully',
            data: { backupCodes: plainBackupCodes }
        });
    } catch (error) {
        console.error('Verify 2FA error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify 2FA', error: error.message });
    }
});

// POST /2fa/disable (protected)
router.post("/2fa/disable", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;
        var { password, token } = req.body;

        if (!password || !token) {
            return res.status(400).json({ success: false, message: 'Password and 2FA token are required' });
        }

        var User = require(global.__basedir + "/apps/Entity/User");
        var user = await User.findById(userId).select('+password +twoFactorSecret');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        var isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        var verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        user.twoFactorBackupCodes = [];
        await user.save();

        res.json({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
        console.error('Disable 2FA error:', error);
        res.status(500).json({ success: false, message: 'Failed to disable 2FA', error: error.message });
    }
});

// POST /2fa/regenerate-backup-codes (protected)
router.post("/2fa/regenerate-backup-codes", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;
        var { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        var user = await authService.getUserWithPassword(userId);

        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: '2FA is not enabled' });
        }

        var isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        var backupCodes = [];
        var plainBackupCodes = [];
        for (var i = 0; i < 10; i++) {
            var codeStr = crypto.randomBytes(4).toString('hex').toUpperCase();
            plainBackupCodes.push(codeStr);
            backupCodes.push({
                code: crypto.createHash('sha256').update(codeStr).digest('hex'),
                used: false
            });
        }

        user.twoFactorBackupCodes = backupCodes;
        await user.save();

        res.json({
            success: true,
            message: 'Backup codes regenerated successfully',
            data: { backupCodes: plainBackupCodes }
        });
    } catch (error) {
        console.error('Regenerate backup codes error:', error);
        res.status(500).json({ success: false, message: 'Failed to regenerate backup codes', error: error.message });
    }
});

// GET /2fa/status (protected)
router.get("/2fa/status", authenticate, async function(req, res) {
    try {
        var authService = new AuthService();
        var userId = req.user.id;
        var user = await authService.getUserWithBackupCodes(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        var unusedBackupCodes = user.twoFactorBackupCodes
            ? user.twoFactorBackupCodes.filter(function(bc) { return !bc.used; }).length
            : 0;

        res.json({
            success: true,
            data: {
                twoFactorEnabled: user.twoFactorEnabled,
                twoFactorMethod: user.twoFactorMethod,
                unusedBackupCodes: unusedBackupCodes
            }
        });
    } catch (error) {
        console.error('Get 2FA status error:', error);
        res.status(500).json({ success: false, message: 'Failed to get 2FA status', error: error.message });
    }
});

module.exports = router;
