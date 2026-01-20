const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const DatabaseConfig = require('./config/db');
const SocketHandler = require('./config/socket');

// Load environment variables
dotenv.config();

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
    // CORS
    this.app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files for uploads
    this.app.use('/uploads', express.static('uploads'));
  }

  initializeRoutes() {
    // Initialize socket handler first
    this.socketHandler = new SocketHandler(this.io);
    
    // Routes
    const authRoutes = require('./routes/authRoutes');
    const userRoutes = require('./routes/userRoutes');
    const messageRoutes = require('./routes/messageRoutes');
    const friendRoutes = require('./routes/friendRoutes');
    const notificationRoutes = require('./routes/notificationRoutes');

    // Inject socket handler into friend routes
    const FriendController = require('./controllers/friendController');
    const friendController = new FriendController();
    friendController.setSocketHandler(this.socketHandler);
    
    // Store controller instance for routes to use
    this.app.locals.friendController = friendController;

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/messages', messageRoutes);
    this.app.use('/api/friends', friendRoutes);
    this.app.use('/api/notifications', notificationRoutes);

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'Server is running' });
    });
  }

  initializeSocket() {
    this.socketHandler.initialize();
  }

  async start() {
    try {
      // Connect to database
      await this.db.connect();

      // Start server
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

// Start the server
const server = new AppServer();
server.start();

module.exports = AppServer;
