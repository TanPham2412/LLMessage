var express = require("express");
var router = express.Router();
var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
var ConversationRepository = require(global.__basedir + "/apps/Repository/ConversationRepository");
var Notification = require(global.__basedir + "/apps/Entity/Notification");
var User = require(global.__basedir + "/apps/Entity/User");
var Conversation = require(global.__basedir + "/apps/Entity/Conversation");
var Message = require(global.__basedir + "/apps/Entity/Message");
var { authenticate } = require(global.__basedir + "/apps/middleware/auth");

// socketHandler sẽ được set từ app.js
var socketHandler = null;
router.setSocketHandler = function(handler) {
    socketHandler = handler;
};

// All routes require authentication
router.use(authenticate);

// POST /request - Send friend request
router.post("/request", async function(req, res) {
    try {
        var { recipientId } = req.body;
        var senderId = req.user.id;

        if (senderId === recipientId) {
            return res.status(400).json({ success: false, message: 'Bạn không thể gửi lời mời kết bạn cho chính mình' });
        }

        var sender = await User.findById(senderId);
        var recipient = await User.findById(recipientId);

        if (!recipient) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        if (sender.friends.includes(recipientId)) {
            return res.status(400).json({ success: false, message: 'Bạn đã là bạn bè rồi' });
        }

        var alreadySent = sender.sentFriendRequests.find(function(r) {
            return r.to.toString() === recipientId;
        });

        if (alreadySent) {
            return res.status(400).json({ success: false, message: 'Bạn đã gửi lời mời kết bạn rồi' });
        }

        var existingRequest = recipient.friendRequests.find(function(r) {
            return r.from.toString() === senderId;
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'Lời mời kết bạn đã tồn tại' });
        }

        recipient.friendRequests.push({ from: senderId });
        await recipient.save();

        sender.sentFriendRequests.push({ to: recipientId });
        await sender.save();

        await Notification.create({
            recipient: recipientId,
            sender: senderId,
            type: 'friend-request',
            title: 'Lời mời kết bạn',
            message: (sender.fullName || sender.username) + ' đã gửi lời mời kết bạn',
            data: { requestId: recipient.friendRequests[recipient.friendRequests.length - 1]._id }
        });

        if (socketHandler) {
            socketHandler.sendNotificationToUser(recipientId, 'friend-request-received', {
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

        res.json({ success: true, message: 'Friend request sent successfully' });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({ success: false, message: 'Failed to send friend request', error: error.message });
    }
});

// GET /requests - Get friend requests
router.get("/requests", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var userId = req.user.id;

        var user = await userRepository.findByIdPopulateFriendRequests(userId);

        res.json({ success: true, data: user.friendRequests });
    } catch (error) {
        console.error('Get friend requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch friend requests', error: error.message });
    }
});

