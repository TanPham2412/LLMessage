const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

class FriendController {
  constructor(socketHandler = null) {
    this.socketHandler = socketHandler;
  }

  setSocketHandler(socketHandler) {
    this.socketHandler = socketHandler;
  }

  async sendFriendRequest(req, res) {
    try {
      const { recipientId } = req.body;
      const senderId = req.user.id;

      if (senderId === recipientId) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể gửi lời mời kết bạn cho chính mình'
        });
      }

      const [sender, recipient] = await Promise.all([
        User.findById(senderId),
        User.findById(recipientId)
      ]);

      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Kiểm tra đã là bạn bè chưa
      if (sender.friends.includes(recipientId)) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã là bạn bè rồi'
        });
      }

      // Kiểm tra đã gửi lời mời chưa (trong sentFriendRequests của người gửi)
      const alreadySent = sender.sentFriendRequests.find(
        req => req.to.toString() === recipientId
      );

      if (alreadySent) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã gửi lời mời kết bạn rồi'
        });
      }

      // Kiểm tra lời mời có tồn tại trong friendRequests của người nhận không
      const existingRequest = recipient.friendRequests.find(
        req => req.from.toString() === senderId
      );

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: 'Lời mời kết bạn đã tồn tại'
        });
      }

      // Thêm vào danh sách lời mời kết bạn của người nhận
      recipient.friendRequests.push({ from: senderId });
      await recipient.save();

      // Thêm vào danh sách đã gửi của người gửi
      sender.sentFriendRequests.push({ to: recipientId });
      await sender.save();

      // Create notification in database
      await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type: 'friend-request',
        title: 'Lời mời kết bạn',
        message: `${sender.fullName || sender.username} đã gửi lời mời kết bạn`,
        data: {
          requestId: recipient.friendRequests[recipient.friendRequests.length - 1]._id
        }
      });

      // Gửi thông báo real-time cho người nhận
      if (this.socketHandler) {
        this.socketHandler.sendNotificationToUser(recipientId, 'friend-request-received', {
          requestId: recipient.friendRequests[recipient.friendRequests.length - 1]._id,
          from: {
            _id: sender._id,
            username: sender.username,
            fullName: sender.fullName,
            avatar: sender.avatar
          },
          createdAt: new Date()
        });
      }

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

      // Thêm vào danh sách bạn bè
      user.friends.push(senderId);
      user.friendRequests.splice(requestIndex, 1);
      await user.save();

      // Thêm user hiện tại vào danh sách bạn bè của người gửi
      const sender = await User.findById(senderId);
      sender.friends.push(userId);
      
      // Xoá khỏi danh sách đã gửi
      sender.sentFriendRequests = sender.sentFriendRequests.filter(
        req => req.to.toString() !== userId.toString()
      );
      await sender.save();

      // Tạo cuộc trò chuyện riêng tư
      const conversation = await Conversation.create({
        participants: [userId, senderId],
        type: 'private',
        createdBy: userId
      });

      // Tạo thông báo trong database
      await Notification.create({
        recipient: senderId,
        sender: userId,
        type: 'friend-accepted',
        title: 'Chấp nhận kết bạn',
        message: `${user.fullName || user.username} đã chấp nhận lời mời kết bạn của bạn`,
        data: {
          conversationId: conversation._id
        }
      });

      // Send real-time notification to sender
      if (this.socketHandler) {
        this.socketHandler.sendNotificationToUser(senderId, 'friend-request-accepted', {
          from: {
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar
          },
          message: `${user.fullName || user.username} đã chấp nhận lời mời kết bạn của bạn`,
          createdAt: new Date()
        });
      }

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

      // Xoá khỏi danh sách đã gửi của người gửi
      const sender = await User.findById(senderId);
      sender.sentFriendRequests = sender.sentFriendRequests.filter(
        req => req.to.toString() !== userId.toString()
      );
      await sender.save();

      // Create notification in database
      await Notification.create({
        recipient: senderId,
        sender: userId,
        type: 'friend-rejected',
        title: 'Từ chối kết bạn',
        message: `${user.fullName || user.username} đã từ chối lời mời kết bạn của bạn`,
        data: {}
      });

      // Send real-time notification to sender
      if (this.socketHandler) {
        console.log(`📢 Sending rejection notification to sender: ${senderId}`);
        console.log(`   Rejected by: ${user.fullName || user.username} (${userId})`);
        
        this.socketHandler.sendNotificationToUser(senderId, 'friend-request-rejected', {
          from: {
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar
          },
          message: `${user.fullName || user.username} đã từ chối lời mời kết bạn của bạn`,
          createdAt: new Date()
        });
      }

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
        .populate('participants', 'username fullName avatar isOnline lastSeen')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'username fullName avatar'
          }
        })
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

  async createGroup(req, res) {
    try {
      const { name, members } = req.body;
      const userId = req.user.id;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required'
        });
      }

      if (!members || !Array.isArray(members) || members.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 members are required'
        });
      }

      // Verify each member has at least one friend in the group
      const allParticipants = [userId, ...members];
      
      // Get all users with their friends list
      const users = await User.find({ _id: { $in: allParticipants } }).populate('friends');
      const userFriendsMap = {};
      
      users.forEach(user => {
        userFriendsMap[user._id.toString()] = user.friends.map(f => f._id.toString());
      });

      // Check if each participant has at least one friend in the group
      const invalidMembers = [];
      for (const participantId of allParticipants) {
        const friendIds = userFriendsMap[participantId] || [];
        const hasFriendInGroup = allParticipants.some(otherId => 
          otherId !== participantId && friendIds.includes(otherId)
        );
        
        if (!hasFriendInGroup) {
          invalidMembers.push(participantId);
        }
      }

      if (invalidMembers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Each member must have at least one friend in the group'
        });
      }

      // Create group conversation (creator + members)
      const participants = allParticipants;
      
      const conversation = await Conversation.create({
        participants: participants,
        type: 'group',
        name: name.trim(),
        createdBy: userId
      });

      await conversation.populate('participants', 'username fullName avatar isOnline lastSeen');

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: conversation
      });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create group',
        error: error.message
      });
    }
  }
}

module.exports = FriendController;
