const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getGuestUser = async () => {
  let guest = await User.findOne({ username: 'Guest' });
  if (!guest) {
    guest = await User.create({
      username: 'Guest',
      email: 'guest@listentogether.local',
      password: '',
      isGuest: true,
    });
  }
  return guest;
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader === 'Bearer null' || authHeader === 'Bearer undefined') {
      req.user = await getGuestUser();
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      req.user = await getGuestUser();
      return next();
    }
    if (user.isBanned) return res.status(403).json({ message: 'Account banned' });

    req.user = user;
    next();
  } catch (err) {
    req.user = await getGuestUser();
    next();
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user?.isAdmin)
    return res.status(403).json({ message: 'Admin access required' });
  next();
};

module.exports = { authMiddleware, adminMiddleware, getGuestUser };
