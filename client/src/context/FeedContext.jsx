import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { API_BASE_URL } from '../utils/config';
import { useAuth } from './AuthContext';
import { fetchTrendingByGenre } from '../utils/youtube';
import { useSocket } from './SocketContext';

const FeedContext = createContext();

async function fetchAudioUrl(videoId) {
  const instances = ['https://vid.puffyan.us', 'https://invidious.jing.rocks', 'https://invidious.nerdvpn.de'];
  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
      const data = await res.json();
      const audioFormat = data.adaptiveFormats?.find(f => f.type && f.type.includes('audio/mp4'));
      if (audioFormat?.url) return audioFormat.url;
    } catch (e) {}
  }
  return null;
}
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

function getCachedFeedState() {
  try {
    const now = Date.now();
    const lastLoad = parseInt(sessionStorage.getItem('pattpetti_last_load') || '0', 10);
    let count = parseInt(sessionStorage.getItem('pattpetti_refresh_count') || '0', 10);
    
    if (now - lastLoad < 6000) {
      count += 1;
    } else {
      count = 1;
    }
    
    sessionStorage.setItem('pattpetti_last_load', String(now));
    sessionStorage.setItem('pattpetti_refresh_count', String(count));

    if (count >= 2) {
      console.log('Double refresh detected! Clearing song cache to load new songs...');
      localStorage.removeItem('pattpetti_cached_state');
      sessionStorage.setItem('pattpetti_refresh_count', '0');
      return null;
    }

    const raw = localStorage.getItem('pattpetti_cached_state');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.timestamp && now - data.timestamp > 1800000) {
        localStorage.removeItem('pattpetti_cached_state');
        return null;
      }
      if (data && Array.isArray(data.songs) && data.songs.length > 0) {
        return data;
      }
    }
  } catch {}
  return null;
}