// POST /request/:requestId/accept - Accept friend request
router.post("/request/:requestId/accept", async function(req, res) {
    try {
        var { requestId } = req.params;
        var userId = req.user.id;

        var user = await User.findById(userId);
        var requestIndex = user.friendRequests.findIndex(function(r) {
            return r._id.toString() === requestId;
        });

        if (requestIndex === -1) {
            return res.status(404).json({ success: false, message: 'Friend request not found' });
        }

        var senderId = user.friendRequests[requestIndex].from;

        user.friends.push(senderId);
        user.friendRequests.splice(requestIndex, 1);
        await user.save();

        var sender = await User.findById(senderId);
        sender.friends.push(userId);
        sender.sentFriendRequests = sender.sentFriendRequests.filter(function(r) {
            return r.to.toString() !== userId.toString();
        });
        await sender.save();

        var conversationRepository = new ConversationRepository();
        var conversation = await conversationRepository.insertConversation({
            participants: [userId, senderId],
            type: 'private',
            createdBy: userId
        });

        await Notification.create({
            recipient: senderId,
            sender: userId,
            type: 'friend-accepted',
            title: 'Chấp nhận kết bạn',
            message: (user.fullName || user.username) + ' đã chấp nhận lời mời kết bạn của bạn',
            data: { conversationId: conversation._id }
        });

        if (socketHandler) {
            socketHandler.sendNotificationToUser(senderId, 'friend-request-accepted', {
                from: {
                    _id: user._id,
                    username: user.username,
                    fullName: user.fullName,
                    avatar: user.avatar
                },
                message: (user.fullName || user.username) + ' đã chấp nhận lời mời kết bạn của bạn',
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
        res.status(500).json({ success: false, message: 'Failed to accept friend request', error: error.message });
    }
});

// POST /request/:requestId/reject - Reject friend request
router.post("/request/:requestId/reject", async function(req, res) {
    try {
        var { requestId } = req.params;
        var userId = req.user.id;

        var user = await User.findById(userId);
        var requestIndex = user.friendRequests.findIndex(function(r) {
            return r._id.toString() === requestId;
        });

        if (requestIndex === -1) {
            return res.status(404).json({ success: false, message: 'Friend request not found' });
        }

        var senderId = user.friendRequests[requestIndex].from;
        user.friendRequests.splice(requestIndex, 1);
        await user.save();

        var sender = await User.findById(senderId);
        sender.sentFriendRequests = sender.sentFriendRequests.filter(function(r) {
            return r.to.toString() !== userId.toString();
        });
        await sender.save();

        await Notification.create({
            recipient: senderId,
            sender: userId,
            type: 'friend-rejected',
            title: 'Từ chối kết bạn',
            message: (user.fullName || user.username) + ' đã từ chối lời mời kết bạn của bạn',
            data: {}
        });

        if (socketHandler) {
            socketHandler.sendNotificationToUser(senderId, 'friend-request-rejected', {
                from: {
                    _id: user._id,
                    username: user.username,
                    fullName: user.fullName,
                    avatar: user.avatar
                },
                message: (user.fullName || user.username) + ' đã từ chối lời mời kết bạn của bạn',
                createdAt: new Date()
            });
        }

        res.json({ success: true, message: 'Friend request rejected' });
    } catch (error) {
        console.error('Reject friend request error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject friend request', error: error.message });
    }
});

// GET / - Get friends list
router.get("/", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var userId = req.user.id;

        var user = await userRepository.findByIdPopulateFriendsList(userId);

        res.json({ success: true, data: user.friends });
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch friends', error: error.message });
    }
});

