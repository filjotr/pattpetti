const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  videoId:      { type: String, required: true, unique: true },
  title:        { type: String, required: true },
  channelTitle: { type: String, default: '' },
  thumbnail:    { type: String, default: '' },
  duration:     { type: String, default: '' },
  category:     { type: String, default: 'Other' },
  hashtags:     [{ type: String }],

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  comments: [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text:      { type: String, required: true, maxlength: 300 },
    createdAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', songSchema);
