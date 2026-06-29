const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Create Room
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, isPrivate, password } = req.body;
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = Room.generateCode();
      const existing = await Room.findOne({ code });
      if (!existing) isUnique = true;
    }

    const room = new Room({
      name, code, isPrivate, password,
      host: req.user._id,
      members: [{ user: req.user._id, role: 'host' }]
    });

    await room.save();
    
    // Update stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.roomsCreated': 1 } });

    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Join Room Check
router.post('/join/:code', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.isPrivate) {
      const { password } = req.body;
      if (room.password && room.password !== password) {
        return res.status(401).json({ message: 'Incorrect password' });
      }
    }

    // Add member if not already there
    const isMember = room.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      room.members.push({ user: req.user._id, role: 'member' });
      await room.save();
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.roomsJoined': 1 } });
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List Public Rooms
router.get('/public', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('host', 'username')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Room
router.delete('/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    await Room.deleteOne({ _id: room._id });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
