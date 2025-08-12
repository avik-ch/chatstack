const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const creatorId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        members: {
          create: {
            userId: creatorId,
            role: 'ADMIN'
          }
        }
      },
      include: {
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

    res.status(201).json({ group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: req.user.id
          }
        }
      },
      include: {
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
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                bio: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to group
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if current user is an admin of the group
    const currentMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: req.user.id,
        role: 'ADMIN'
      }
    });

    if (!currentMembership) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    // Check if user to be added exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    const newMember = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId,
        role: 'MEMBER'
      },
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
    });

    res.status(201).json({ member: newMember });
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from group
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if current user is an admin of the group or removing themselves
    const currentMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: req.user.id
      }
    });

    if (!currentMembership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    if (currentMembership.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Only group admins can remove other members' });
    }

    // Check if member exists
    const memberToRemove = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId
      }
    });

    if (!memberToRemove) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    await prisma.groupMember.delete({
      where: {
        id: memberToRemove.id
      }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update group details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if current user is an admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: req.user.id,
        role: 'ADMIN'
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only group admins can update group details' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null
      },
      include: {
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

    res.json({ group: updatedGroup });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave group
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this group' });
    }

    await prisma.groupMember.delete({
      where: {
        id: membership.id
      }
    });

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
