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
    async searchByContent(conversationId, query) {
        return await Message.find({
            conversation: conversationId,
            isDeleted: false,
            type: 'text',
            content: { $regex: query, $options: 'i' }
        })
            .populate('sender', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .limit(50);
    }
}

module.exports = MessageRepository;
