const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get direct messages with a user
router.get('/direct/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        AND: [
          { groupId: null }, // Direct messages only
          {
            OR: [
              {
                authorId: currentUserId,
                recipientId: userId
              },
              {
                authorId: userId,
                recipientId: currentUserId
              }
            ]
          }
        ]
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
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get direct messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group messages
router.get('/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.id;

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: currentUserId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const messages = await prisma.message.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send direct message
router.post('/direct', authenticateToken, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const authorId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if recipient exists and is a friend
    const friendship = await prisma.friendship.findFirst({
      where: {
        AND: [
          {
            OR: [
              {
                requesterId: authorId,
                addresseeId: recipientId
              },
              {
                requesterId: recipientId,
                addresseeId: authorId
              }
            ]
          },
          { status: 'ACCEPTED' }
        ]
      }
    });

    if (!friendship) {
      return res.status(403).json({ error: 'Can only message friends' });
    }

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
        },
        recipient: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send direct message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send group message
router.post('/group', authenticateToken, async (req, res) => {
  try {
    const { groupId, content } = req.body;
    const authorId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: authorId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

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
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat conversations (both direct and groups)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Get groups user is a member of with latest message
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId
          }
        }
      },
      include: {
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
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
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Get direct message conversations
    const directMessages = await prisma.message.findMany({
      where: {
        AND: [
          { groupId: null },
          {
            OR: [
              { authorId: currentUserId },
              { recipientId: currentUserId }
            ]
          }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        recipient: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group direct messages by conversation partner
    const directConversations = [];
    const seenUsers = new Set();
    
    for (const message of directMessages) {
      const partnerId = message.authorId === currentUserId ? message.recipientId : message.authorId;
      
      if (!seenUsers.has(partnerId)) {
        seenUsers.add(partnerId);
        const partner = message.authorId === currentUserId ? message.recipient : message.author;
        directConversations.push({
          type: 'direct',
          id: partnerId,
          partner,
          lastMessage: message
        });
      }
    }

    const conversations = [
      ...groups.map(group => ({
        type: 'group',
        id: group.id,
        name: group.name,
        description: group.description,
        members: group.members,
        lastMessage: group.messages[0] || null
      })),
      ...directConversations
    ];

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
