class WarningService {
    constructor(userRepository, notificationRepository) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    // Map violation reasons to Vietnamese display text
    violationReasonMap = {
        'violence': 'Nội dung bạo lực/xúc phạm',
        'spam': 'Spam/nhiễu',
        'explicit': 'Nội dung khiêu dâm',
        'scam': 'Lừa đảo/scam',
        'copyright': 'Nội dung vi phạm bản quyền'
    };

    async sendWarning(userId, messageId, reason, adminId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return { success: false, message: 'Người dùng không tìm thấy' };
            }

            // Tăng số lần cảnh báo
            user.warnings += 1;

            // Thêm vào lịch sử vi phạm
            user.violationHistory.push({
                reason: reason,
                messageId: messageId,
                adminId: adminId,
                warnedAt: new Date()
            });

            // Nếu cảnh báo 3 lần, khóa tài khoản
            if (user.warnings >= 3) {
                user.accountStatus = 'locked';
                user.warningLockedAt = new Date();
            }

            await user.save();

            // Tạo thông báo cho người dùng
            const warningMessage = this.buildWarningMessage(user.warnings, reason);
            await this.notificationRepository.create({
                recipient: userId,
                sender: adminId,
                title: 'Cảnh báo vi phạm tiêu chuẩn cộng đồng',
                message: warningMessage,
                type: 'warning',
                data: {
                    messageId: messageId,
                    reason: reason
                }
            });

            return {
                success: true,
                message: 'Cảnh báo đã được gửi',
                data: {
                    userId: user._id,
                    warningCount: user.warnings,
                    accountStatus: user.accountStatus
                }
            };
        } catch (error) {
            console.error('Error sending warning:', error);
            return { success: false, message: error.message || 'Lỗi khi gửi cảnh báo' };
        }
    }

    buildWarningMessage(warningCount, reason) {
        const reasonText = this.violationReasonMap[reason] || 'Vi phạm tiêu chuẩn cộng đồng';
        const remainingWarnings = 3 - warningCount;

        let message = `Bạn đã nhận được cảnh báo vì: ${reasonText}\n\n`;
        message += `Đây là lần cảnh báo thứ ${warningCount} của bạn.\n\n`;

        if (remainingWarnings > 0) {
            message += `⚠️ Nếu bạn tiếp tục vi phạm ${remainingWarnings} lần nữa, tài khoản của bạn sẽ bị khóa.\n\n`;
        } else {
            message += `❌ Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin để sơ lược.\n\n`;
        }

        message += 'Vui lòng tuân thủ tiêu chuẩn cộng đồng của chúng tôi.';

        return message;
    }

    async lockAccount(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return { success: false, message: 'Người dùng không tìm thấy' };
            }

            user.accountStatus = 'locked';
            user.warningLockedAt = new Date();
            await user.save();

            // Tạo thông báo cho người dùng
            await this.notificationRepository.create({
                recipient: userId,
                sender: null,
                title: 'Tài khoản bị khóa',
                message: 'Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng. Vui lòng liên hệ admin để sơ lược.',
                type: 'error',
                data: {}
            });

            return {
                success: true,
                message: 'Tài khoản đã được khóa',
                data: { userId, accountStatus: 'locked' }
            };
        } catch (error) {
            console.error('Error locking account:', error);
            return { success: false, message: error.message };
        }
    }

    async deleteAccount(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return { success: false, message: 'Người dùng không tìm thấy' };
            }

            user.accountStatus = 'deleted';
            user.email = `deleted_${Date.now()}_${user.email}`; // Vô hiệu hóa email
            user.username = `deleted_${Date.now()}_${user.username}`;
            await user.save();

            return {
                success: true,
                message: 'Tài khoản đã được xóa',
                data: { userId, accountStatus: 'deleted' }
            };
        } catch (error) {
            console.error('Error deleting account:', error);
            return { success: false, message: error.message };
        }
    }

    async resetWarnings(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return { success: false, message: 'Người dùng không tìm thấy' };
            }

            user.warnings = 0;
            user.accountStatus = 'active';
            user.warningLockedAt = null;
            user.violationHistory = [];
            await user.save();

            return {
                success: true,
                message: 'Cảnh báo đã được đặt lại',
                data: { userId, warnings: 0, accountStatus: 'active' }
            };
        } catch (error) {
            console.error('Error resetting warnings:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = WarningService;
