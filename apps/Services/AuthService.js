var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
var jwt = require('jsonwebtoken');
var config = require(global.__basedir + "/Config/Setting.json");

class AuthService {
    userRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    generateToken(userId) {
        return jwt.sign({ id: userId }, config.jwt.secret, {
            expiresIn: config.jwt.expire
        });
    }

    generateTempToken(userId) {
        return jwt.sign(
            { id: userId, temp: true, purpose: '2fa' },
            config.jwt.secret,
            { expiresIn: '10m' }
        );
    }

    verifyToken(token) {
        return jwt.verify(token, config.jwt.secret);
    }

    async register(username, email, password, fullName) {
        var existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            var existingByUsername = await this.userRepository.findByEmailOrUsername(username);
            if (existingByUsername) {
                return { success: false, message: 'User with this email or username already exists' };
            }
        }

        var existing = await this.userRepository.findByEmailOrUsername(email);
        if (existing) {
            return { success: false, message: 'User with this email or username already exists' };
        }

        var user = await this.userRepository.insertUser({
            username: username,
            email: email,
            password: password,
            fullName: fullName || username
        });

        var token = this.generateToken(user._id);
        return { success: true, user: user, token: token };
    }

    async login(identifier) {
        return await this.userRepository.findByEmailOrUsername(identifier);
    }

    async getUserById(id) {
        return await this.userRepository.findById(id);
    }

    async getUserWithFriends(id) {
        return await this.userRepository.findByIdPopulateFriends(id);
    }

    async updateProfile(userId, updateData) {
        return await this.userRepository.updateUser(userId, updateData);
    }

    async updateOnlineStatus(userId, isOnline, lastSeen) {
        var updateData = { isOnline: isOnline };
        if (!isOnline) {
            updateData.lastSeen = lastSeen || Date.now();
        } else {
            updateData.lastSeen = Date.now();
        }
        return await this.userRepository.updateUser(userId, updateData);
    }

    async getUserForGoogleAuth(googleId, email) {
        return await this.userRepository.findByGoogleIdOrEmail(googleId, email);
    }

    async getUserWithTwoFactor(id) {
        return await this.userRepository.findByIdWithTwoFactor(id);
    }

    async getUserWithPassword(id) {
        return await this.userRepository.findByIdWithPassword(id);
    }

    async getUserWithBackupCodes(id) {
        return await this.userRepository.findByIdWithBackupCodes(id);
    }
}

module.exports = AuthService;
