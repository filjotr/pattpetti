const express = require('express');
const Song = require('../models/Song');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Helper to get or create song
const getOrCreateSong = async (videoId, title, thumbnail, channel) => {
  let song = await Song.findOne({ videoId });
  if (!song) {
    song = new Song({ videoId, title, thumbnail, channelTitle: channel });
    await song.save();
  }
  return song;
};

// Like/Unlike a song
router.post('/like/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, thumbnail, channel } = req.body;
    
    const song = await getOrCreateSong(videoId, title, thumbnail, channel);
    
    const index = song.likes.indexOf(req.user._id);
    let isLiked = false;

    if (index === -1) {
      song.likes.push(req.user._id);
      req.user.favoriteSongs.push(song._id);
      req.user.stats.songsLiked += 1;
      isLiked = true;
    } else {
      song.likes.splice(index, 1);
      req.user.favoriteSongs.pull(song._id);
      req.user.stats.songsLiked = Math.max(0, req.user.stats.songsLiked - 1);
    }

    await Promise.all([song.save(), req.user.save()]);
    res.json({ success: true, isLiked, count: song.likes.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get likes & comments count
router.get('/:videoId/likes', async (req, res) => {
  try {
    const song = await Song.findOne({ videoId: req.params.videoId });
    res.json({ 
      count: song ? song.likes.length : 0,
      commentCount: song ? song.comments.length : 0 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:videoId/comments', authMiddleware, async (req, res) => {
  try {
    const { text, title, thumbnail, channel } = req.body;
    const song = await getOrCreateSong(req.params.videoId, title, thumbnail, channel);

    const comment = { user: req.user._id, text };
    song.comments.push(comment);
    await song.save();

    // Re-fetch to populate user
    const savedSong = await Song.findById(song._id).populate('comments.user', 'username avatar');
    const savedComment = savedSong.comments[savedSong.comments.length - 1];

    // Emit via global socket if io is available
    const io = req.app.get('io');
    if (io) {
      io.emit(`song-comment-${song.videoId}`, savedComment);
    }

    res.status(201).json({ comment: savedComment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments
router.get('/:videoId/comments', async (req, res) => {
  try {
    const song = await Song.findOne({ videoId: req.params.videoId })
      .populate('comments.user', 'username avatar');
    res.json({ comments: song ? song.comments : [] });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
