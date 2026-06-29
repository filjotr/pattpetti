const express = require('express');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Follow/Unfollow
router.post('/:action/:targetId', authMiddleware, async (req, res) => {
  try {
    const { action, targetId } = req.params;
    if (req.user._id.toString() === targetId) 
      return res.status(400).json({ message: "Can't follow yourself" });

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const isFollowing = req.user.following.includes(targetId);

    if (action === 'follow' && !isFollowing) {
      req.user.following.push(targetId);
      target.followers.push(req.user._id);
      
      // Notify
      const notif = new Notification({
        recipient: targetId,
        sender: req.user._id,
        type: 'follow'
      });
      await notif.save();

      const io = req.app.get('io');
      if (io) {
        // Emit if target is online
        io.to(targetId).emit('notification-new', notif);
      }

    } else if (action === 'unfollow' && isFollowing) {
      req.user.following.pull(targetId);
      target.followers.pull(req.user._id);
    }

    await Promise.all([req.user.save(), target.save()]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if following
router.get('/is-following/:userId', authMiddleware, (req, res) => {
  const isFollowing = req.user.following.includes(req.params.userId);
  res.json({ isFollowing });
});

// Get user profile by ID
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -email')
      .populate('favoriteSongs', 'videoId title thumbnail channelTitle');
      
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get followers & following connections
router.get('/connections', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('followers following', 'username avatar googleAvatar');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const map = new Map();
    (user.followers || []).forEach(f => { if (f && f._id) map.set(f._id.toString(), f.toObject()); });
    (user.following || []).forEach(f => { if (f && f._id) map.set(f._id.toString(), f.toObject()); });
    const connections = Array.from(map.values());

    for (const conn of connections) {
      const dmRoom = [req.user._id.toString(), conn._id.toString()].sort().join('_');
      const lastMsg = await Message.findOne({ dmRoom }).sort({ timestamp: -1 }).select('timestamp').lean();
      conn.lastMsgTimestamp = lastMsg && lastMsg.timestamp ? new Date(lastMsg.timestamp).getTime() : 0;
    }
    connections.sort((a, b) => (b.lastMsgTimestamp || 0) - (a.lastMsgTimestamp || 0));

    res.json({ connections });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
