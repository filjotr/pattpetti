const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get Admin Stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, activeRooms, messages, allUsers] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Message.countDocuments(),
      User.find()
    ]);

    const songsLiked = allUsers.reduce((sum, u) => sum + (u.stats?.songsLiked || 0), 0);

    res.json({
      stats: { totalUsers, activeRooms, totalMessages: messages, songsLiked }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List Users for Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle Ban
router.put('/users/:id/ban', async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) 
      return res.status(400).json({ message: "Can't ban yourself" });
    
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    target.isBanned = !target.isBanned;
    await target.save();
    res.json({ success: true, isBanned: target.isBanned });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle Admin Status
router.put('/users/:id/promote', async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) 
      return res.status(400).json({ message: "Can't demote yourself" });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    target.isAdmin = !target.isAdmin;
    await target.save();
    res.json({ success: true, isAdmin: target.isAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
