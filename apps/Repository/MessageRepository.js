var Message = require(global.__basedir + "/apps/Entity/Message");

class MessageRepository {
    constructor() {

    }

    async insertMessage(messageData) {
        return await Message.create(messageData);
    }

    async findById(id) {
        return await Message.findById(id);
    }

    async findByIdPopulate(id) {
        return await Message.findById(id).populate('sender', 'username fullName avatar');
    }

    async getMessagesByConversation(conversationId, query, skip, take) {
        var findQuery = Object.assign({ conversation: conversationId }, query || {});
        return await Message.find(findQuery)
            .populate('sender', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .limit(take)
            .skip(skip);
    }

    async countMessages(query) {
        return await Message.countDocuments(query);
    }

    async findMessagesByQuery(query) {
        return await Message.find(query);
    }

    async findByConversationFileUrl(filename) {
        return await Message.findOne({ fileUrl: "/uploads/" + filename }).select('fileName');
    }

    async getAllMessages(skip, take) {
        return await Message.find({ isDeleted: false })
            .populate('sender', 'username fullName avatar')
            .populate('conversation', 'name type')
            .sort({ createdAt: -1 })
            .limit(take)
            .skip(skip);
    }

    async countAllMessages() {
        return await Message.countDocuments({ isDeleted: false });
    }

    async findByIds(ids) {
        return await Message.find({ _id: { $in: ids }, isDeleted: false })
            .populate('sender', 'username fullName avatar')
            .sort({ createdAt: -1 });
    }

    async getMediaByConversation(conversationId) {
        return await Message.find({
            conversation: conversationId,
            type: { $in: ['image', 'file'] },
            isDeleted: false
        })
            .populate('sender', 'username fullName avatar')
            .sort({ createdAt: -1 });
    }
    async searchByContent(conversationId, query, afterDate) {
        var filter = {
            conversation: conversationId,
            isDeleted: false,
            type: 'text',
            content: { $regex: query, $options: 'i' }
        };
        if (afterDate) {
            filter.createdAt = { $gt: afterDate };
        }
        return await Message.find(filter)
            .populate('sender', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .limit(50);
    }

    async getAllMessagesWithFilters(skip, take, filters = {}) {
        var query = {};

        // Search in content
        if (filters.search) {
            query.$or = [
                { content: { $regex: filters.search, $options: 'i' } },
                { fileName: { $regex: filters.search, $options: 'i' } }
            ];
        }

        // Filter by message type
        if (filters.type && filters.type !== 'all') {
            query.type = filters.type;
        }

        // Filter by sender
        if (filters.senderId) {
            query.sender = filters.senderId;
        }

        // Filter by conversation
        if (filters.conversationId) {
            query.conversation = filters.conversationId;
        }

        // Filter by date range
        if (filters.dateFrom || filters.dateTo) {
            query.createdAt = {};
            if (filters.dateFrom) {
                query.createdAt.$gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                var endDate = new Date(filters.dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDate;
            }
        }

        // Filter by deleted status
        if (filters.showDeleted === 'true' || filters.showDeleted === true) {
            query.isDeleted = true;
        } else {
            query.isDeleted = false;
        }

        return await Message.find(query)
            .populate('sender', 'username fullName avatar')
            .populate('conversation', 'name type')
            .sort({ createdAt: -1 })
            .limit(take)
            .skip(skip);
    }

    async countAllMessagesWithFilters(filters = {}) {
        var query = {};

        // Search in content
        if (filters.search) {
            query.$or = [
                { content: { $regex: filters.search, $options: 'i' } },
                { fileName: { $regex: filters.search, $options: 'i' } }
            ];
        }

        // Filter by message type
        if (filters.type && filters.type !== 'all') {
            query.type = filters.type;
        }

        // Filter by sender
        if (filters.senderId) {
            query.sender = filters.senderId;
        }

        // Filter by conversation
        if (filters.conversationId) {
            query.conversation = filters.conversationId;
        }

        // Filter by date range
        if (filters.dateFrom || filters.dateTo) {
            query.createdAt = {};
            if (filters.dateFrom) {
                query.createdAt.$gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                var endDate = new Date(filters.dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDate;
            }
        }

        // Filter by deleted status
        if (filters.showDeleted === 'true' || filters.showDeleted === true) {
            query.isDeleted = true;
        } else {
            query.isDeleted = false;
        }

        return await Message.countDocuments(query);
    }
}

module.exports = MessageRepository;
