const User = require('../models/User');
const Conversation = require('../models/Conversation');

class FriendController {
  async sendFriendRequest(req, res) {
    try {
      const { recipientId } = req.body;
      const senderId = req.user.id;

      if (senderId === recipientId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot send friend request to yourself'
        });
      }

      const [sender, recipient] = await Promise.all([
        User.findById(senderId),
        User.findById(recipientId)
      ]);

      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already friends
      if (sender.friends.includes(recipientId)) {
        return res.status(400).json({
          success: false,
          message: 'You are already friends'
        });
      }

      // Check if request already sent
      const existingRequest = recipient.friendRequests.find(
        req => req.from.toString() === senderId
      );

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: 'Friend request already sent'
        });
      }

      // Add to recipient's friend requests
      recipient.friendRequests.push({ from: senderId });
      await recipient.save();

      // Add to sender's sent requests
      sender.sentFriendRequests.push({ to: recipientId });
      await sender.save();

      res.json({
        success: true,
        message: 'Friend request sent successfully'
      });
    } catch (error) {
      console.error('Send friend request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send friend request',
        error: error.message
      });
    }
  }

  async acceptFriendRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);
      const requestIndex = user.friendRequests.findIndex(
        req => req._id.toString() === requestId
      );

      if (requestIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Friend request not found'
        });
      }

      const senderId = user.friendRequests[requestIndex].from;

      // Add to friends list
      user.friends.push(senderId);
      user.friendRequests.splice(requestIndex, 1);
      await user.save();

      // Add current user to sender's friends
      const sender = await User.findById(senderId);
      sender.friends.push(userId);
      
      // Remove from sent requests
      sender.sentFriendRequests = sender.sentFriendRequests.filter(
        req => req.to.toString() !== userId.toString()
      );
      await sender.save();

      // Create private conversation
      const conversation = await Conversation.create({
        participants: [userId, senderId],
        type: 'private',
        createdBy: userId
      });

      res.json({
        success: true,
        message: 'Friend request accepted',
        data: { conversationId: conversation._id }
      });
    } catch (error) {
      console.error('Accept friend request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept friend request',
        error: error.message
      });
    }
  }

  async rejectFriendRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);
      const requestIndex = user.friendRequests.findIndex(
        req => req._id.toString() === requestId
      );

      if (requestIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Friend request not found'
        });
      }

      const senderId = user.friendRequests[requestIndex].from;
      user.friendRequests.splice(requestIndex, 1);
      await user.save();

      // Remove from sender's sent requests
      const sender = await User.findById(senderId);
      sender.sentFriendRequests = sender.sentFriendRequests.filter(
        req => req.to.toString() !== userId.toString()
      );
      await sender.save();

      res.json({
        success: true,
        message: 'Friend request rejected'
      });
    } catch (error) {
      console.error('Reject friend request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject friend request',
        error: error.message
      });
    }
  }

  async getFriendRequests(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId)
        .populate('friendRequests.from', 'username fullName avatar isOnline');

      res.json({
        success: true,
        data: user.friendRequests
      });
    } catch (error) {
      console.error('Get friend requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch friend requests',
        error: error.message
      });
    }
  }

  async getFriends(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId)
        .populate('friends', 'username fullName avatar isOnline lastSeen');

      res.json({
        success: true,
        data: user.friends
      });
    } catch (error) {
      console.error('Get friends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch friends',
        error: error.message
      });
    }
  }

  async removeFriend(req, res) {
    try {
      const { friendId } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);
      user.friends = user.friends.filter(
        id => id.toString() !== friendId.toString()
      );
      await user.save();

      const friend = await User.findById(friendId);
      friend.friends = friend.friends.filter(
        id => id.toString() !== userId.toString()
      );
      await friend.save();

      res.json({
        success: true,
        message: 'Friend removed successfully'
      });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove friend',
        error: error.message
      });
    }
  }

  async getConversations(req, res) {
    try {
      const userId = req.user.id;

      const conversations = await Conversation.find({
        participants: userId,
        isActive: true
      })
        .populate('participants', 'username fullName avatar isOnline')
        .populate('lastMessage')
        .sort({ lastMessageAt: -1 });

      res.json({
        success: true,
        data: conversations
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversations',
        error: error.message
      });
    }
  }

  async createConversation(req, res) {
    try {
      const { participantId } = req.body;
      const userId = req.user.id;

      // Check if conversation already exists
      const existingConversation = await Conversation.findOne({
        participants: { $all: [userId, participantId] },
        type: 'private'
      });

      if (existingConversation) {
        return res.json({
          success: true,
          data: existingConversation
        });
      }

      // Create new conversation
      const conversation = await Conversation.create({
        participants: [userId, participantId],
        type: 'private',
        createdBy: userId
      });

      await conversation.populate('participants', 'username fullName avatar isOnline');

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation',
        error: error.message
      });
    }
  }
}

module.exports = new FriendController();
