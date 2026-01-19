const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all users (with search and pagination)
router.get('/', userController.getAllUsers.bind(userController));

// Search users
router.get('/search', userController.searchUsers.bind(userController));

// Get online users
router.get('/online', userController.getOnlineUsers.bind(userController));

// Get user by ID
router.get('/:id', userController.getUserById.bind(userController));

// Admin only routes
router.put('/:id', isAdmin, userController.updateUser.bind(userController));
router.delete('/:id', isAdmin, userController.deleteUser.bind(userController));

module.exports = router;