// DELETE /:friendId - Remove friend
router.delete("/:friendId", async function(req, res) {
    try {
        var { friendId } = req.params;
        var userId = req.user.id;

        var user = await User.findById(userId);
        user.friends = user.friends.filter(function(id) {
            return id.toString() !== friendId.toString();
        });
        await user.save();

        var friend = await User.findById(friendId);
        friend.friends = friend.friends.filter(function(id) {
            return id.toString() !== userId.toString();
        });
        await friend.save();

        res.json({ success: true, message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove friend', error: error.message });
    }
});

// GET /conversations - Get conversations
router.get("/conversations", async function(req, res) {
    try {
        var conversationRepository = new ConversationRepository();
        var userId = req.user.id;

        var conversations = await conversationRepository.getUserConversations(userId);

        // Filter deleted conversations
        conversations = conversations.filter(function(conv) {
            var deletedInfo = conv.deletedBy.find(function(item) {
                var itemUserId = item.user ? item.user.toString() : item.toString();
                return itemUserId === userId.toString();
            });

            if (!deletedInfo) return true;

            if (conv.lastMessageAt && deletedInfo.deletedAt) {
                var deletedTime = new Date(deletedInfo.deletedAt).getTime();
                var lastMsgTime = new Date(conv.lastMessageAt).getTime();
                return lastMsgTime > deletedTime;
            }

            return false;
        });

        // Sort: pinned first, then by lastMessageAt
        conversations = conversations.sort(function(a, b) {
            var aIsPinned = a.pinnedBy.includes(userId);
            var bIsPinned = b.pinnedBy.includes(userId);

            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;

            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
        });

        // Clean up lastMessage for blocked messages
        conversations = conversations.map(function(conv) {
            var convObj = conv.toObject();

            if (convObj.lastMessage && convObj.lastMessage.isBlocked) {
                var senderId = convObj.lastMessage.sender && convObj.lastMessage.sender._id
                    ? convObj.lastMessage.sender._id.toString()
                    : (convObj.lastMessage.sender ? convObj.lastMessage.sender.toString() : null);

                if (senderId !== userId.toString()) {
                    convObj.lastMessage = null;
                }
            }

            // Resolve nicknames
            var nicknames = convObj.nicknames || [];
            var seen = new Map();
            for (var i = 0; i < nicknames.length; i++) {
                var n = nicknames[i];
                var sid = (n.setter && n.setter._id || n.setter) ? (n.setter._id || n.setter).toString() : null;
                var tid = (n.target && n.target._id || n.target) ? (n.target._id || n.target).toString() : null;
                if (n.isPublic || sid === userId.toString()) {
                    seen.set(tid, n.nickname);
                }
            }
            convObj.resolvedNicknames = Object.fromEntries(seen);
            delete convObj.nicknames;

            return convObj;
        });

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations', error: error.message });
    }
});

// POST /conversations - Create conversation
router.post("/conversations", async function(req, res) {
    try {
        var conversationRepository = new ConversationRepository();
        var { participantId } = req.body;
        var userId = req.user.id;

        var existingConversation = await conversationRepository.findPrivateConversation(userId, participantId);

        if (existingConversation) {
            await existingConversation.populate('participants', 'username fullName avatar isOnline lastSeen');
            await existingConversation.populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'username fullName avatar' }
            });

            return res.json({ success: true, data: existingConversation });
        }

        var conversation = await conversationRepository.insertConversation({
            participants: [userId, participantId],
            type: 'private',
            createdBy: userId
        });

        await conversation.populate('participants', 'username fullName avatar isOnline');

        if (socketHandler) {
            socketHandler.joinUserToConversation(userId, conversation._id.toString());
        }

        res.status(201).json({
            success: true,
            message: 'Conversation created successfully',
            data: conversation
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create conversation', error: error.message });
    }
});

// POST /conversations/:conversationId/pin - Toggle pin
router.post("/conversations/:conversationId/pin", async function(req, res) {
    try {
        var { conversationId } = req.params;
        var userId = req.user.id;

        var conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        if (!conversation.hasParticipant(userId)) {
            return res.status(403).json({ success: false, message: 'You are not a participant' });
        }

        var isPinned = conversation.pinnedBy.includes(userId);

        if (isPinned) {
            conversation.pinnedBy = conversation.pinnedBy.filter(function(id) {
                return id.toString() !== userId.toString();
            });
        } else {
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
        res.status(500).json({ success: false, message: 'Failed to toggle pin', error: error.message });
    }
});

// DELETE /conversations/:conversationId - Delete conversation (soft)
router.delete("/conversations/:conversationId", async function(req, res) {
    try {
        var { conversationId } = req.params;
        var userId = req.user.id;

        var conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        if (!conversation.hasParticipant(userId)) {
            return res.status(403).json({ success: false, message: 'You are not a participant' });
        }

        var existingDeletedIndex = conversation.deletedBy.findIndex(function(item) {
            var itemUserId = item.user ? item.user.toString() : item.toString();
            return itemUserId === userId.toString();
        });

        if (existingDeletedIndex !== -1) {
            conversation.deletedBy[existingDeletedIndex] = { user: userId, deletedAt: new Date() };
            await conversation.save();
        } else {
            conversation.deletedBy.push({ user: userId, deletedAt: new Date() });
            await conversation.save();
        }

        res.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete conversation', error: error.message });
    }
});

// POST /groups - Create group
router.post("/groups", async function(req, res) {
    try {
        var conversationRepository = new ConversationRepository();
        var { name, members } = req.body;
        var userId = req.user.id;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Group name is required' });
        }

        if (!members || !Array.isArray(members) || members.length < 2) {
            return res.status(400).json({ success: false, message: 'At least 2 members are required' });
        }

        var allParticipants = [userId].concat(members);

        var conversation = await conversationRepository.insertConversation({
            participants: allParticipants,
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
        res.status(500).json({ success: false, message: 'Failed to create group', error: error.message });
    }
});

// GET /conversations/:conversationId/nicknames - Get nicknames
router.get("/conversations/:conversationId/nicknames", async function(req, res) {
    try {
        var conversationRepository = new ConversationRepository();
        var { conversationId } = req.params;
        var userId = req.user.id.toString();

        var conversation = await conversationRepository.findByIdPopulateNicknames(conversationId);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        if (!conversation.hasParticipant(userId)) {
            return res.status(403).json({ success: false, message: 'Not a participant' });
        }

        var seen = new Map();
        for (var i = 0; i < conversation.nicknames.length; i++) {
            var n = conversation.nicknames[i];
            var sid = (n.setter && n.setter._id || n.setter) ? (n.setter._id || n.setter).toString() : null;
            var tid = (n.target && n.target._id || n.target) ? (n.target._id || n.target).toString() : null;
            var key = sid + ":" + tid;
            if (n.isPublic || sid === userId) {
                seen.set(key, n);
            }
        }

        res.json({ success: true, data: Array.from(seen.values()) });
    } catch (error) {
        console.error('Get nicknames error:', error);
        res.status(500).json({ success: false, message: 'Failed to get nicknames', error: error.message });
    }
});

// PUT /conversations/:conversationId/nickname - Set nickname
router.put("/conversations/:conversationId/nickname", async function(req, res) {
    try {
        var { conversationId } = req.params;
        var { targetId, nickname, isPublic } = req.body;
        var userId = req.user.id.toString();

        var conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        if (!conversation.hasParticipant(userId)) {
            return res.status(403).json({ success: false, message: 'Not a participant' });
        }
        if (!conversation.hasParticipant(targetId)) {
            return res.status(400).json({ success: false, message: 'Target is not a participant' });
        }

        var trimmedNickname = nickname ? nickname.trim() : '';

        conversation.nicknames = conversation.nicknames.filter(function(n) {
            var sid = (n.setter && n.setter._id || n.setter) ? (n.setter._id || n.setter).toString() : null;
            var tid = (n.target && n.target._id || n.target) ? (n.target._id || n.target).toString() : null;
            if (tid !== targetId.toString()) return true;
            if (!trimmedNickname) {
                var isVisible = n.isPublic || sid === userId || tid === userId;
                return !isVisible;
            }
            return !(sid === userId);
        });

        if (trimmedNickname) {
            conversation.nicknames.push({ setter: userId, target: targetId, nickname: trimmedNickname, isPublic: !!isPublic });
        }

        await conversation.save();

        // If public nickname was set, create system message
        if (isPublic && trimmedNickname) {
            var setter = await User.findById(userId).select('fullName username');
            var target = await User.findById(targetId).select('fullName username');

            var setterName = (setter && setter.fullName) || (setter && setter.username) || 'Ai đó';
            var targetName = (target && target.fullName) || (target && target.username) || 'ai đó';

            var payload = JSON.stringify({
                setterId: userId.toString(),
                setterName: setterName,
                targetId: targetId.toString(),
                targetName: targetName,
                nickname: trimmedNickname
            });
            var content = "__NICKNAME_SET__|" + payload;

            var sysMsg = await Message.create({
                conversation: conversationId,
                sender: userId,
                content: content,
                type: 'system'
            });
            await sysMsg.populate('sender', 'username fullName avatar');
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: sysMsg._id,
                lastMessageAt: new Date()
            });

            if (socketHandler && socketHandler.io) {
                socketHandler.io.to("conversation:" + conversationId).emit('receive-message', sysMsg.toObject());
            }
        }

        // Return updated visible nicknames
        var conversationRepository = new ConversationRepository();
        var updated = await conversationRepository.findByIdPopulateNicknames(conversationId);

        var visibleNicknames = updated.nicknames.filter(function(n) {
            var setterId = (n.setter && n.setter._id || n.setter) ? (n.setter._id || n.setter).toString() : null;
            return n.isPublic || setterId === userId;
        });

        res.json({ success: true, data: visibleNicknames });
    } catch (error) {
        console.error('Set nickname error:', error);
        res.status(500).json({ success: false, message: 'Failed to set nickname', error: error.message });
    }
});

// POST /users/:userId/block - Block user
router.post("/users/:userId/block", async function(req, res) {
    try {
        var targetUserId = req.params.userId;
        var userId = req.user.id;

        if (userId === targetUserId) {
            return res.status(400).json({ success: false, message: 'Cannot block yourself' });
        }

        var user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.blockedUsers.includes(targetUserId)) {
            return res.status(400).json({ success: false, message: 'User already blocked' });
        }

        user.blockedUsers.push(targetUserId);
        await user.save();

        res.json({ success: true, message: 'User blocked successfully' });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ success: false, message: 'Failed to block user', error: error.message });
    }
});

