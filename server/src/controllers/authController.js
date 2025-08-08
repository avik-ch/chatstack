const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate a random salt
const generateSalt = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash password with provided salt
const hashPassword = async (password, salt) => {
  return await bcrypt.hash(password + salt, 12);
};

// Verify password with salt
const verifyPassword = async (password, salt, hashedPassword) => {
  return await bcrypt.compare(password + salt, hashedPassword);
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or username already exists'
      });
    }

    // Generate unique salt for this user
    const salt = generateSalt();
    
    // Hash password with the salt
    const hashedPassword = await hashPassword(password, salt);

    // Create user with salt
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        salt,
        firstName,
        lastName
      },
      select: {
        id: true,
        email: true,
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

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with salt
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with salt
    const isPasswordValid = await verifyPassword(password, user.salt, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, salt: __, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
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

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio } = req.body;
    const avatar = req.file?.path;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
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

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get user with salt
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.salt, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Generate new salt and hash new password
    const newSalt = generateSalt();
    const newHashedPassword = await hashPassword(newPassword, newSalt);

    // Update password and salt
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: newHashedPassword,
        salt: newSalt
      }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isOnline: false, lastSeen: new Date() }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
};
