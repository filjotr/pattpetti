const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

const { getGuestUser } = require('../middleware/auth');

const users = new Map(); // socketId -> User + Room info

function setupSocketIO(io) {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || token === 'null' || token === 'undefined') {
        socket.user = await getGuestUser();
        return next();
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('username avatar');
      if (!user) {
        socket.user = await getGuestUser();
        return next();
      }
      
      socket.user = user;
      next();
    } catch (err) {
      socket.user = await getGuestUser();
      next();
    }
  });

  io.on('connection', (socket) => {
    // Register user
    users.set(socket.id, {
      userId: socket.user._id,
      username: socket.user.username,
      avatar: socket.user.avatar,
      roomCode: null,
      isVoiceJoined: false,
      isMuted: false,
      isSpeaking: false,
    });

    // ==========================================
    // GLOBAL CHAT & STATUS
    // ==========================================
    socket.on('global-chat-join', async () => {
      socket.join('global');
      // send history
      const history = await Message.find({ isGlobal: true })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();
      socket.emit('global-history', history.reverse());
    });

    socket.on('global-send', async ({ text }) => {
      if (!text) return;
      const msg = new Message({
        sender: { userId: socket.user._id, username: socket.user.username, avatar: socket.user.avatar },
        text,
        isGlobal: true,
      });
      // await msg.save(); // Chat save disabled per user request
      io.to('global').emit('global-message', msg);
    });

    socket.on('global-typing', () => {
      socket.to('global').emit('global-typing', { username: socket.user.username });
    });

    // ==========================================
    // DIRECT MESSAGING (DM / Followers)
    // ==========================================
    socket.on('dm-join', async ({ targetUserId }) => {
      if (!targetUserId || !socket.user || !socket.user._id) return;
      const dmRoom = [socket.user._id.toString(), targetUserId.toString()].sort().join('_');
      socket.join(dmRoom);
      const history = await Message.find({ dmRoom }).sort({ timestamp: -1 }).limit(50).lean();
      socket.emit('dm-history', { targetUserId, history: history.reverse() });
    });

    socket.on('dm-send', async ({ targetUserId, text }) => {
      if (!text || !targetUserId || !socket.user || !socket.user._id) return;
      const dmRoom = [socket.user._id.toString(), targetUserId.toString()].sort().join('_');
      const msg = new Message({
        sender: { userId: socket.user._id, username: socket.user.username, avatar: socket.user.avatar },
        text,
        dmRoom
      });
      await msg.save();
      io.to(dmRoom).emit('dm-message', { dmRoom, targetUserId, message: msg });
      
      for (const [sId, uData] of users.entries()) {
        if (uData.userId.toString() === targetUserId.toString() && sId !== socket.id) {
          io.to(sId).emit('dm-notification', { sender: socket.user, text });
        }
      }
    });

    // ==========================================
    // LISTEN TOGETHER INVITES
    // ==========================================
    socket.on('listen-invite', async ({ targetUserId, song }) => {
      // Find target socket
      for (const [sId, uData] of users.entries()) {
        if (uData.userId.toString() === targetUserId.toString()) {
          io.to(sId).emit('listen-invite-received', {
            inviteId: socket.id,
            senderId: socket.user._id,
            senderName: socket.user.username,
            song
          });
        }
      }
    });

    socket.on('listen-invite-accept', ({ inviteId }) => {
      // Target accepted. Tell sender to pull them into room.
      const senderData = users.get(inviteId);
      if (senderData && senderData.roomCode) {
        socket.emit('redirect-to-room', { code: senderData.roomCode });
      }
    });

    socket.on('listen-invite-decline', ({ inviteId }) => {
      io.to(inviteId).emit('listen-invite-declined', { name: socket.user.username });
    });

    // ==========================================
    // ROOMS & MUSIC SYNC
    // ==========================================
    socket.on('join-room', async ({ roomCode }) => {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const room = await Room.findOne({ code }).populate('host', 'username');

      socket.join(code);
      const uData = users.get(socket.id);
      if (uData) uData.roomCode = code;

      // Broadcast to room
      const roomUsers = Array.from(io.sockets.adapter.rooms.get(code) || []).map(sid => {
        const u = users.get(sid);
        return { socketId: sid, ...u };
      });

      io.to(code).emit('user-joined', { members: roomUsers });
      
      // Send initial state to joiner
      if (room) {
        const chatHist = await Message.find({ room: room._id }).sort({ timestamp: -1 }).limit(50).lean();
        socket.emit('room-state', { room, members: roomUsers });
        socket.emit('chat-history', chatHist.reverse());
      } else {
        socket.emit('room-state', { room: { code, name: 'Live Sync' }, members: roomUsers });
      }
    });

    socket.on('send-message', async ({ text }) => {
      const uData = users.get(socket.id);
      if (!uData || !uData.roomCode) return;

      const room = await Room.findOne({ code: uData.roomCode });
      if (!room) return;

      const msg = new Message({
        sender: { userId: socket.user._id, username: socket.user.username, avatar: socket.user.avatar },
        text,
        room: room._id
      });
      // if (!room.isEphemeralChat) await msg.save(); // Chat save disabled per user request
      
      io.to(uData.roomCode).emit('new-message', msg);
    });

    // Host syncs music
    socket.on('sync-music', async (state) => {
      const uData = users.get(socket.id);
      if (!uData || !uData.roomCode) return;
      
      // We don't block the sync in socket for perf, we just broadcast
      // A more robust approach checks if socket.user._id == room.host
      socket.to(uData.roomCode).emit('music-state-update', state);
      
      // Async save to DB occasionally
      Room.updateOne({ code: uData.roomCode }, { $set: { currentSong: state } }).catch(()=>{});
    });

    // Instant feed sync across all members in room
    socket.on('sync-feed-state', (state) => {
      const uData = users.get(socket.id);
      if (!uData || !uData.roomCode) return;
      socket.to(uData.roomCode).emit('sync-feed-state', state);
    });

    socket.on('request-feed-sync', () => {
      const uData = users.get(socket.id);
      if (!uData || !uData.roomCode) return;
      socket.to(uData.roomCode).emit('request-feed-sync', { socketId: socket.id });
    });

    socket.on('add-to-queue', async (song) => {
      const uData = users.get(socket.id);
      if (!uData || !uData.roomCode) return;

      const room = await Room.findOne({ code: uData.roomCode });
      if (room) {
        song.addedBy = socket.user.username;
        room.queue.push(song);
        await room.save();
        io.to(uData.roomCode).emit('queue-updated', room.queue);
      }
    });

    socket.on('skip-song', async () => {
      const uData = users.get(socket.id);
      if (!uData || !uData.roomCode) return;
      
      const room = await Room.findOne({ code: uData.roomCode });
      if (room && room.queue.length > 0) {
        const next = room.queue.shift();
        room.currentSong = { ...next, isPlaying: true, playbackTime: 0, lastUpdated: Date.now() };
        await room.save();
        io.to(uData.roomCode).emit('queue-updated', room.queue);
        io.to(uData.roomCode).emit('music-state-update', room.currentSong);
      }
    });

    // ==========================================
    // ADMIN ACTIONS (Host only)
    // ==========================================
    socket.on('admin-kick-user', ({ targetSocketId }) => {
      const uData = users.get(socket.id);
      if (!uData || !uData.roomCode) return;
      // Ideally check if host
      io.to(targetSocketId).emit('kicked-from-room');
    });

    socket.on('admin-transfer-host', async ({ targetSocketId }) => {
      const uData = users.get(socket.id);
      const targetData = users.get(targetSocketId);
      if (!uData || !uData.roomCode || !targetData) return;

      const room = await Room.findOne({ code: uData.roomCode });
      if (room && room.host.toString() === uData.userId.toString()) {
        room.host = targetData.userId;
        await room.save();
        io.to(uData.roomCode).emit('host-transferred', { newHostId: targetData.userId });
      }
    });

    // ==========================================
    // VOICE / WEBRTC SIGNALING
    // ==========================================
    socket.on('voice-join', () => {
      const uData = users.get(socket.id);
      if (uData && uData.roomCode) {
        uData.isVoiceJoined = true;
        io.to(uData.roomCode).emit('user-voice-joined', { socketId: socket.id });
      }
    });

    socket.on('voice-leave', () => {
      const uData = users.get(socket.id);
      if (uData && uData.roomCode) {
        uData.isVoiceJoined = false;
        io.to(uData.roomCode).emit('user-voice-left', { socketId: socket.id });
      }
    });

    socket.on('voice-toggle-mute', ({ isMuted }) => {
      const uData = users.get(socket.id);
      if (uData && uData.roomCode) {
        uData.isMuted = isMuted;
        io.to(uData.roomCode).emit('user-mute-updated', { socketId: socket.id, isMuted });
      }
    });

    socket.on('webrtc-signal', ({ to, signal }) => {
      io.to(to).emit('webrtc-signal', { from: socket.id, signal });
    });

    // ==========================================
    // DISCONNECT
    // ==========================================
    socket.on('disconnect', () => {
      const uData = users.get(socket.id);
      if (uData && uData.roomCode) {
        // notify room
        const roomUsers = Array.from(io.sockets.adapter.rooms.get(uData.roomCode) || [])
          .filter(sid => sid !== socket.id)
          .map(sid => {
            const u = users.get(sid);
            return { socketId: sid, ...u };
          });
        
        io.to(uData.roomCode).emit('user-left', { socketId: socket.id, members: roomUsers });
      }
      users.delete(socket.id);
    });
  });
}

module.exports = { setupSocketIO };
