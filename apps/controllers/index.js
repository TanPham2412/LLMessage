var express = require("express");
var router = express.Router();

router.use("/api/auth", require(__dirname + "/authcontroller"));
router.use("/api/users", require(__dirname + "/usercontroller"));
router.use("/api/messages", require(__dirname + "/messagecontroller"));
router.use("/api/friends", require(__dirname + "/friendcontroller"));
router.use("/api/notifications", require(__dirname + "/notificationcontroller"));

router.get("/api/health", function(req, res) {
    res.json({ status: 'OK', message: 'Server is running' });
});

module.exports = router;
