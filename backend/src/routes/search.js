const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });

    // Simple regex search on username
    const regex = new RegExp(q, 'i');
    const users = await User.find({ username: regex })
      .select('username bio avatar')
      .limit(15);
      
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
