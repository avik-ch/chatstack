const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
    this.groupMembers = new Map(); // groupId -> Set of userIds
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on("connection", async (socket) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          socket.disconnect();
          return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        });

        if (!user) {
          socket.disconnect();
          return;
        }

        // Store socket mappings
        this.userSockets.set(user.id, socket.id);
        this.socketUsers.set(socket.id, user.id);

        await prisma.user.update({
          where: { id: user.id },
          data: { isOnline: true, lastSeen: new Date() },
        });

        await this.joinUserToGroups(socket, user.id);

        this.emitUserStatusToFriends(user.id, true);

        console.log(`User ${user.username} connected: ${socket.id}`);

        // Handle joining specific group
        socket.on("join-group", async (groupId) => {
          await this.handleJoinGroup(socket, user.id, groupId);
        });

        // Handle leaving group
        socket.on("leave-group", async (groupId) => {
          await this.handleLeaveGroup(socket, user.id, groupId);
        });

        // starts/stops typing
        socket.on("typing-start", (groupId) => {
          this.handleTypingStart(socket, user, groupId);
        });

        socket.on("typing-stop", (groupId) => {
          this.handleTypingStop(socket, user, groupId);
        });

        // Handle new message
        socket.on("send-message", async (data) => {
          await this.handleNewMessage(socket, user, data);
        });

        // Handle message edit
        socket.on("edit-message", async (data) => {
          await this.handleEditMessage(socket, user, data);
        });

        // Handle message delete
        socket.on("delete-message", async (data) => {
          await this.handleDeleteMessage(socket, user, data);
        });

        // Handle disconnect
        socket.on("disconnect", async () => {
          await this.handleDisconnect(socket, user.id);
        });
      } catch (error) {
        console.error("Socket connection error:", error);
        socket.disconnect();
      }
    });
  }

  async joinUserToGroups(socket, userId) {
    try {
      const userGroups = await prisma.group.findMany({
        where: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
        select: { id: true },
      });

      userGroups.forEach((group) => {
        socket.join(`group-${group.id}`);

        // Track group members
        if (!this.groupMembers.has(group.id)) {
          this.groupMembers.set(group.id, new Set());
        }
        this.groupMembers.get(group.id).add(userId);
      });
    } catch (error) {
      console.error("Error joining user to groups:", error);
    }
  }

  async handleJoinGroup(socket, userId, groupId) {
    try {
      // Verify user is member of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
      });

      if (membership) {
        socket.join(`group-${groupId}`);

        if (!this.groupMembers.has(groupId)) {
          this.groupMembers.set(groupId, new Set());
        }
        this.groupMembers.get(groupId).add(userId);

        socket.emit("joined-group", { groupId });
      }
    } catch (error) {
      console.error("Error joining group:", error);
    }
  }

  async handleLeaveGroup(socket, userId, groupId) {
    try {
      socket.leave(`group-${groupId}`);

      if (this.groupMembers.has(groupId)) {
        this.groupMembers.get(groupId).delete(userId);
      }

      socket.emit("left-group", { groupId });
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  }

  handleTypingStart(socket, user, groupId) {
    socket.to(`group-${groupId}`).emit("user-typing", {
      groupId,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  }

  handleTypingStop(socket, user, groupId) {
    socket.to(`group-${groupId}`).emit("user-stop-typing", {
      groupId,
      userId: user.id,
    });
  }

  async handleNewMessage(socket, user, data) {
    try {
      const { groupId, content, imageUrl } = data;

      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId,
          },
        },
      });

      if (!membership) {
        socket.emit("error", { message: "Not a member of this group" });
        return;
      }

      // Create message in database
      const message = await prisma.message.create({
        data: {
          content: content?.trim(),
          imageUrl,
          senderId: user.id,
          groupId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      // Update group's updatedAt timestamp
      await prisma.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });

      // Emit message to all group members
      this.io.to(`group-${groupId}`).emit("new-message", {
        groupId,
        message,
      });

      // Emit to sender for confirmation
      socket.emit("message-sent", {
        groupId,
        message,
      });
    } catch (error) {
      console.error("Error handling new message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  async handleEditMessage(socket, user, data) {
    try {
      const { messageId, content } = data;

      // Find and verify message ownership
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      if (message.senderId !== user.id) {
        socket.emit("error", { message: "Cannot edit this message" });
        return;
      }

      // Update message
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          content: content.trim(),
          updatedAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      // Emit to all group members
      this.io.to(`group-${message.groupId}`).emit("message-edited", {
        groupId: message.groupId,
        message: updatedMessage,
      });
    } catch (error) {
      console.error("Error handling message edit:", error);
      socket.emit("error", { message: "Failed to edit message" });
    }
  }

  async handleDeleteMessage(socket, user, data) {
    try {
      const { messageId } = data;

      // Find message and check permissions
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          group: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      const isSender = message.senderId === user.id;
      const isAdmin =
        message.group?.members[0]?.role === "ADMIN" ||
        message.group?.members[0]?.role === "MODERATOR";

      if (!isSender && !isAdmin) {
        socket.emit("error", { message: "Cannot delete this message" });
        return;
      }

      // Delete message
      await prisma.message.delete({
        where: { id: messageId },
      });

      // Emit to all group members
      this.io.to(`group-${message.groupId}`).emit("message-deleted", {
        groupId: message.groupId,
        messageId,
      });
    } catch (error) {
      console.error("Error handling message delete:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  }

  async handleDisconnect(socket, userId) {
    try {
      // Update user offline status
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });

      // Remove socket mappings
      this.userSockets.delete(userId);
      this.socketUsers.delete(socket.id);

      // Remove user from group tracking
      this.groupMembers.forEach((members, groupId) => {
        members.delete(userId);
      });

      // Emit user offline status to friends
      this.emitUserStatusToFriends(userId, false);

      console.log(`User ${userId} disconnected: ${socket.id}`);
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  }

  async emitUserStatusToFriends(userId, isOnline) {
    try {
      // Get user's friends
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ requesterId: userId }, { recipientId: userId }],
          status: "ACCEPTED",
        },
      });

      const friendIds = friendships.map((friendship) =>
        friendship.requesterId === userId
          ? friendship.recipientId
          : friendship.requesterId
      );

      // Emit status to online friends
      friendIds.forEach((friendId) => {
        const friendSocketId = this.userSockets.get(friendId);
        if (friendSocketId) {
          this.io.to(friendSocketId).emit("friend-status-change", {
            userId,
            isOnline,
          });
        }
      });
    } catch (error) {
      console.error("Error emitting user status:", error);
    }
  }

  // Public method to emit events from other parts of the app
  emitToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  emitToGroup(groupId, event, data) {
    this.io.to(`group-${groupId}`).emit(event, data);
  }

  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }
}

module.exports = SocketService;
