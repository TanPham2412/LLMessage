var express = require("express");
var app = express();
var http = require('http');
var path = require('path');
var fs = require('fs');
var cors = require('cors');

global.__basedir = __dirname;

var config = require(__dirname + "/Config/Setting.json");
var DatabaseConnection = require(__dirname + "/apps/Database/Database");
var { Server } = require('socket.io');

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
    origin: config.server.clientUrl,
    credentials: true
}));

// Static files cho uploads
app.use('/uploads', express.static(__dirname + '/uploads'));

// HTTP server và Socket.IO
var server = http.createServer(app);
var io = new Server(server, {
    cors: {
        origin: config.server.clientUrl,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Socket handler
var SocketHandler = require(__dirname + "/apps/Socket/SocketHandler");
var socketHandler = new SocketHandler(io);

// Controller (routes)
var controller = require(__dirname + "/apps/controllers");
app.use(controller);

// Set socketHandler cho message và friend controllers
var messageController = require(__dirname + "/apps/controllers/messagecontroller");
var friendController = require(__dirname + "/apps/controllers/friendcontroller");
var notificationController = require(__dirname + "/apps/controllers/notificationcontroller");

messageController.setSocketHandler(socketHandler);
friendController.setSocketHandler(socketHandler);
notificationController.setSocketHandler(socketHandler);

// Route tải file
app.get('/api/files/download/:filename', async function(req, res) {
    try {
        var filename = path.basename(req.params.filename);
        var filePath = path.join(__dirname, 'uploads', filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        var Message = require(__dirname + '/apps/Entity/Message');
        var msg = await Message.findOne({ fileUrl: '/uploads/' + filename }).select('fileName');
        var originalName = (msg && msg.fileName) ? msg.fileName : filename;
        res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(originalName));
        res.sendFile(filePath);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ success: false, message: 'Download failed' });
    }
});

// SPA fallback (production)
var buildPath = path.join(__dirname, 'apps/views/build');
app.use(express.static(buildPath));
app.get('*', function(req, res) {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// Kết nối database và khởi động server
async function startServer() {
    try {
        await DatabaseConnection.connect();
        socketHandler.initialize();

        server.listen(config.server.port, function() {
            console.log("Server is running on port " + config.server.port);
        });
    } catch (error) {
        console.error("Server startup error:", error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
