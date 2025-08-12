require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
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
  console.log('User connected:', socket.id);

  // User joins with their ID
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} joined with socket ${socket.id}`);
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
    console.log(`User ${socket.userId} joined group ${groupId}`);
  });

  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`User ${socket.userId} left group ${groupId}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

app.get("/", (req, res) => {
  res.send("ChatStack Backend is running");
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
