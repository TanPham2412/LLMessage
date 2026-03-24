/**
 * Input Validation Utilities
 * Helper functions for validating request data
 */

const ValidationUtils = {
    /**
     * Validate email format
     */
    isValidEmail: function(email) {
        var emailRegex = /^\S+@\S+\.\S+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate password strength
     */
    isValidPassword: function(password) {
        // Minimum 6 characters
        return password && password.length >= 6;
    },

    /**
     * Validate username format
     */
    isValidUsername: function(username) {
        // 3-30 characters, alphanumeric and underscore
        var usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        return usernameRegex.test(username);
    },

    /**
     * Validate MongoDB ObjectId
     */
    isValidObjectId: function(id) {
        return /^[0-9a-fA-F]{24}$/.test(id);
    },

    /**
     * Trim and validate string
     */
    validateString: function(str, minLength, maxLength) {
        if (typeof str !== 'string') return false;
        var trimmed = str.trim();
        if (minLength && trimmed.length < minLength) return false;
        if (maxLength && trimmed.length > maxLength) return false;
        return true;
    },

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeInput: function(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
};

module.exports = ValidationUtils;
