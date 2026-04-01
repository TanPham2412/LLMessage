var User = require(global.__basedir + "/apps/Entity/User");

class UserRepository {
    constructor() {

    }

    async findById(id) {
        return await User.findById(id);
    }

    async findByIdWithPassword(id) {
        return await User.findById(id).select('+password');
    }

    async findByIdWithTwoFactor(id) {
        return await User.findById(id).select('+twoFactorSecret +twoFactorBackupCodes');
    }

    async findByEmail(email) {
        return await User.findOne({ email: email });
    }

    async findByEmailOrUsername(identifier) {
        return await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        }).select('+password');
    }

    async findByGoogleIdOrEmail(googleId, email) {
        return await User.findOne({
            $or: [{ googleId: googleId }, { email: email }]
        });
    }

    async insertUser(userData) {
        // Ensure authProvider is set to local for email/password registrations
        if (!userData.authProvider) {
            userData.authProvider = 'local';
        }
        const user = await User.create(userData);
        if (!user) {
            throw new Error('Failed to create user');
        }
        return user;
    }

    async updateUser(id, updateData) {
        return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }

    async deleteUser(id) {
        return await User.findByIdAndDelete(id);
    }

    async getUserList(query, skip, take, sortBy) {
        var sort = sortBy || { username: 1 };
        return await User.find(query)
            .select('username fullName avatar isOnline lastSeen bio')
            .limit(take)
            .skip(skip)
            .sort(sort);
    }

    async countUsers(query) {
        return await User.countDocuments(query);
    }

    async searchUsers(searchQuery, currentUserId, limit) {
        return await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { username: { $regex: searchQuery, $options: 'i' } },
                { fullName: { $regex: searchQuery, $options: 'i' } }
            ]
        })
            .select('username fullName avatar isOnline')
            .limit(limit || 10);
    }

    async getOnlineUsers() {
        return await User.find({ isOnline: true })
            .select('username fullName avatar isOnline');
    }

    async findByIdPopulateFriends(id) {
        return await User.findById(id)
            .populate('friends', 'username fullName avatar isOnline lastSeen')
            .populate('friendRequests.from', 'username fullName avatar');
    }

    async findByIdPopulateFriendRequests(id) {
        return await User.findById(id)
            .populate('friendRequests.from', 'username fullName avatar isOnline');
    }

    async findByIdPopulateFriendsList(id) {
        return await User.findById(id)
            .populate('friends', 'username fullName avatar isOnline lastSeen');
    }

    async findByIdPopulateBlocked(id) {
        return await User.findById(id)
            .populate('blockedUsers', 'username fullName avatar');
    }

    async findByIdPopulateRestricted(id) {
        return await User.findById(id)
            .populate('restrictedUsers', 'username fullName avatar');
    }

    async findByIdSelectFields(id, fields) {
        return await User.findById(id).select(fields);
    }

    async findUsersWhoRestricted(userId) {
        return await User.find({ restrictedUsers: userId }).select('_id');
    }

    async findUsersWhoBlocked(userId) {
        return await User.find({ blockedUsers: userId }).select('_id');
    }

    async findAdmins() {
        return await User.find({ role: 'admin' }).select('_id');
    }

    async findByIdWithBackupCodes(id) {
        return await User.findById(id).select('+twoFactorBackupCodes');
    }
}

module.exports = UserRepository;