export function FeedProvider({ children }) {
  const { user, token } = useAuth();
  const cachedState = getCachedFeedState();
  const [songs, setSongs] = useState(cachedState ? cachedState.songs : []);
  const songsRef = useRef(songs);
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(()=>{});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioSrc]);

  useEffect(() => {
    if (isPlaying) {
      setStartTime(Date.now());
    } else {
      setBaseElapsed(elapsed);
    }
  }, [isPlaying]);

  useEffect(() => {
    setIsAudioPlaying(false);
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      setIsPlaying(false);
      const cached = getCachedFeedState();
      if (cached && typeof cached.elapsed === 'number' && cached.elapsed > 0) {
        setElapsed(cached.elapsed);
        setBaseElapsed(cached.elapsed);
        return;
      }
    } else {
      setIsPlaying(true);
    }
    setBaseElapsed(0);
    setStartTime(Date.now());
    setElapsed(0);
  }, [activeIndex]);

  useEffect(() => {
    if (songs.length > 0 && activeIndex < songs.length) {
      try {
        localStorage.setItem('pattpetti_cached_state', JSON.stringify({
          songs: songs.slice(0, 50),
          activeIndex,
          elapsed: Math.floor(elapsed),
          timestamp: Date.now()
        }));
      } catch {}
    }
  }, [songs, activeIndex, Math.floor(elapsed)]);

  useEffect(() => {
    if (!isPlaying || isAudioPlaying) return;
    const forceUnlock = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.play().catch(()=>{});
      }
    };
    window.addEventListener('pointerdown', forceUnlock, { passive: true });
    window.addEventListener('touchstart', forceUnlock, { passive: true });
    window.addEventListener('click', forceUnlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', forceUnlock);
      window.removeEventListener('touchstart', forceUnlock);
      window.removeEventListener('click', forceUnlock);
    };
  }, [isPlaying, activeIndex, isAudioPlaying]);

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
    if (reset) {
      try { localStorage.removeItem('pattpetti_cached_state'); } catch {}
    }
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
          const list = sharedSong ? [sharedSong, ...newSongs.filter(s => s.videoId !== sharedSong.videoId)] : newSongs;
          const seen = new Set();
          return list.filter(s => {
            if (seen.has(s.videoId)) return false;
            seen.add(s.videoId);
            return true;
          });
        }
        const existingIds = new Set(prev.map(s => s.videoId));
        const uniqueNew = newSongs.filter(s => !existingIds.has(s.videoId));
        return [...prev, ...uniqueNew];
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
      setLikedSongs(prev => {
        const s = new Set(prev);
        if (isLiked) s.add(vid); else s.delete(vid);
        return s;
      });
    }
  };

  const handleAudioEnded = () => {
    if (activeIndex < songs.length - 1) {
      changeTrack(activeIndex + 1, false);
    } else if (nextPageToken && !loading) {
      loadFeed(false).then(() => changeTrack(activeIndex + 1, false));
    }
  };

  const fetchLikeCount = useCallback(async (videoId) => {
    if (!videoId || likeCounts[videoId] !== undefined) return;
    try {
      const res = await fetch(`${API_BASE_URL}/songs/${videoId}/likes`);
      const data = await res.json();
      setLikeCounts(prev => ({ ...prev, [videoId]: data.count !== undefined ? data.count : 0 }));
      setCommentCounts(prev => ({ ...prev, [videoId]: data.commentCount !== undefined ? data.commentCount : 0 }));
      if (data.likedByUser) setLikedSongs(prev => new Set([...prev, videoId]));
    } catch {}
  }, [likeCounts]);

  const seekTo = useCallback((seconds, isRemote = false) => {
    if (audioRef.current && !isNaN(seconds)) {
      lastSeekTimeRef.current = Date.now();
      audioRef.current.currentTime = seconds;
      setBaseElapsed(seconds);
      setStartTime(Date.now());
      setElapsed(seconds);
      if (!isRemote && socket && syncRoomCode) {
        socket.emit('sync-feed-state', { activeIndex, isPlaying, elapsed: seconds, timestamp: Date.now(), song: songs[activeIndex] });
      }
    }
  }, [socket, syncRoomCode, activeIndex, isPlaying, songs]);

  const changeTrack = useCallback((newIndex, isRemote = false) => {
    if (newIndex < 0 || newIndex >= songs.length) return;
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
        navigator.mediaSession.setActionHandler('play', () => {
          setIsPlaying(true);
          if (audioRef.current) audioRef.current.play().catch(()=>{});
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.pause();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          setActiveIndex(prev => prev + 1);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          setActiveIndex(prev => Math.max(0, prev - 1));
        });
      }
    }
  }, [activeIndex, songs]);

  useEffect(() => {
    if (currentVideoId) {
      fetchLikeCount(currentVideoId);
    }
  }, [currentVideoId, fetchLikeCount]);

  return (
    <FeedContext.Provider value={{
      songs, loading, nextPageToken,
      likedSongs, likeCounts, commentCounts, setCommentCounts,
      loadFeed, likeSong, fetchLikeCount,
      setSongs,
      activeIndex, setActiveIndex, changeTrack,
      isPlaying, setIsPlaying, isAudioPlaying,
      elapsed, togglePlay, durations,
      seekTo,
      syncRoomCode, setSyncRoomCode, syncMembers,
      voiceJoined, isMuted, joinVoice, leaveVoice, toggleMute
    }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          autoPlay={isPlaying}
          playsInline
          style={{ display: 'none' }}
          onTimeUpdate={(e) => {
            if (Date.now() - lastSeekTimeRef.current > 1500) {
              const ct = e.target.currentTime;
              setElapsed(ct);
              setBaseElapsed(ct);
              setStartTime(Date.now());
            }
          }}
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onEnded={handleAudioEnded}
          onLoadedMetadata={(e) => {
            const dur = e.target.duration;
            if (dur && currentVideoIdRef.current) {
              setDurations(prev => {
                if (prev[currentVideoIdRef.current] === dur) return prev;
                return { ...prev, [currentVideoIdRef.current]: dur };
              });
            }
            if (isFirstMountRef.current && (baseElapsed > 0 || elapsed > 0)) {
              e.target.currentTime = baseElapsed || elapsed;
            }
          }}
          onError={(e) => {
             console.error('[Audio Error]', e);
             setIsAudioPlaying(false);
             handleAudioEnded(); // skip to next if error
          }}
        />
      )}
    </FeedContext.Provider>
  );
}
