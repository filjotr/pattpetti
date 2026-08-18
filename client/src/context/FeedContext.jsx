import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

    // If refreshed 2 or more times quickly (or if cache is older than 30 mins), clear cache!
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
    if (currentVideoId && !isFirstMountRef.current && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(()=>{});
      }
    }
  }, [currentVideoId]);

  const audioSrc = useMemo(() => {
    if (!currentVideoId) return '';
    return `${API_BASE_URL}/youtube/audio/${currentVideoId}`;
  }, [currentVideoId]);

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
      {/* Hidden Audio Tag for Partner Voice */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      {/* Global Audio Player for Feed */}
      {currentVideoId && (
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
        />
      )}
    </FeedContext.Provider>
  );
}
