const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Send message to group
const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;
    const imageUrl = req.file?.path;

    if (!content && !imageUrl) {
      return res.status(400).json({ error: 'Message content or image is required' });
    }

    // Check if user is member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: senderId,
          groupId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied. Not a member of this group.' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content?.trim(),
        imageUrl,
        senderId,
        groupId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Update group's updatedAt timestamp
    await prisma.group.update({
      where: { id: groupId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get group messages
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Check if user is member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: currentUserId,
          groupId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied. Not a member of this group.' });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { groupId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum
    });

    // Get total count
    const totalMessages = await prisma.message.count({
      where: { groupId }
    });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalMessages / limitNum),
        totalMessages,
        hasNext: pageNum * limitNum < totalMessages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    // Find message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        group: {
          include: {
            members: {
              where: { userId: currentUserId }
            }
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender or has admin/moderator privileges
    const isSender = message.senderId === currentUserId;
    const isAdmin = message.group?.members[0]?.role === 'ADMIN' || message.group?.members[0]?.role === 'MODERATOR';

    if (!isSender && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. Cannot delete this message.' });
    }

    // Delete message
    await prisma.message.delete({
      where: { id: messageId }
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Edit message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Find message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender
    if (message.senderId !== currentUserId) {
      return res.status(403).json({ error: 'Access denied. Can only edit your own messages.' });
    }

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      message: 'Message updated successfully',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get recent messages for user's groups
const getRecentMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { limit = 10 } = req.query;

    // Get user's groups
    const userGroups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId
          }
        }
      },
      include: {
        messages: {
          take: parseInt(limit),
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    // Format response
    const groupsWithRecentMessages = userGroups.map(group => ({
      group: {
        id: group.id,
        name: group.name,
        avatar: group.avatar,
        description: group.description
      },
      recentMessages: group.messages.reverse(), // Return in chronological order
      totalMessages: group._count.messages
    }));

    res.json(groupsWithRecentMessages);
  } catch (error) {
    console.error('Get recent messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  sendGroupMessage,
  getGroupMessages,
  deleteMessage,
  editMessage,
  getRecentMessages
};
