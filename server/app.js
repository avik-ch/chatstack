require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

// CORS configuration for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      "http://localhost:5173", 
      "http://localhost:3000",
      "https://chatstack.vercel.app",
      "https://chatstack-git-main.vercel.app",
      "https://chatstack-*.vercel.app"
    ];

// More permissive CORS for development and testing
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all Vercel domains for now (you can make this more restrictive later)
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Check specific allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        if (origin.includes('vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
});

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);

// Socket.io connection handling
const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  // User joins with their ID
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
  });

  // Handle direct message
  socket.on('send_direct_message', async (data) => {
    try {
      const { recipientId, content } = data;
      const authorId = socket.userId;

      if (!authorId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Create message in database
      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          authorId,
          recipientId
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Send to recipient if online
      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_direct_message', message);
      }

      // Send back to sender
      socket.emit('message_sent', message);

    } catch (error) {
      console.error('Send direct message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('send_group_message', async (data) => {
    try {
      const { groupId, content } = data;
      const authorId = socket.userId;

      if (!authorId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Create message in database
      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          authorId,
          groupId
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Get all group members
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true }
      });

      // Send to all group members who are online
      groupMembers.forEach(member => {
        const memberSocketId = connectedUsers.get(member.userId);
        if (memberSocketId) {
          io.to(memberSocketId).emit('new_group_message', { ...message, groupId });
        }
      });

    } catch (error) {
      console.error('Send group message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
  });
});

app.get("/", (req, res) => {
  res.send("ChatStack Backend is running");
});

// Test endpoint for CORS
app.get("/test", (req, res) => {
  res.json({ 
    message: "CORS test successful", 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin 
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
