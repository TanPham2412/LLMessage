var jwt = require('jsonwebtoken');
var User = require(global.__basedir + "/apps/Entity/User");
var config = require(global.__basedir + "/Config/Setting.json");

class AuthMiddleware {
    constructor() {

    }

    async authenticate(req, res, next) {
        try {
            var token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided'
                });
            }

            var decoded = jwt.verify(token, config.jwt.secret);

            var user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            req.user = { id: user._id, role: user.role };
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    }

    isAdmin(req, res, next) {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }
    }
}

var authMiddleware = new AuthMiddleware();

module.exports = {
    authenticate: authMiddleware.authenticate.bind(authMiddleware),
    isAdmin: authMiddleware.isAdmin.bind(authMiddleware)
};
