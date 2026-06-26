import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../utils/config';
import { useAuth } from './AuthContext';
import { fetchTrendingByGenre } from '../utils/youtube';
import { useSocket } from './SocketContext';

const FeedContext = createContext();
export const useFeed = () => useContext(FeedContext);

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function parseDuration(str) {
  if (!str) return 0;
  const isoMatch = String(str).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (isoMatch) return (parseInt(isoMatch[1]||0)*3600) + (parseInt(isoMatch[2]||0)*60) + parseInt(isoMatch[3]||0);
  const parts = String(str).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (!isNaN(str)) return Number(str);
  return 0;
}

export function FeedProvider({ children }) {
  const { user, token } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});

  const { socket } = useSocket() || {};
  const [syncRoomCode, setSyncRoomCode] = useState(null);
  const [syncMembers, setSyncMembers] = useState([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [baseElapsed, setBaseElapsed] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const iframeRef = useRef(null);
  const intervalRef = useRef(null);
  const isFirstMountRef = useRef(true);

  // WebRTC Voice Chat State
  const [voiceJoined, setVoiceJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteAudioStream, setRemoteAudioStream] = useState(null);

  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const voiceJoinedRef = useRef(false);
  const remoteAudioRef = useRef(null);

  useEffect(() => { voiceJoinedRef.current = voiceJoined; }, [voiceJoined]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteAudioStream) {
      remoteAudioRef.current.srcObject = remoteAudioStream;
    }
  }, [remoteAudioStream]);

  useEffect(() => {
    const checkSyncUrl = () => {
      const hashParts = window.location.hash.split('?');
      if (hashParts.length > 1) {
        const params = new URLSearchParams(hashParts[1]);
        const sc = params.get('sync');
        if (sc && sc !== syncRoomCode) {
          setSyncRoomCode(sc.toUpperCase());
        }
      }
    };
    checkSyncUrl();
    window.addEventListener('hashchange', checkSyncUrl);
    return () => window.removeEventListener('hashchange', checkSyncUrl);
  }, [syncRoomCode]);

  useEffect(() => {
    if (socket && syncRoomCode) {
      socket.emit('join-room', { roomCode: syncRoomCode });
      socket.emit('request-feed-sync');
    }
  }, [socket, syncRoomCode]);

  const togglePlay = useCallback((isRemote = false) => {
    setIsPlaying(prev => {
      const next = !prev;
      if (!isRemote && socket && syncRoomCode) {
        socket.emit('sync-feed-state', { activeIndex, isPlaying: next, elapsed, timestamp: Date.now(), song: songs[activeIndex] });
      }
      return next;
    });
  }, [socket, syncRoomCode, activeIndex, elapsed, songs]);

  // Stop playback when component unmounts (logout)
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      if (isPlaying) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      } else {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      setStartTime(Date.now());
    } else {
      setBaseElapsed(elapsed);
    }
  }, [isPlaying]);

  useEffect(() => {
    setBaseElapsed(0);
    setStartTime(Date.now());
    setElapsed(0);
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  }, [activeIndex]);

  // Global auto-unlock to guarantee audio plays on any screen touch if browser blocked autoplay
  useEffect(() => {
    if (!isPlaying) return;
    const forceUnlock = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      }
    };
    window.addEventListener('pointerdown', forceUnlock, { passive: true });
    window.addEventListener('touchstart', forceUnlock, { passive: true });
    window.addEventListener('click', forceUnlock, { passive: true });
    window.addEventListener('keydown', forceUnlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', forceUnlock);
      window.removeEventListener('touchstart', forceUnlock);
      window.removeEventListener('click', forceUnlock);
      window.removeEventListener('keydown', forceUnlock);
    };
  }, [isPlaying, activeIndex]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const newElapsed = baseElapsed + (Date.now() - startTime) / 1000;
        setElapsed(newElapsed);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, baseElapsed, startTime]);

  // Auto-play next song when current finishes
  useEffect(() => {
    const currentSong = songs[activeIndex];
    if (currentSong && currentSong.duration) {
      const total = parseDuration(currentSong.duration);
      if (total > 0 && elapsed >= total) {
        if (activeIndex < songs.length - 1) {
          setActiveIndex(prev => prev + 1);
        } else if (nextPageToken && !loading) {
          loadFeed(false).then(() => setActiveIndex(prev => prev + 1));
        }
      }
    }
  }, [elapsed, activeIndex, songs, nextPageToken, loading]);

  useEffect(() => {
    if (!token && !user) {
      setIsPlaying(false);
      setSongs([]);
      setNextPageToken(null);
    }
  }, [token, user]);

  const loadFeed = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const interests = user?.interests || ['English'];
      const pageToken = reset ? '' : (nextPageToken || '');
      const { songs: newSongs, nextPageToken: npt } = await fetchTrendingByGenre(interests, pageToken);

      let sharedSong = null;
      if (reset) {
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
          const params = new URLSearchParams(hashParts[1]);
          const songId = params.get('song');
          if (songId) {
            try {
              const res = await fetch(`${API_BASE_URL}/youtube/details/${songId}`);
              const data = await res.json();
              if (data.song) sharedSong = data.song;
            } catch {}
          }
        }
      }

      setSongs(prev => {
        if (reset) {
          return sharedSong ? [sharedSong, ...newSongs.filter(s => s.videoId !== sharedSong.videoId)] : newSongs;
        }
        return [...prev, ...newSongs];
      });
      setNextPageToken(npt);
      if (reset && sharedSong) {
        setActiveIndex(0);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Feed load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, nextPageToken, loading]);

  const likeSong = async (song) => {
    const vid = song.videoId;
    const isLiked = likedSongs.has(vid);

    // Optimistic update
    setLikedSongs(prev => {
      const s = new Set(prev);
      if (isLiked) s.delete(vid); else s.add(vid);
      return s;
    });
    setLikeCounts(prev => ({
      ...prev,
      [vid]: (prev[vid] || 0) + (isLiked ? -1 : 1),
    }));

    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/songs/like/${vid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: song.title, thumbnail: song.thumbnail, channel: song.channel }),
      });
    } catch (err) {
      // Revert on error
      setLikedSongs(prev => {
        const s = new Set(prev);
        if (isLiked) s.add(vid); else s.delete(vid);
        return s;
      });
    }
  };

  const fetchLikeCount = async (videoId) => {
    if (likeCounts[videoId] !== undefined) return;
    try {
      const res = await fetch(`${API_BASE_URL}/songs/${videoId}/likes`);
      const data = await res.json();
      setLikeCounts(prev => ({ ...prev, [videoId]: data.count || 0 }));
      if (data.likedByUser) setLikedSongs(prev => new Set([...prev, videoId]));
    } catch {}
  };

  const seekTo = useCallback((seconds, isRemote = false) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.floor(seconds), true] }),
        '*'
      );
      setBaseElapsed(seconds);
      setStartTime(Date.now());
      setElapsed(seconds);
      if (!isRemote && socket && syncRoomCode) {
        socket.emit('sync-feed-state', { activeIndex, isPlaying, elapsed: seconds, timestamp: Date.now(), song: songs[activeIndex] });
      }
    }
  }, [socket, syncRoomCode, activeIndex, isPlaying, songs]);

  const changeTrack = useCallback((newIndex, isRemote = false) => {
    setActiveIndex(newIndex);
    if (!isRemote && socket && syncRoomCode) {
      socket.emit('sync-feed-state', { activeIndex: newIndex, isPlaying: true, elapsed: 0, timestamp: Date.now(), song: songs[newIndex] });
    }
  }, [socket, syncRoomCode, songs]);

  useEffect(() => {
    if (!socket || !syncRoomCode) return;
    const handleJoined = ({ members }) => setSyncMembers((members || []).slice(0, 2));
    const handleState = ({ members }) => setSyncMembers((members || []).slice(0, 2));
    const handleLeft = ({ members }) => setSyncMembers((members || []).slice(0, 2));

    const handleRequestSync = () => {
      socket.emit('sync-feed-state', { activeIndex, isPlaying, elapsed, timestamp: Date.now(), playlist: songs });
    };

    const handleSyncState = (state) => {
      if (state.playlist && Array.isArray(state.playlist) && state.playlist.length > 0) {
        setSongs(state.playlist);
      } else if (state.song && state.activeIndex !== undefined) {
        setSongs(prev => {
          const arr = [...prev];
          arr[state.activeIndex] = state.song;
          return arr;
        });
      }

      if (state.activeIndex !== undefined && state.activeIndex !== activeIndex) {
        changeTrack(state.activeIndex, true);
      }
      if (state.isPlaying !== undefined && state.isPlaying !== isPlaying) {
        setIsPlaying(state.isPlaying);
      }
      if (state.elapsed !== undefined) {
        const adj = state.isPlaying ? state.elapsed + (Date.now() - (state.timestamp || Date.now())) / 1000 : state.elapsed;
        seekTo(adj, true);
      }
    };

    socket.on('user-joined', handleJoined);
    socket.on('room-state', handleState);
    socket.on('user-left', handleLeft);
    socket.on('request-feed-sync', handleRequestSync);
    socket.on('sync-feed-state', handleSyncState);

    return () => {
      socket.off('user-joined', handleJoined);
      socket.off('room-state', handleState);
      socket.off('user-left', handleLeft);
      socket.off('request-feed-sync', handleRequestSync);
      socket.off('sync-feed-state', handleSyncState);
    };
  }, [socket, syncRoomCode, activeIndex, isPlaying, elapsed, songs, seekTo, changeTrack]);

  // WebRTC Voice Chat Methods
  const leaveVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    peerRef.current?.close();
    peerRef.current = null;
    setRemoteAudioStream(null);
    setVoiceJoined(false);
    if (socket && syncRoomCode) socket.emit('voice-leave');
  }, [socket, syncRoomCode]);

  const joinVoice = async () => {
    if (!socket || !syncRoomCode || voiceJoined) return;
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

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
    socket?.emit('voice-toggle-mute', { isMuted: next });
  };

  const createVoicePeer = useCallback((targetId, isInitiator) => {
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection(ICE_CONFIG);
    localStreamRef.current?.getTracks().forEach(t => peer.addTrack(t, localStreamRef.current));
    peer.ontrack = e => setRemoteAudioStream(e.streams[0]);
    peer.onicecandidate = e => {
      if (e.candidate && socket) {
        socket.emit('webrtc-signal', { to: targetId, signal: { type: 'candidate', candidate: e.candidate } });
      }
    };
    peer.onconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(peer.connectionState)) {
        peerRef.current?.close();
        peerRef.current = null;
        setRemoteAudioStream(null);
      }
    };
    peerRef.current = peer;

    if (isInitiator) {
      peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => socket?.emit('webrtc-signal', { to: targetId, signal: peer.localDescription }));
    }
    return peer;
  }, [socket]);

  useEffect(() => {
    if (!socket || !syncRoomCode) {
      leaveVoice();
      return;
    }

    const handleVoiceJoined = ({ socketId }) => {
      setSyncMembers(p => p.map(m => m.socketId === socketId ? { ...m, isVoiceJoined: true } : m));
      if (voiceJoinedRef.current && socketId !== socket.id) {
        createVoicePeer(socketId, true);
      }
    };

    const handleVoiceLeft = ({ socketId }) => {
      setSyncMembers(p => p.map(m => m.socketId === socketId ? { ...m, isVoiceJoined: false } : m));
      peerRef.current?.close();
      peerRef.current = null;
      setRemoteAudioStream(null);
    };

    const handleVoiceMute = ({ socketId, isMuted: mStatus }) => {
      setSyncMembers(p => p.map(m => m.socketId === socketId ? { ...m, isVoiceJoined: true, isMuted: mStatus } : m));
    };

    const handleSignal = async ({ from, signal }) => {
      if (!voiceJoinedRef.current) return;
      let peer = peerRef.current;
      if (signal.type === 'offer') {
        peer = createVoicePeer(from, false);
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        for (const c of pendingCandidatesRef.current) {
          await peer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidatesRef.current = [];
        const ans = await peer.createAnswer();
        await peer.setLocalDescription(ans);
        socket.emit('webrtc-signal', { to: from, signal: peer.localDescription });
      } else if (signal.type === 'answer' && peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(signal)).catch(() => {});
      } else if (signal.type === 'candidate') {
        if (peer?.remoteDescription) {
          peer.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        } else {
          pendingCandidatesRef.current.push(signal.candidate);
        }
      }
    };

    socket.on('user-voice-joined', handleVoiceJoined);
    socket.on('user-voice-left', handleVoiceLeft);
    socket.on('user-mute-updated', handleVoiceMute);
    socket.on('webrtc-signal', handleSignal);

    return () => {
      socket.off('user-voice-joined', handleVoiceJoined);
      socket.off('user-voice-left', handleVoiceLeft);
      socket.off('user-mute-updated', handleVoiceMute);
      socket.off('webrtc-signal', handleSignal);
    };
  }, [socket, syncRoomCode, createVoicePeer, leaveVoice]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      const currentSong = songs[activeIndex];
      if (currentSong) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title || 'Unknown Song',
          artist: currentSong.channel || 'Unknown Artist',
          artwork: [{ src: currentSong.thumbnail || '', sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
        navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          setActiveIndex(prev => prev + 1);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          setActiveIndex(prev => Math.max(0, prev - 1));
        });
      }
    }
  }, [activeIndex, songs]);

  return (
    <FeedContext.Provider value={{
      songs, loading, nextPageToken,
      likedSongs, likeCounts,
      loadFeed, likeSong, fetchLikeCount,
      setSongs,
      activeIndex, setActiveIndex, changeTrack,
      isPlaying, setIsPlaying,
      elapsed, togglePlay,
      seekTo,
      syncRoomCode, setSyncRoomCode, syncMembers,
      voiceJoined, isMuted, joinVoice, leaveVoice, toggleMute
    }}>
      {children}
      {/* Hidden Audio Tag for Partner Voice */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      {/* Global Audio Player for Feed */}
      {songs[activeIndex]?.videoId && (
        <iframe
          ref={iframeRef}
          width="200"
          height="200"
          src={`https://www.youtube.com/embed/${songs[activeIndex].videoId}?autoplay=1&controls=0&disablekb=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          style={{ position: 'fixed', top: '-1000px', opacity: 0.01, pointerEvents: 'none', zIndex: -100 }}
          title="global-feed-audio"
        />
      )}
    </FeedContext.Provider>
  );
}
