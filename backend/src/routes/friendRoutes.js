const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Friend requests
router.post('/request', friendController.sendFriendRequest.bind(friendController));
router.get('/requests', friendController.getFriendRequests.bind(friendController));
router.post('/request/:requestId/accept', friendController.acceptFriendRequest.bind(friendController));
router.post('/request/:requestId/reject', friendController.rejectFriendRequest.bind(friendController));

// Friends
router.get('/', friendController.getFriends.bind(friendController));
router.delete('/:friendId', friendController.removeFriend.bind(friendController));

// Conversations
router.get('/conversations', friendController.getConversations.bind(friendController));
router.post('/conversations', friendController.createConversation.bind(friendController));

module.exports = router;