// DELETE /users/:userId/block - Unblock user
router.delete("/users/:userId/block", async function(req, res) {
    try {
        var targetUserId = req.params.userId;
        var userId = req.user.id;

        var user = await User.findById(userId);
        user.blockedUsers = user.blockedUsers.filter(function(id) {
            return id.toString() !== targetUserId.toString();
        });
        await user.save();

        res.json({ success: true, message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ success: false, message: 'Failed to unblock user', error: error.message });
    }
});

// POST /users/:userId/restrict - Restrict user
router.post("/users/:userId/restrict", async function(req, res) {
    try {
        var targetUserId = req.params.userId;
        var userId = req.user.id;

        if (userId === targetUserId) {
            return res.status(400).json({ success: false, message: 'Cannot restrict yourself' });
        }

        var user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.restrictedUsers.includes(targetUserId)) {
            return res.status(400).json({ success: false, message: 'User already restricted' });
        }

        user.restrictedUsers.push(targetUserId);
        await user.save();

        res.json({ success: true, message: 'User restricted successfully' });
    } catch (error) {
        console.error('Restrict user error:', error);
        res.status(500).json({ success: false, message: 'Failed to restrict user', error: error.message });
    }
});

// DELETE /users/:userId/restrict - Unrestrict user
router.delete("/users/:userId/restrict", async function(req, res) {
    try {
        var targetUserId = req.params.userId;
        var userId = req.user.id;

        var user = await User.findById(userId);
        user.restrictedUsers = user.restrictedUsers.filter(function(id) {
            return id.toString() !== targetUserId.toString();
        });
        await user.save();

        res.json({ success: true, message: 'User unrestricted successfully' });
    } catch (error) {
        console.error('Unrestrict user error:', error);
        res.status(500).json({ success: false, message: 'Failed to unrestrict user', error: error.message });
    }
});

