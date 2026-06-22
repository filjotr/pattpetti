const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  code:      { type: String, required: true, unique: true, uppercase: true },
  host:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPrivate: { type: Boolean, default: false },
  password:  { type: String, default: '' },

  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['host', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],

  currentSong: {
    videoId:      { type: String, default: null },
    title:        { type: String, default: null },
    thumbnail:    { type: String, default: '' },
    channelTitle: { type: String, default: '' },
    duration:     { type: Number, default: 0 },
    addedBy:      { type: String, default: '' },
    isPlaying:    { type: Boolean, default: false },
    playbackTime: { type: Number, default: 0 },
    lastUpdated:  { type: Date, default: Date.now }
  },

  queue: [{
    videoId:      String,
    title:        String,
    thumbnail:    String,
    channelTitle: String,
    duration:     Number,
    addedBy:      String
  }],

  isEphemeralChat: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Generate unique 6-char code
roomSchema.statics.generateCode = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

module.exports = mongoose.model('Room', roomSchema);
