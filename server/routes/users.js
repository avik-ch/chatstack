const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, bio } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        bio
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: req.user.id // Exclude current user
            }
          },
          {
            OR: [
              {
                username: {
                  contains: q,
                  mode: 'insensitive'
                }
              },
              {
                firstName: {
                  contains: q,
                  mode: 'insensitive'
                }
              },
              {
                lastName: {
                  contains: q,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true
      },
      take: 20
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send friend request
router.post('/friend-request', authenticateToken, async (req, res) => {
  try {
    const { addresseeId } = req.body;
    const requesterId = req.user.id;

    if (requesterId === addresseeId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if user exists
    const addressee = await prisma.user.findUnique({
      where: { id: addresseeId }
    });

    if (!addressee) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId,
            addresseeId
          },
          {
            requesterId: addresseeId,
            addresseeId: requesterId
          }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Friendship request already exists' });
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        addressee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({ friendship });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to friend request
router.put('/friend-request/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ACCEPTED or REJECTED
    
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendship.addresseeId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to respond to this request' });
    }

    const updatedFriendship = await prisma.friendship.update({
      where: { id },
      data: { status },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        addressee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({ friendship: updatedFriendship });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        AND: [
          {
            OR: [
              { requesterId: req.user.id },
              { addresseeId: req.user.id }
            ]
          },
          { status: 'ACCEPTED' }
        ]
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            bio: true
          }
        },
        addressee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            bio: true
          }
        }
      }
    });

    const friends = friendships.map(friendship => {
      return friendship.requesterId === req.user.id 
        ? friendship.addressee 
        : friendship.requester;
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending friend requests
router.get('/friend-requests', authenticateToken, async (req, res) => {
  try {
    const friendRequests = await prisma.friendship.findMany({
      where: {
        addresseeId: req.user.id,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            bio: true
          }
        }
      }
    });

    res.json({ friendRequests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
