const express = require('express');
const FriendController = require('../controllers/friendController');
const { authenticate } = require('../middleware/auth');

class FriendRoutes {
  constructor() {
    this.router = express.Router();
    this.defaultController = new FriendController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Middleware to use app.locals.friendController if available
    this.router.use((req, res, next) => {
      if (req.app.locals.friendController) {
        req.friendController = req.app.locals.friendController;
      } else {
        req.friendController = this.defaultController;
      }
      next();
    });

    // All routes require authentication
    this.router.use(authenticate);

    // Friend requests
    this.router.post('/request', (req, res) => req.friendController.sendFriendRequest(req, res));
    this.router.get('/requests', (req, res) => req.friendController.getFriendRequests(req, res));
    this.router.post('/request/:requestId/accept', (req, res) => req.friendController.acceptFriendRequest(req, res));
    this.router.post('/request/:requestId/reject', (req, res) => req.friendController.rejectFriendRequest(req, res));

    // Friends
    this.router.get('/', (req, res) => req.friendController.getFriends(req, res));
    this.router.delete('/:friendId', (req, res) => req.friendController.removeFriend(req, res));

    // Conversations
    this.router.get('/conversations', (req, res) => req.friendController.getConversations(req, res));
    this.router.post('/conversations', (req, res) => req.friendController.createConversation(req, res));
    this.router.post('/conversations/:conversationId/pin', (req, res) => req.friendController.togglePinConversation(req, res));
    this.router.delete('/conversations/:conversationId', (req, res) => req.friendController.deleteConversation(req, res));
    this.router.post('/groups', (req, res) => req.friendController.createGroup(req, res));

    // Block/Restrict
    this.router.post('/users/:userId/block', (req, res) => req.friendController.blockUser(req, res));
    this.router.delete('/users/:userId/block', (req, res) => req.friendController.unblockUser(req, res));
    this.router.post('/users/:userId/restrict', (req, res) => req.friendController.restrictUser(req, res));
    this.router.delete('/users/:userId/restrict', (req, res) => req.friendController.unrestrictUser(req, res));
    this.router.get('/blocked', (req, res) => req.friendController.getBlockedUsers(req, res));
    this.router.get('/restricted', (req, res) => req.friendController.getRestrictedUsers(req, res));
    this.router.get('/users/:userId/status-visibility', (req, res) => req.friendController.checkStatusVisibility(req, res));
  }
}

module.exports = new FriendRoutes().router;
