require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

// Import routes
const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/users");
const groupRoutes = require("./src/routes/groups");
const messageRoutes = require("./src/routes/messages");

// Import Socket.IO service
const SocketService = require("./src/services/socketService");

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5713', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "ChatStack Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users", 
      groups: "/api/groups",
      messages: "/api/messages"
    }
  });
});

// 404 handler - using proper catch-all pattern
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:5713', 'http://localhost:3000'],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize Socket.IO service
const socketService = new SocketService(io);

// Make socket service available globally
global.socketService = socketService;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`ChatStack Backend Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for real-time messaging`);
});
