const express = require('express');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('master_admin', 'admin'));

router.get('/', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'master_admin' } }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      users: users.map((user) => user.toSafeObject()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only master admin can create users',
      });
    }

    const { email, password, role } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const nextRole = role === 'admin' ? 'admin' : 'volunteer';

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (String(password).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const user = new User({
      email: normalizedEmail,
      password: String(password).trim(),
      role: nextRole,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
});

router.patch('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'volunteer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin or volunteer',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Master admin role cannot be changed',
      });
    }

    if (req.user.role === 'admin') {
      if (role !== 'admin' || user.role !== 'volunteer') {
        return res.status(403).json({
          success: false,
          message: 'Admin can only promote volunteer to admin',
        });
      }
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only master admin can remove users',
      });
    }

    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Master admin cannot be removed',
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'User removed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove user',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
});

module.exports = router;
