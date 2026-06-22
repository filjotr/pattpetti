import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../utils/config';

const RoomContext = createContext();
export const useRoom = () => useContext(RoomContext);

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function RoomProvider({ children }) {
  const { socket } = useSocket();
  const { user, token } = useAuth();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [voiceJoined, setVoiceJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const voiceJoinedRef = useRef(false);

  useEffect(() => { voiceJoinedRef.current = voiceJoined; }, [voiceJoined]);

  const leaveRoom = () => {
    leaveVoice();
    setRoom(null); setMembers([]); setChatMessages([]);
    setQueue([]); setCurrentSong(null);
  };

  // ---- WebRTC ----
  const joinVoice = async () => {
    if (!socket || voiceJoined) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
      setVoiceJoined(true);
      socket.emit('voice-join');
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const leaveVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    Object.values(peersRef.current).forEach(p => p?.close());
    peersRef.current = {};
    setRemoteStreams({});
    setVoiceJoined(false);
    if (socket) socket.emit('voice-leave');
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
    socket?.emit('voice-toggle-mute', { isMuted: next });
  };

  const createPeer = (targetId, isInitiator) => {
    if (peersRef.current[targetId]) return peersRef.current[targetId];
    const peer = new RTCPeerConnection(ICE_CONFIG);
    localStreamRef.current?.getTracks().forEach(t => peer.addTrack(t, localStreamRef.current));
    peer.ontrack = e => setRemoteStreams(p => ({ ...p, [targetId]: e.streams[0] }));
    peer.onicecandidate = e => {
      if (e.candidate && socket)
        socket.emit('webrtc-signal', { to: targetId, signal: { type: 'candidate', candidate: e.candidate } });
    };
    peer.onconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(peer.connectionState)) cleanupPeer(targetId);
    };
    peersRef.current[targetId] = peer;
    if (isInitiator) {
      peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => socket?.emit('webrtc-signal', { to: targetId, signal: peer.localDescription }));
    }
    return peer;
  };

  const cleanupPeer = (id) => {
    peersRef.current[id]?.close();
    delete peersRef.current[id];
    setRemoteStreams(p => { const n = {...p}; delete n[id]; return n; });
  };

  // ---- Socket Events ----
  useEffect(() => {
    if (!socket) return;

    socket.on('room-state', ({ room, members }) => {
      setRoom(room); setMembers(members); setQueue(room.queue || []);
      if (room.currentSong) setCurrentSong(room.currentSong);
    });
    socket.on('chat-history', h => setChatMessages(h));
    socket.on('new-message', m => setChatMessages(p => [...p, m]));
    socket.on('music-state-update', s => setCurrentSong(s));
    socket.on('queue-updated', q => setQueue(q));
    socket.on('user-joined', ({ members }) => setMembers(members));
    socket.on('user-left', ({ socketId, members }) => { setMembers(members); cleanupPeer(socketId); });
    socket.on('user-mute-updated', ({ socketId, isMuted }) =>
      setMembers(p => p.map(m => m.socketId === socketId ? { ...m, isMuted } : m)));
    socket.on('user-voice-joined', ({ socketId }) => {
      setMembers(p => p.map(m => m.socketId === socketId ? { ...m, isVoiceJoined: true } : m));
      if (voiceJoinedRef.current && socketId !== socket.id) createPeer(socketId, true);
    });
    socket.on('user-voice-left', ({ socketId }) => {
      setMembers(p => p.map(m => m.socketId === socketId ? { ...m, isVoiceJoined: false } : m));
      cleanupPeer(socketId);
    });
    socket.on('webrtc-signal', async ({ from, signal }) => {
      if (!voiceJoinedRef.current) return;
      let peer = peersRef.current[from];
      if (signal.type === 'offer') {
        peer = createPeer(from, false);
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        for (const c of (pendingCandidatesRef.current[from] || [])) {
          await peer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        delete pendingCandidatesRef.current[from];
        const ans = await peer.createAnswer();
        await peer.setLocalDescription(ans);
        socket.emit('webrtc-signal', { to: from, signal: peer.localDescription });
      } else if (signal.type === 'answer' && peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(signal)).catch(() => {});
      } else if (signal.type === 'candidate') {
        if (peer?.remoteDescription) peer.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        else {
          pendingCandidatesRef.current[from] = pendingCandidatesRef.current[from] || [];
          pendingCandidatesRef.current[from].push(signal.candidate);
        }
      }
    });
    socket.on('host-transferred', ({ newHostId }) => {
      setRoom(r => r ? { ...r, host: newHostId } : r);
    });
    socket.on('kicked-from-room', leaveRoom);

    return () => {
      ['room-state','chat-history','new-message','music-state-update','queue-updated',
       'user-joined','user-left','user-mute-updated','user-voice-joined','user-voice-left',
       'webrtc-signal','host-transferred','kicked-from-room'].forEach(e => socket.off(e));
    };
  }, [socket]);

  // ---- Room HTTP Actions ----
  const joinRoom = async (code) => {
    if (!token) return;
    await fetch(`${API_BASE_URL}/rooms/join/${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    socket?.emit('join-room', { roomCode: code });
  };

  const createRoom = async (name, isPrivate = false, password = '') => {
    const res = await fetch(`${API_BASE_URL}/rooms/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, isPrivate, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.room;
  };

  const deleteRoom = async (code) => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/rooms/${code}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
  };

  // ---- Emitters ----
  const sendMessage = (text) => socket?.emit('send-message', { text });
  const syncMusic = (state) => {
    const hostId = room?.host?._id || room?.host;
    const uid = user?._id || user?.id;
    if (socket && hostId?.toString() === uid?.toString()) socket.emit('sync-music', state);
  };
  const addToQueue = (song) => socket?.emit('add-to-queue', song);
  const removeFromQueue = (id) => socket?.emit('remove-from-queue', { songId: id });
  const skipSong = () => socket?.emit('skip-song');
  const kickUser = (sid) => socket?.emit('admin-kick-user', { targetSocketId: sid });
  const transferHost = (sid) => socket?.emit('admin-transfer-host', { targetSocketId: sid });

  return (
    <RoomContext.Provider value={{
      room, members, chatMessages, queue, currentSong, setCurrentSong,
      voiceJoined, isMuted, remoteStreams,
      joinRoom, createRoom, leaveRoom, deleteRoom,
      joinVoice, leaveVoice, toggleMute,
      sendMessage, syncMusic, addToQueue, removeFromQueue, skipSong,
      kickUser, transferHost,
    }}>
      {children}
    </RoomContext.Provider>
  );
}
