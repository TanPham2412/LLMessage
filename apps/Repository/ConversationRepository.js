var Conversation = require(global.__basedir + "/apps/Entity/Conversation");

class ConversationRepository {
    constructor() {

    }

    async findById(id) {
        return await Conversation.findById(id);
    }

    async findByIdPopulate(id) {
        return await Conversation.findById(id)
            .populate('participants', 'username fullName avatar isOnline lastSeen')
            .populate('lastMessage');
    }

    async insertConversation(conversationData) {
        return await Conversation.create(conversationData);
    }

    async updateConversation(id, updateData) {
        return await Conversation.findByIdAndUpdate(id, updateData, { new: true });
    }

    async findPrivateConversation(userId1, userId2) {
        return await Conversation.findOne({
            participants: { $all: [userId1, userId2] },
            type: 'private'
        });
    }

    async getUserConversations(userId) {
        return await Conversation.find({
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
            .populate('nicknames.target', '_id')
            .sort({ lastMessageAt: -1 });
    }

    async getUserConversationIds(userId) {
        return await Conversation.find({
            participants: userId
        }).select('_id');
    }

    async findByIdPopulateNicknames(id) {
        return await Conversation.findById(id)
            .populate('nicknames.setter', 'username fullName avatar')
            .populate('nicknames.target', 'username fullName avatar');
    }
}

module.exports = ConversationRepository;
