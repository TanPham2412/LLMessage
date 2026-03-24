var jwt = require('jsonwebtoken');
var config = require(global.__basedir + "/Config/Setting.json");
var User = require(global.__basedir + "/apps/Entity/User");
var Conversation = require(global.__basedir + "/apps/Entity/Conversation");
var Message = require(global.__basedir + "/apps/Entity/Message");

class SocketHandler {
    constructor(io) {
        this.io = io;
        this.onlineUsers = new Map();
    }

    initialize() {
        var self = this;
        this.io.use(function(socket, next) {
            self.authenticateSocket(socket, next);
        });
        this.io.on('connection', function(socket) {
            self.handleConnection(socket);
        });
    }

    authenticateSocket(socket, next) {
        try {
            var token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }

            var decoded = jwt.verify(token, config.jwt.secret);
            socket.userId = decoded.id;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    }

    handleConnection(socket) {
        var userId = socket.userId;
        var self = this;
        console.log("User connected: " + userId);

        this.onlineUsers.set(userId, socket.id);
        this.updateUserOnlineStatus(userId, true);
        this.joinUserConversations(userId, socket);
        this.sendOnlineUsersToUser(userId, socket);
        this.broadcastOnlineStatus(userId, true);

        socket.join("user:" + userId);

        socket.on('typing', function(data) {
            socket.to("user:" + data.recipientId).emit('user-typing', {
                userId: userId,
                conversationId: data.conversationId
            });
        });

        socket.on('stop-typing', function(data) {
            socket.to("user:" + data.recipientId).emit('user-stop-typing', {
                userId: userId,
                conversationId: data.conversationId
            });
        });

        socket.on('theme-change', async function(data) {
            if (!data || !data.conversationId) return;

            socket.to("conversation:" + data.conversationId).emit('theme-received', {
                conversationId: data.conversationId,
                theme: data.theme,
                fromUserId: userId
            });

            try {
                var user = await User.findById(userId).select('fullName username');
                var senderName = (user && user.fullName) || (user && user.username) || 'Ai đó';
                var themeName = (data.theme && data.theme.name) || 'chủ đề mới';

                var sysMsg = await Message.create({
                    conversation: data.conversationId,
                    sender: userId,
                    content: senderName + ' đã đổi chủ đề sang ' + themeName,
                    type: 'system'
                });

                await sysMsg.populate('sender', 'username fullName avatar');
                await Conversation.findByIdAndUpdate(data.conversationId, { lastMessage: sysMsg._id });

                self.io.to("conversation:" + data.conversationId).emit('receive-message', sysMsg.toObject());
            } catch (err) {
                console.error('Error creating system theme message:', err);
            }
        });

        socket.on('send-message', async function(data) {
            if (data.conversation) {
                var messageCount = await Message.countDocuments({
                    conversation: data.conversation,
                    isDeleted: false
                });

                if (messageCount === 1 && data.recipientId) {
                    var conversation = await Conversation.findById(data.conversation)
                        .populate('participants', 'username fullName avatar isOnline lastSeen')
                        .populate('lastMessage');

                    if (conversation) {
                        self.joinUserToConversation(data.recipientId, data.conversation);
                        self.sendNotificationToUser(data.recipientId, 'new-conversation', conversation);
                    }
                }

                if (!data.isBlocked) {
                    socket.to("conversation:" + data.conversation).emit('receive-message', data);
                }
            }
        });

        socket.on('join-conversation', function(conversationId) {
            socket.join("conversation:" + conversationId);
        });

        socket.on('leave-conversation', function(conversationId) {
            socket.leave("conversation:" + conversationId);
        });

        socket.on('request-online-users', function() {
            self.sendOnlineUsersToUser(userId, socket);
        });

        socket.on('disconnect', async function() {
            console.log("User disconnected: " + userId);
            self.onlineUsers.delete(userId);

            var lastSeen = new Date();
            await self.updateUserOnlineStatus(userId, false, lastSeen);
            self.broadcastOnlineStatus(userId, false, lastSeen);
        });
    }

    async updateUserOnlineStatus(userId, isOnline, lastSeen) {
        try {
            lastSeen = lastSeen || new Date();
            await User.findByIdAndUpdate(userId, {
                isOnline: isOnline,
                lastSeen: isOnline ? null : lastSeen
            });
        } catch (error) {
            console.error('Update user online status error:', error);
        }
    }

    async broadcastOnlineStatus(userId, isOnline, lastSeen) {
        try {
            var user = await User.findById(userId).select('restrictedUsers blockedUsers');
            if (!user) return;

            var hiddenFromUserIds = []
                .concat(user.restrictedUsers.map(function(id) { return id.toString(); }))
                .concat(user.blockedUsers.map(function(id) { return id.toString(); }));

            var self = this;
            this.onlineUsers.forEach(function(socketId, connectedUserId) {
                if (connectedUserId !== userId && hiddenFromUserIds.indexOf(connectedUserId) === -1) {
                    if (isOnline) {
                        self.io.to(socketId).emit('user-online', { userId: userId });
                    } else {
                        self.io.to(socketId).emit('user-offline', { userId: userId, lastSeen: lastSeen });
                    }
                }
            });
        } catch (error) {
            console.error('Broadcast online status error:', error);
        }
    }

    async sendOnlineUsersToUser(userId, socket) {
        try {
            var user = await User.findById(userId).select('restrictedUsers blockedUsers');
            if (!user) {
                socket.emit('online-users', { userIds: [] });
                return;
            }

            var usersWhoRestrictedMe = await User.find({ restrictedUsers: userId }).select('_id');
            var usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id');

            var hiddenUserIds = new Set();
            user.restrictedUsers.forEach(function(id) { hiddenUserIds.add(id.toString()); });
            user.blockedUsers.forEach(function(id) { hiddenUserIds.add(id.toString()); });
            usersWhoRestrictedMe.forEach(function(u) { hiddenUserIds.add(u._id.toString()); });
            usersWhoBlockedMe.forEach(function(u) { hiddenUserIds.add(u._id.toString()); });

            var onlineUserIds = this.getOnlineUsers();
            var filteredOnlineUsers = onlineUserIds.filter(function(onlineUserId) {
                return !hiddenUserIds.has(onlineUserId);
            });

            socket.emit('online-users', { userIds: filteredOnlineUsers });
        } catch (error) {
            console.error('Send online users error:', error);
            socket.emit('online-users', { userIds: [] });
        }
    }

    async joinUserConversations(userId, socket) {
        try {
            var conversations = await Conversation.find({ participants: userId }).select('_id');

            conversations.forEach(function(conv) {
                socket.join("conversation:" + conv._id);
            });
        } catch (error) {
            console.error('Join user conversations error:', error);
        }
    }

    sendNotificationToUser(userId, event, data) {
        this.io.to("user:" + userId).emit(event, data);
    }

    emitToUser(userId, event, data) {
        var socketId = this.onlineUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }

    joinUserToConversation(userId, conversationId) {
        var socketId = this.onlineUsers.get(userId);
        if (socketId) {
            var socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join("conversation:" + conversationId);
            }
        }
    }

    isUserOnline(userId) {
        return this.onlineUsers.has(userId);
    }

    getOnlineUsers() {
        return Array.from(this.onlineUsers.keys());
    }
}

module.exports = SocketHandler;
