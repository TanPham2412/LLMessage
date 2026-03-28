var dotenv = require('dotenv');
dotenv.config();

var config = {
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/LLMessage'
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expire: process.env.JWT_EXPIRE || '7d'
    },
    server: {
        port: process.env.PORT || 5000,
        clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
        env: process.env.NODE_ENV || 'development'
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID
    }
};

if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
}

if (!config.google.clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
}

module.exports = config;
