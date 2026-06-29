import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VinylRecord from './VinylRecord';
import WaveformAnim from './WaveformAnim';
import SongActions from './SongActions';
import CommentSheet from './CommentSheet';
import ListenTogetherModal from './ListenTogetherModal';
import { formatDuration, getAvatarUrl } from '../utils/config';
import { Music2, Clock, Play, Pause, Mic, MicOff } from 'lucide-react';
import { useFeed } from '../context/FeedContext';

export default function MusicFeedCard({ song, isActive, index, onOpenComment }) {
  const { isPlaying, isAudioPlaying, elapsed, togglePlay, durations, seekTo, syncRoomCode, syncMembers, voiceJoined, isMuted, joinVoice, leaveVoice, toggleMute } = useFeed();
  const [showComment, setShowComment] = useState(false);
  const [showListenModal, setShowListenModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  const liveDuration = durations?.[song?.videoId];
  const totalSeconds = liveDuration || parseDuration(song?.duration);
  const displayElapsed = isActive ? (isDragging ? (localProgress / 100) * totalSeconds : elapsed) : 0;
  const actualProgress = totalSeconds > 0 ? Math.min((displayElapsed / totalSeconds) * 100, 100) : 0;
  const progress = isDragging ? localProgress : actualProgress;

  const lastSeekCommitRef = useRef(0);

  const handleTogglePlay = () => {
    if (!isActive) return;
    togglePlay();
  };

  const commitSeek = (valProgress) => {
    if (Date.now() - lastSeekCommitRef.current < 300) return;
    lastSeekCommitRef.current = Date.now();
    setIsDragging(false);
    if (totalSeconds > 0) {
      const newTime = (valProgress / 100) * totalSeconds;
      seekTo(newTime);
    }
  };

  const handleSeekEnd = () => {
    commitSeek(localProgress);
  };

  return (
    <div className="feed-card" id={`feed-card-${index}`}>
      {/* Background blurred thumbnail */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: song?.thumbnail ? `url(${song.thumbnail})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.25)',
          transform: 'scale(1.1)',
        }}
      />

      {/* Gradient overlays */}
      <div className="gradient-top absolute top-0 left-0 right-0 h-32 z-10" />
      <div className="gradient-bottom absolute bottom-0 left-0 right-0 h-2/3 z-10" />

      {/* Top bar and Info */}
      <div
        className="absolute top-0 left-0 right-0 px-5 pt-12 z-20 flex flex-col gap-6 pointer-events-none"
      >
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #41AEA9, #A6F6F1)' }}
            >
              <Music2 size={16} color="#0F172A" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: '#A6F6F1' }}>
              {syncRoomCode ? 'Synced Live Feed' : 'Listen With Friends'}
            </span>
          </div>

          {/* 2 Seats Header Pill */}
          {syncRoomCode && (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-[var(--primary)] px-3 py-1 rounded-full shadow-lg">
              <div className="flex items-center gap-1.5" title="Seat 1 (Host)">
                <img src={getAvatarUrl((syncMembers || [])[0] || {})} className="w-5 h-5 rounded-full border border-teal-400 object-cover" />
                <span className="text-[11px] font-bold text-teal-300 max-w-[60px] truncate">{(syncMembers || [])[0]?.username || 'You'}</span>
              </div>
              <span className="text-white/30 text-xs">⚡</span>
              <div className="flex items-center gap-1.5" title="Seat 2 (Partner)">
                {(syncMembers || [])[1] ? (
                  <>
                    <img src={getAvatarUrl((syncMembers || [])[1])} className="w-5 h-5 rounded-full border border-teal-400 object-cover" />
                    <span className="text-[11px] font-bold text-teal-300 max-w-[60px] truncate">{(syncMembers || [])[1].username}</span>
                  </>
                ) : (
                  <button onClick={() => setShowListenModal(true)} className="text-[11px] text-teal-400 font-bold border border-dashed border-teal-400/60 px-2 py-0.5 rounded-full animate-pulse bg-teal-500/10">
                    + Seat 2
                  </button>
                )}
              </div>
              {/* Mic Option */}
              <div className="border-l border-white/20 pl-2 ml-1 flex items-center">
                {!voiceJoined ? (
                  <button
                    onClick={joinVoice}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-full transition-all"
                    title="Tap to join Mic"
                  >
                    <MicOff size={13} className="text-red-400 animate-pulse" />
                    <span>Mic</span>
                  </button>
                ) : (
                  <button
                    onClick={toggleMute}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-all shadow-md ${
                      isMuted ? 'bg-red-500/20 text-red-300 border border-red-500/50' : 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-teal-500/20'
                    }`}
                    title={isMuted ? 'Muted (Tap to unmute)' : 'Active Mic (Tap to mute)'}
                  >
                    <Mic size={13} className={isMuted ? 'text-red-400' : 'text-teal-400 animate-bounce'} />
                    <span>{isMuted ? 'Muted' : 'Live'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top song info */}
        <div className="flex-1 min-w-0 pointer-events-auto">
          <motion.h2
            key={song?.videoId}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              fontSize: 20, fontWeight: 800, color: '#fff',
              lineHeight: 1.25, marginBottom: 6,
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
            className="line-clamp-2"
          >
            {song?.title || 'Unknown Song'}
          </motion.h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 4 }}>
            {song?.channel || 'Unknown Artist'}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(song?.hashtags || ['#music']).map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: 11, color: '#A6F6F1', fontWeight: 600,
                  background: 'rgba(65,174,169,0.15)',
                  padding: '3px 8px', borderRadius: 100,
                  border: '1px solid rgba(65,174,169,0.25)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Center — Vinyl + Waveform */}
      <div 
        className="relative z-20 flex flex-col items-center gap-6 cursor-pointer" 
        onClick={handleTogglePlay}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isActive ? 1 : 0.85, opacity: isActive ? 1 : 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <VinylRecord
            thumbnail={song?.thumbnail}
            isPlaying={isPlaying && isAudioPlaying && isActive}
            size={window.innerHeight < 700 ? 150 : (window.innerHeight < 800 ? 180 : 240)}
          />
          {/* Play/Pause / Buffering overlay icon */}
          <div 
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none"
            style={{ opacity: ((!isPlaying || !isAudioPlaying) && isActive) ? 1 : 0, background: 'rgba(0,0,0,0.3)', borderRadius: '50%' }}
          >
            {!isPlaying ? (
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Play size={32} color="#fff" style={{ marginLeft: 4 }} />
              </div>
            ) : !isAudioPlaying ? (
              <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}
          </div>
        </motion.div>

        <div className="scale-75 sm:scale-100">
          <WaveformAnim isPlaying={isPlaying && isAudioPlaying && isActive} />
        </div>

        {/* Progress bar and Timer */}
        <div className="w-[90%] max-w-md mt-4 flex flex-col" 
             onClick={(e) => e.stopPropagation()} 
             onPointerDown={(e) => e.stopPropagation()}
        >
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="0.1"
            value={progress || 0}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => commitSeek(parseFloat(e.target.value || localProgress))}
            onTouchEnd={(e) => commitSeek(parseFloat(e.target.value || localProgress))}
            onMouseUp={(e) => commitSeek(parseFloat(e.target.value || localProgress))}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setLocalProgress(val);
              commitSeek(val);
            }}
            onInput={(e) => {
              const val = parseFloat(e.target.value);
              setLocalProgress(val);
              setIsDragging(true);
            }}
            style={{ 
              height: 4, borderRadius: 2, cursor: 'pointer',
              accentColor: 'var(--primary)',
              touchAction: 'none'
            }}
            className="w-full"
          />
          <div className="flex justify-between items-center mt-2 w-full" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            <span>{formatTime(displayElapsed)}</span>
            <span>{liveDuration ? formatTime(liveDuration) : formatDuration(song?.duration)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div
        className="absolute left-0 right-0 z-20 px-5 pointer-events-none"
        style={{ bottom: 'calc(var(--nav-height) + 10px)' }}
      >
        <div className="flex items-end justify-end pointer-events-auto">
          {/* Right: action buttons */}
          <SongActions
            song={song}
            onComment={() => onOpenComment ? onOpenComment(song) : setShowComment(true)}
            onListenTogether={() => setShowListenModal(true)}
          />
        </div>
      </div>

      {/* Listen Together modal */}
      <AnimatePresence>
        {showListenModal && (
          <ListenTogetherModal song={song} onClose={() => setShowListenModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2,'0')}`;
}

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
