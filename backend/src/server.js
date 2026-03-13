const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const DatabaseConfig = require('./config/db');
const SocketHandler = require('./config/socket');

// Tải biến môi trường (backend/.env, một cấp trên src/)
dotenv.config({ path: path.join(__dirname, '../.env') });

class AppServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.port = process.env.PORT || 5000;
    this.db = new DatabaseConfig();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocket();
  }

  initializeMiddleware() {
    // Cấu hình CORS
    this.app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Cấu hình Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Cấu hình static files cho uploads (backend/uploads/)
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  }

  initializeRoutes() {
    // Khởi tạo socket handler trước
    this.socketHandler = new SocketHandler(this.io);
    
    // Định nghĩa Routes (Controller layer)
    const authRoutes = require('./routes/authRoutes');
    const userRoutes = require('./routes/userRoutes');
    const messageRoutes = require('./routes/messageRoutes');
    const friendRoutes = require('./routes/friendRoutes');
    const notificationRoutes = require('./routes/notificationRoutes');

    // Truyền socket handler vào friend routes
    const FriendController = require('./controllers/friendController');
    const notificationController = require('./controllers/notificationController');
    const friendController = new FriendController();
    friendController.setSocketHandler(this.socketHandler);
    notificationController.setSocketHandler(this.socketHandler);
    
    // Lưu controller instance để routes sử dụng
    this.app.locals.friendController = friendController;

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/messages', messageRoutes);
    this.app.use('/api/friends', friendRoutes);
    this.app.use('/api/notifications', notificationRoutes);

    // Endpoint kiểm tra sức khỏe
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'Server is running' });
    });

    // Phục vụ React build (View layer) trong production
    const buildPath = path.join(__dirname, '../../views/build');
    this.app.use(express.static(buildPath));

    // SPA fallback: mọi route không phải API → trả về index.html
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }

  initializeSocket() {
    this.socketHandler.initialize();
  }

  async start() {
    try {
      // Kết nối database
      await this.db.connect();

      // Khởi động server
      this.server.listen(this.port, () => {
        console.log(`✅ Server running on port ${this.port}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
      });
    } catch (error) {
      console.error('❌ Server startup error:', error);
      process.exit(1);
    }
  }
}

// Khởi động server
const server = new AppServer();
server.start();

module.exports = AppServer;
