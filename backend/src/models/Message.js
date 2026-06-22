const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    avatar:   String,
  },
  text:      { type: String, required: true, maxlength: 500 },
  room:      { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  isGlobal:  { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

messageSchema.index({ room: 1, timestamp: 1 });
messageSchema.index({ isGlobal: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
