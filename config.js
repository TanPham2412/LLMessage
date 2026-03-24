/**
 * Configuration Module
 * Loads configuration from environment variables with fallbacks
 * Never commit actual secrets to version control!
 */

function getConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    return {
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/LLMessage'
        },
        jwt: {
            secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production',
            expire: process.env.JWT_EXPIRE || '7d'
        },
        server: {
            port: parseInt(process.env.PORT || '5000'),
            clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
            env: env
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || ''
        }
    };
}

function validateConfig(config) {
    const errors = [];
    
    if (process.env.NODE_ENV === 'production') {
        if (!config.jwt.secret || config.jwt.secret === 'your_jwt_secret_key_change_this_in_production') {
            errors.push('JWT_SECRET must be set in production');
        }
        if (!config.google.clientId) {
            errors.push('GOOGLE_CLIENT_ID must be set in production');
        }
        if (!config.mongodb.uri || config.mongodb.uri.includes('localhost')) {
            errors.push('MongoDB URI must point to a remote database in production');
        }
    }
    
    return errors;
}

const config = getConfig();
const validationErrors = validateConfig(config);

if (validationErrors.length > 0) {
    console.warn('Configuration warnings:');
    validationErrors.forEach(err => console.warn('  - ' + err));
}

module.exports = config;
