const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

class UserRoutes {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // All routes require authentication
    this.router.use(authenticate);

    // Get all users (with search and pagination)
    this.router.get('/', userController.getAllUsers.bind(userController));

    // Search users
    this.router.get('/search', userController.searchUsers.bind(userController));

    // Get online users
    this.router.get('/online', userController.getOnlineUsers.bind(userController));

    // Get user by ID
    this.router.get('/:id', userController.getUserById.bind(userController));

    // Admin only routes
    this.router.put('/:id', isAdmin, userController.updateUser.bind(userController));
    this.router.delete('/:id', isAdmin, userController.deleteUser.bind(userController));
  }
}

module.exports = new UserRoutes().router;
