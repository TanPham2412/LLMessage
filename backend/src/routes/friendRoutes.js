const express = require('express');
const router = express.Router();
const FriendController = require('../controllers/friendController');
const { authenticate } = require('../middleware/auth');

// Create controller instance - will be injected with socketHandler from server.js
const friendController = new FriendController();

// Middleware to use app.locals.friendController if available
router.use((req, res, next) => {
  if (req.app.locals.friendController) {
    req.friendController = req.app.locals.friendController;
  } else {
    req.friendController = friendController;
  }
  next();
});

// All routes require authentication
router.use(authenticate);

// Friend requests
router.post('/request', (req, res) => req.friendController.sendFriendRequest(req, res));
router.get('/requests', (req, res) => req.friendController.getFriendRequests(req, res));
router.post('/request/:requestId/accept', (req, res) => req.friendController.acceptFriendRequest(req, res));
router.post('/request/:requestId/reject', (req, res) => req.friendController.rejectFriendRequest(req, res));

// Friends
router.get('/', (req, res) => req.friendController.getFriends(req, res));
router.delete('/:friendId', (req, res) => req.friendController.removeFriend(req, res));

// Conversations
router.get('/conversations', (req, res) => req.friendController.getConversations(req, res));
router.post('/conversations', (req, res) => req.friendController.createConversation(req, res));

module.exports = router;
