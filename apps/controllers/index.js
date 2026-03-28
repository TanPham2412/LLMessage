var express = require("express");

class IndexController {
    router;

    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.use("/api/auth", require(__dirname + "/authcontroller"));
        this.router.use("/api/users", require(__dirname + "/usercontroller"));
        this.router.use("/api/messages", require(__dirname + "/messagecontroller"));
        this.router.use("/api/friends", require(__dirname + "/friendcontroller"));
        this.router.use("/api/notifications", require(__dirname + "/notificationcontroller"));

        this.router.get("/api/health", function(req, res) {
            res.json({ status: 'OK', message: 'Server is running' });
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new IndexController().getRouter();