// GET /blocked - Get blocked users
router.get("/blocked", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var userId = req.user.id;

        var user = await userRepository.findByIdPopulateBlocked(userId);

        res.json({ success: true, data: user.blockedUsers });
    } catch (error) {
        console.error('Get blocked users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get blocked users', error: error.message });
    }
});

// GET /restricted - Get restricted users
router.get("/restricted", async function(req, res) {
    try {
        var userRepository = new UserRepository();
        var userId = req.user.id;

        var user = await userRepository.findByIdPopulateRestricted(userId);

        res.json({ success: true, data: user.restrictedUsers });
    } catch (error) {
        console.error('Get restricted users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get restricted users', error: error.message });
    }
});

// GET /users/:userId/status-visibility - Check status visibility
router.get("/users/:userId/status-visibility", async function(req, res) {
    try {
        var targetUserId = req.params.userId;
        var currentUserId = req.user.id;

        var targetUser = await User.findById(targetUserId).select('restrictedUsers blockedUsers');

        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Restrict is one-sided: only blocked users can hide status from each other
        var isHidden = targetUser.blockedUsers.includes(currentUserId);

        res.json({ success: true, data: { isHidden: isHidden } });
    } catch (error) {
        console.error('Check status visibility error:', error);
        res.status(500).json({ success: false, message: 'Failed to check status visibility', error: error.message });
    }
});

module.exports = router;
