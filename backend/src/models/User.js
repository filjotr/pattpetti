const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, minlength: 6, default: '' },
  avatar:   { type: String, default: '' },
  bio:      { type: String, default: '', maxlength: 120 },
  interests: [{ type: String }],
  googleId: { type: String, default: '' },
  isGuest:  { type: Boolean, default: false },
  isAdmin:  { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  listeningHistory: [{
    videoId:    String,
    title:      String,
    thumbnail:  String,
    channel:    String,
    listenedAt: { type: Date, default: Date.now }
  }],

  favoriteSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],

  stats: {
    roomsCreated:  { type: Number, default: 0 },
    roomsJoined:   { type: Number, default: 0 },
    timeListened:  { type: Number, default: 0 },
    songsLiked:    { type: Number, default: 0 },
  },

  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) { next(err); }
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return await bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
