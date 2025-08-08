const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.user.id;
    const avatar = req.file?.path;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create group with creator as admin
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        avatar,
        creatorId,
        members: {
          create: {
            userId: creatorId,
            role: 'ADMIN'
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // Add additional members if provided
    if (memberIds && memberIds.length > 0) {
      const memberData = memberIds.map(userId => ({
        userId,
        groupId: group.id,
        role: 'MEMBER'
      }));

      await prisma.groupMember.createMany({
        data: memberData,
        skipDuplicates: true
      });

      // Fetch updated group with all members
      const updatedGroup = await prisma.group.findUnique({
        where: { id: group.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            }
          }
        }
      });

      return res.status(201).json({
        message: 'Group created successfully',
        group: updatedGroup
      });
    }

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all groups for current user
const getUserGroups = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json(groups);
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get group by ID
const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.id;

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

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update group
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const currentUserId = req.user.id;
    const avatar = req.file?.path;

    // Check if user is admin or creator
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: currentUserId,
          groupId
        }
      }
    });

    if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')) {
      return res.status(403).json({ error: 'Access denied. Admin or moderator privileges required.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (avatar) updateData.avatar = avatar;

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true
              }
            }
          }
        }
      }
    });

    res.json({
      message: 'Group updated successfully',
      group
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add member to group
const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, role = 'MEMBER' } = req.body;
    const currentUserId = req.user.id;

    // Check if current user is admin or moderator
    const currentMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: currentUserId,
          groupId
        }
      }
    });

    if (!currentMembership || (currentMembership.role !== 'ADMIN' && currentMembership.role !== 'MODERATOR')) {
      return res.status(403).json({ error: 'Access denied. Admin or moderator privileges required.' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Add member
    const membership = await prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role
      },
      include: {
        user: {
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
      message: 'Member added successfully',
      membership
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove member from group
const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user.id;

    // Check if current user is admin
    const currentMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: currentUserId,
          groupId
        }
      }
    });

    if (!currentMembership || currentMembership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Check if trying to remove the creator
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (group.creatorId === userId) {
      return res.status(400).json({ error: 'Cannot remove the group creator' });
    }

    // Remove member
    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Leave group
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.id;

    // Check if user is the creator
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (group.creatorId === currentUserId) {
      return res.status(400).json({ error: 'Group creator cannot leave. Transfer ownership or delete the group.' });
    }

    // Remove membership
    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: currentUserId,
          groupId
        }
      }
    });

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  addMember,
  removeMember,
  leaveGroup
};
