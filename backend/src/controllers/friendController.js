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

      let conversations = await Conversation.find({
        participants: userId,
        isActive: true
        // Don't exclude deleted conversations - filter them based on lastMessage timestamp
      })
        .populate('participants', 'username fullName avatar isOnline lastSeen')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'username fullName avatar'
          }
        })
        .populate('nicknames.target', '_id')
        .sort({ lastMessageAt: -1 });

      // Filter: Only show conversations that were NOT deleted OR have new messages after deletion
      conversations = conversations.filter(conv => {
        const deletedInfo = conv.deletedBy.find(item => {
          // Handle both old format (ObjectId directly) and new format ({ user, deletedAt })
          const itemUserId = item.user ? item.user.toString() : item.toString();
          return itemUserId === userId.toString();
        });
        
        // If not deleted by user, show it
        if (!deletedInfo) return true;
        
        // If deleted but has new message after deletion, show it
        if (conv.lastMessageAt && deletedInfo.deletedAt) {
          const deletedTime = new Date(deletedInfo.deletedAt).getTime();
          const lastMsgTime = new Date(conv.lastMessageAt).getTime();
          
          console.log('🔍 Filtering conversation:', {
            convId: conv._id,
            convName: conv.name || conv.participants.find(p => p._id.toString() !== userId.toString())?.fullName,
            deletedAt: deletedInfo.deletedAt,
            lastMessageAt: conv.lastMessageAt,
            deletedTime,
            lastMsgTime,
            shouldShow: lastMsgTime > deletedTime
          });
          
          return lastMsgTime > deletedTime;
        }
        
        console.log('🚫 Hiding conversation (deleted, no new messages):', conv._id);
        
        // If deleted and no new messages, hide it
        return false;
      });

      // Sort: pinned conversations first, then by lastMessageAt
      conversations = conversations.sort((a, b) => {
        const aIsPinned = a.pinnedBy.includes(userId);
        const bIsPinned = b.pinnedBy.includes(userId);
        
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        
        // If both pinned or both not pinned, sort by lastMessageAt
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      });

      // Clean up lastMessage for blocked messages user didn't send
      conversations = conversations.map(conv => {
        const convObj = conv.toObject();
        
        // If lastMessage is blocked and user is not the sender, hide it
        if (convObj.lastMessage && convObj.lastMessage.isBlocked) {
          const senderId = convObj.lastMessage.sender?._id?.toString() || convObj.lastMessage.sender?.toString();
          
          // If current user is not the sender, don't show the message content
          if (senderId !== userId.toString()) {
            convObj.lastMessage = null;
          }
        }

        // Resolve the nickname this user sees for the other participant
        // (last visible entry per target: public OR set by current user)
        const nicknames = convObj.nicknames || [];
        const seen = new Map();
        for (const n of nicknames) {
          const sid = (n.setter?._id || n.setter)?.toString();
          const tid = (n.target?._id || n.target)?.toString();
          if (n.isPublic || sid === userId.toString()) {
            seen.set(tid, n.nickname);
          }
        }
        convObj.resolvedNicknames = Object.fromEntries(seen); // { participantId: 'nickname' }
        delete convObj.nicknames; // don't send raw array to client
        
        return convObj;
      });

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
        // DON'T remove from deletedBy - keep it so getMessages can filter old messages
        // Just return the conversation populated
        
        // Populate participants before returning
        await existingConversation.populate('participants', 'username fullName avatar isOnline lastSeen');
        await existingConversation.populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'username fullName avatar'
          }
        });
        
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

      // Auto-join người tạo vào conversation room
      if (this.socketHandler) {
        this.socketHandler.joinUserToConversation(userId, conversation._id.toString());
        // Người nhận sẽ tự động join khi connect (trong joinUserConversations)
      }

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

      // Create group conversation (creator + all selected members)
      const allParticipants = [userId, ...members];
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

  // Pin/Unpin conversation
  async togglePinConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (!conversation.hasParticipant(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant'
        });
      }

      const isPinned = conversation.pinnedBy.includes(userId);
      
      if (isPinned) {
        // Unpin
        conversation.pinnedBy = conversation.pinnedBy.filter(
          id => id.toString() !== userId.toString()
        );
      } else {
        // Pin
        conversation.pinnedBy.push(userId);
      }

      await conversation.save();

      res.json({
        success: true,
        message: isPinned ? 'Conversation unpinned' : 'Conversation pinned',
        data: { isPinned: !isPinned }
      });
    } catch (error) {
      console.error('Toggle pin conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle pin',
        error: error.message
      });
    }
  }

  // Block user
  async blockUser(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const userId = req.user.id;

      console.log('Block user request:', { userId, targetUserId });

      if (userId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot block yourself'
        });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.blockedUsers.includes(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'User already blocked'
        });
      }

      user.blockedUsers.push(targetUserId);
      await user.save();

      console.log('User blocked successfully:', targetUserId);

      res.json({
        success: true,
        message: 'User blocked successfully'
      });
    } catch (error) {
      console.error('Block user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to block user',
        error: error.message
      });
    }
  }

  // Unblock user
  async unblockUser(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);
      
      user.blockedUsers = user.blockedUsers.filter(
        id => id.toString() !== targetUserId.toString()
      );
      await user.save();

      res.json({
        success: true,
        message: 'User unblocked successfully'
      });
    } catch (error) {
      console.error('Unblock user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unblock user',
        error: error.message
      });
    }
  }

  // Restrict user
  async restrictUser(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const userId = req.user.id;

      console.log('Restrict user request:', { userId, targetUserId });

      if (userId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot restrict yourself'
        });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.restrictedUsers.includes(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'User already restricted'
        });
      }

      user.restrictedUsers.push(targetUserId);
      await user.save();

      console.log('User restricted successfully:', targetUserId);

      res.json({
        success: true,
        message: 'User restricted successfully'
      });
    } catch (error) {
      console.error('Restrict user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restrict user',
        error: error.message
      });
    }
  }

  // Unrestrict user
  async unrestrictUser(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);
      
      user.restrictedUsers = user.restrictedUsers.filter(
        id => id.toString() !== targetUserId.toString()
      );
      await user.save();

      res.json({
        success: true,
        message: 'User unrestricted successfully'
      });
    } catch (error) {
      console.error('Unrestrict user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unrestrict user',
        error: error.message
      });
    }
  }

  // Delete conversation (soft delete - hide for current user)
  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (!conversation.hasParticipant(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant'
        });
      }

      // Check if already deleted by this user
      const existingDeletedIndex = conversation.deletedBy.findIndex(item => {
        // Handle both old format (ObjectId) and new format ({ user, deletedAt })
        const itemUserId = item.user ? item.user.toString() : item.toString();
        return itemUserId === userId.toString();
      });
      
      if (existingDeletedIndex !== -1) {
        // Already deleted - update deletedAt to current time
        conversation.deletedBy[existingDeletedIndex] = {
          user: userId,
          deletedAt: new Date()
        };
        await conversation.save();
      } else {
        // Not deleted yet - add new entry
        conversation.deletedBy.push({
          user: userId,
          deletedAt: new Date()
        });
        await conversation.save();
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete conversation',
        error: error.message
      });
    }
  }

  // Get blocked users
  async getBlockedUsers(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId)
        .populate('blockedUsers', 'username fullName avatar');

      res.json({
        success: true,
        data: user.blockedUsers
      });
    } catch (error) {
      console.error('Get blocked users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get blocked users',
        error: error.message
      });
    }
  }

  // Get restricted users
  async getRestrictedUsers(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId)
        .populate('restrictedUsers', 'username fullName avatar');

      res.json({
        success: true,
        data: user.restrictedUsers
      });
    } catch (error) {
      console.error('Get restricted users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get restricted users',
        error: error.message
      });
    }
  }

  // Get nicknames for a conversation (returns only what current user can see)
  async getNicknames(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id.toString();

      const conversation = await Conversation.findById(conversationId)
        .populate('nicknames.setter', 'username fullName avatar')
        .populate('nicknames.target', 'username fullName avatar');

      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }
      if (!conversation.hasParticipant(userId)) {
        return res.status(403).json({ success: false, message: 'Not a participant' });
      }

      // Keep only visible entries, then deduplicate: for each (setter,target) keep the last one
      const seen = new Map();
      // Iterate in order so later entries overwrite — giving us the latest
      for (const n of conversation.nicknames) {
        const sid = (n.setter?._id || n.setter)?.toString();
        const tid = (n.target?._id || n.target)?.toString();
        const key = `${sid}:${tid}`;
        if (n.isPublic || sid === userId) {
          seen.set(key, n);
        }
      }

      res.json({ success: true, data: Array.from(seen.values()) });
    } catch (error) {
      console.error('Get nicknames error:', error);
      res.status(500).json({ success: false, message: 'Failed to get nicknames', error: error.message });
    }
  }

  // Set or update a nickname for a participant in a conversation
  async setNickname(req, res) {
    try {
      const { conversationId } = req.params;
      const { targetId, nickname, isPublic } = req.body;
      const userId = req.user.id.toString(); // ensure string

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }
      if (!conversation.hasParticipant(userId)) {
        return res.status(403).json({ success: false, message: 'Not a participant' });
      }
      if (!conversation.hasParticipant(targetId)) {
        return res.status(400).json({ success: false, message: 'Target is not a participant' });
      }

      const trimmedNickname = nickname?.trim() || '';

      console.log('[setNickname] userId:', userId, 'targetId:', targetId, 'nickname:', trimmedNickname, 'entries before filter:', conversation.nicknames.length);
      conversation.nicknames.forEach(n => {
        const sid = (n.setter?._id || n.setter)?.toString();
        const tid = (n.target?._id || n.target)?.toString();
        console.log(`  entry: setter=${sid} target=${tid} nick="${n.nickname}" public=${n.isPublic}`);
      });

      // On delete (empty nickname): remove all visible entries for that target
      // On set: only replace the entry the current user is setting
      conversation.nicknames = conversation.nicknames.filter(n => {
        const sid = (n.setter?._id || n.setter)?.toString();
        const tid = (n.target?._id || n.target)?.toString();
        if (tid !== targetId.toString()) return true; // different target – keep
        if (!trimmedNickname) {
          // Delete operation: remove any entry visible to current user for this target
          const isVisible = n.isPublic || sid === userId || tid === userId;
          console.log(`  [delete] sid=${sid} tid=${tid} isVisible=${isVisible} → keep=${!isVisible}`);
          return !isVisible;
        }
        // Set operation: only remove the entry the current user is setting
        return !(sid === userId);
      });

      // Push new entry only if nickname is non-empty
      if (trimmedNickname) {
        conversation.nicknames.push({ setter: userId, target: targetId, nickname: trimmedNickname, isPublic: !!isPublic });
      }

      await conversation.save();

      // If public and nickname was set, create a system message
      if (isPublic && trimmedNickname) {
        const Message = require('../models/Message');
        const User = require('../models/User');

        const [setter, target] = await Promise.all([
          User.findById(userId).select('fullName username'),
          User.findById(targetId).select('fullName username')
        ]);

        const setterName = setter?.fullName || setter?.username || 'Ai đó';
        const targetName = target?.fullName || target?.username || 'ai đó';

        // Store structured payload so frontend can render personalized text
        const payload = JSON.stringify({
          setterId: userId.toString(),
          setterName,
          targetId: targetId.toString(),
          targetName,
          nickname: trimmedNickname
        });
        const content = `__NICKNAME_SET__|${payload}`;

        const sysMsg = await Message.create({
          conversation: conversationId,
          sender: userId,
          content,
          type: 'system'
        });
        await sysMsg.populate('sender', 'username fullName avatar');
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: sysMsg._id,
          lastMessageAt: new Date()
        });

        if (this.socketHandler?.io) {
          this.socketHandler.io.to(`conversation:${conversationId}`).emit('receive-message', sysMsg.toObject());
        }
      }

      // Return updated visible nicknames (deduplicated - latest per setter+target)
      const updated = await Conversation.findById(conversationId)
        .populate('nicknames.setter', 'username fullName avatar')
        .populate('nicknames.target', 'username fullName avatar');

      const visibleNicknames = updated.nicknames.filter(n => {
        const setterId = (n.setter?._id || n.setter)?.toString();
        return n.isPublic || setterId === userId;
      });

      res.json({ success: true, data: visibleNicknames });
    } catch (error) {
      console.error('Set nickname error:', error);
      res.status(500).json({ success: false, message: 'Failed to set nickname', error: error.message });
    }
  }

  // Check if a user has hidden their status from me (restricted or blocked me)
  async checkStatusVisibility(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user.id;

      const targetUser = await User.findById(targetUserId).select('restrictedUsers blockedUsers');
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isHidden = targetUser.restrictedUsers.includes(currentUserId) || 
                       targetUser.blockedUsers.includes(currentUserId);

      res.json({
        success: true,
        data: { isHidden }
      });
    } catch (error) {
      console.error('Check status visibility error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check status visibility',
        error: error.message
      });
    }
  }
}

module.exports = FriendController;
