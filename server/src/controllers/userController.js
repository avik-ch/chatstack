const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Search users
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          },
          { id: { not: currentUserId } } // Exclude current user
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isOnline: true,
        lastSeen: true
      },
      take: 20
    });

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check friendship status
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, recipientId: userId },
          { requesterId: userId, recipientId: currentUserId }
        ]
      }
    });

    const userWithFriendship = {
      ...user,
      friendshipStatus: friendship ? friendship.status : null
    };

    res.json(userWithFriendship);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send friend request
const sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user.id;

    if (requesterId === recipientId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if user exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, recipientId },
          { requesterId: recipientId, recipientId: requesterId }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Friendship request already exists' });
    }

    // Create friendship request
    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        recipientId,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        recipient: {
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

    res.status(201).json({
      message: 'Friend request sent successfully',
      friendship
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Respond to friend request
const respondToFriendRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const { status } = req.body; // 'ACCEPTED' or 'REJECTED'
    const currentUserId = req.user.id;

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ACCEPTED or REJECTED' });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        recipientId: currentUserId,
        status: 'PENDING'
      }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        recipient: {
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
      message: `Friend request ${status.toLowerCase()}`,
      friendship: updatedFriendship
    });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get friends list
const getFriends = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUserId },
          { recipientId: currentUserId }
        ],
        status: 'ACCEPTED'
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isOnline: true,
            lastSeen: true
          }
        },
        recipient: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isOnline: true,
            lastSeen: true
          }
        }
      }
    });

    // Extract friends (the other user in each friendship)
    const friends = friendships.map(friendship => {
      return friendship.requesterId === currentUserId 
        ? friendship.recipient 
        : friendship.requester;
    });

    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending friend requests
const getPendingRequests = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const pendingRequests = await prisma.friendship.findMany({
      where: {
        recipientId: currentUserId,
        status: 'PENDING'
      },
      include: {
        requester: {
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

    res.json(pendingRequests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  searchUsers,
  getUserById,
  sendFriendRequest,
  respondToFriendRequest,
  getFriends,
  getPendingRequests
};
