const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/google', authController.googleAuth.bind(authController));
router.post('/2fa/validate-login', authController.validate2FALogin.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.getMe.bind(authController));
router.put('/profile', authenticate, authController.updateProfile.bind(authController));
router.post('/upload-avatar', authenticate, uploadMiddleware.single('avatar'), authController.uploadAvatar.bind(authController));
router.put('/password', authenticate, authController.changePassword.bind(authController));

// 2FA routes (Protected)
router.post('/2fa/setup', authenticate, authController.setup2FA.bind(authController));
router.post('/2fa/verify', authenticate, authController.verify2FA.bind(authController));
router.post('/2fa/disable', authenticate, authController.disable2FA.bind(authController));
router.post('/2fa/regenerate-backup-codes', authenticate, authController.regenerateBackupCodes.bind(authController));
router.get('/2fa/status', authenticate, authController.get2FAStatus.bind(authController));

module.exports = router;
