var MessageRepository = require(global.__basedir + "/apps/Repository/MessageRepository");
var ConversationRepository = require(global.__basedir + "/apps/Repository/ConversationRepository");
var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");

class MessageService {
    messageRepository;
    conversationRepository;
    userRepository;

    constructor() {
        this.messageRepository = new MessageRepository();
        this.conversationRepository = new ConversationRepository();
        this.userRepository = new UserRepository();
    }

    async sendMessage(conversationId, senderId, content, type, fileData) {
        var conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) {
            return { success: false, message: 'Conversation not found' };
        }

        if (!conversation.hasParticipant(senderId)) {
            return { success: false, message: 'You are not a participant of this conversation' };
        }

        // Check if sender is blocked by any participant
        var otherParticipants = conversation.participants.filter(function(p) {
            return p.toString() !== senderId.toString();
        });

        var isBlockedBySomeone = false;
        for (var i = 0; i < otherParticipants.length; i++) {
            var participant = await this.userRepository.findByIdSelectFields(otherParticipants[i], 'blockedUsers');
            if (participant && participant.blockedUsers.includes(senderId)) {
                isBlockedBySomeone = true;
                break;
            }
        }

        var messageData = {
            conversation: conversationId,
            sender: senderId,
            content: content,
            type: type || 'text'
        };

        if (isBlockedBySomeone) {
            messageData.isBlocked = true;
            messageData.blockedMessage = 'Xin lỗi! Người dùng hiện tại không muốn nhận tin nhắn!';
        }

        if (fileData) {
            messageData.fileUrl = fileData.fileUrl;
            messageData.fileName = fileData.fileName;
            messageData.fileSize = fileData.fileSize;
            messageData.type = fileData.type;
        }

        var message = await this.messageRepository.insertMessage(messageData);

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        await conversation.save();

        await message.populate('sender', 'username fullName avatar');

        return { success: true, data: message, isBlocked: isBlockedBySomeone };
    }

    async getMessages(conversationId, userId, page, limit) {
        var conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) {
            return { success: false, message: 'Conversation not found' };
        }

        if (!conversation.hasParticipant(userId)) {
            return { success: false, message: 'You are not a participant of this conversation' };
        }

        var deletedInfo = conversation.deletedBy.find(function(item) {
            var itemUserId = item.user ? item.user.toString() : item.toString();
            return itemUserId === userId.toString();
        });

        var query = { conversation: conversationId };
        if (deletedInfo && deletedInfo.deletedAt) {
            query.createdAt = { $gt: deletedInfo.deletedAt };
        }

        var skip = (page - 1) * limit;
        var messages = await this.messageRepository.getMessagesByConversation(conversationId, query.createdAt ? { createdAt: query.createdAt } : {}, skip, limit);

        var filteredMessages = messages.filter(function(msg) {
            if (!msg.isBlocked) return true;
            var senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
            return senderId === userId.toString();
        });

        var allMessages = await this.messageRepository.findMessagesByQuery(query);
        var visibleCount = allMessages.filter(function(msg) {
            if (!msg.isBlocked) return true;
            var senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
            return senderId === userId.toString();
        }).length;

        return {
            success: true,
            data: filteredMessages.reverse(),
            pagination: {
                total: visibleCount,
                page: parseInt(page),
                pages: Math.ceil(visibleCount / limit)
            }
        };
    }

    async markAsRead(messageId, userId) {
        var message = await this.messageRepository.findById(messageId);
        if (!message) {
            return { success: false, message: 'Message not found' };
        }

        var alreadyRead = message.readBy.some(function(r) {
            return r.user.toString() === userId.toString();
        });

        if (!alreadyRead) {
            message.readBy.push({ user: userId, readAt: Date.now() });
            message.isRead = true;
            await message.save();
        }

        return { success: true };
    }

    async editMessage(messageId, userId, content) {
        var message = await this.messageRepository.findById(messageId);
        if (!message) {
            return { success: false, message: 'Message not found' };
        }

        if (message.sender.toString() !== userId.toString()) {
            return { success: false, message: 'You can only edit your own messages', forbidden: true };
        }

        if (message.type !== 'text') {
            return { success: false, message: 'Only text messages can be edited' };
        }

        var messageAge = Date.now() - message.createdAt.getTime();
        var fifteenMinutes = 15 * 60 * 1000;
        if (messageAge > fifteenMinutes) {
            return { success: false, message: 'Cannot edit message older than 15 minutes' };
        }

        message.content = content.trim();
        message.editedAt = Date.now();
        message.isEdited = true;
        await message.save();

        await message.populate('sender', 'username fullName avatar');

        return { success: true, data: message };
    }

    async deleteMessage(messageId, userId) {
        var message = await this.messageRepository.findById(messageId);
        if (!message) {
            return { success: false, message: 'Message not found' };
        }

        if (message.sender.toString() !== userId.toString()) {
            return { success: false, message: 'You can only delete your own messages', forbidden: true };
        }

        message.isDeleted = true;
        message.deletedAt = Date.now();
        await message.save();

        return { success: true, data: message };
    }

    async getAllMessages(page, limit) {
        var skip = (page - 1) * limit;
        var messages = await this.messageRepository.getAllMessages(skip, limit);
        var count = await this.messageRepository.countAllMessages();

        return {
            success: true,
            data: messages,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        };
    }

    async findFileMessage(filename) {
        return await this.messageRepository.findByConversationFileUrl(filename);
    }
}

module.exports = MessageService;
