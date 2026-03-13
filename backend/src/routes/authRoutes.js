const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

class AuthRoutes {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Public routes
    this.router.post('/register', authController.register.bind(authController));
    this.router.post('/login', authController.login.bind(authController));
    this.router.post('/google', authController.googleAuth.bind(authController));
    this.router.post('/2fa/validate-login', authController.validate2FALogin.bind(authController));

    // Protected routes
    this.router.post('/logout', authenticate, authController.logout.bind(authController));
    this.router.get('/me', authenticate, authController.getMe.bind(authController));
    this.router.put('/profile', authenticate, authController.updateProfile.bind(authController));
    this.router.post('/upload-avatar', authenticate, uploadMiddleware.single('avatar'), authController.uploadAvatar.bind(authController));
    this.router.put('/password', authenticate, authController.changePassword.bind(authController));

    // 2FA routes (Protected)
    this.router.post('/2fa/setup', authenticate, authController.setup2FA.bind(authController));
    this.router.post('/2fa/verify', authenticate, authController.verify2FA.bind(authController));
    this.router.post('/2fa/disable', authenticate, authController.disable2FA.bind(authController));
    this.router.post('/2fa/regenerate-backup-codes', authenticate, authController.regenerateBackupCodes.bind(authController));
    this.router.get('/2fa/status', authenticate, authController.get2FAStatus.bind(authController));
  }
}

module.exports = new AuthRoutes().router;
