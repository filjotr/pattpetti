import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VinylRecord from './VinylRecord';
import WaveformAnim from './WaveformAnim';
import SongActions from './SongActions';
import CommentSheet from './CommentSheet';
import ListenTogetherModal from './ListenTogetherModal';
import { formatDuration } from '../utils/config';
import { Music2, Clock, Play, Pause } from 'lucide-react';
import { useFeed } from '../context/FeedContext';

export default function MusicFeedCard({ song, isActive, index }) {
  const { isPlaying, elapsed, togglePlay, seekTo } = useFeed();
  const [showComment, setShowComment] = useState(false);
  const [showListenModal, setShowListenModal] = useState(false);

  const displayElapsed = isActive ? elapsed : 0;
  const totalSeconds = parseDuration(song?.duration);
  const progress = totalSeconds > 0 ? Math.min((displayElapsed / totalSeconds) * 100, 100) : 0;

  const handleTogglePlay = () => {
    if (!isActive) return;
    togglePlay();
  };

  const handleSeek = (e) => {
    if (!isActive || totalSeconds <= 0) return;
    const val = parseFloat(e.target.value);
    const newTime = (val / 100) * totalSeconds;
    seekTo(newTime);
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
              Listen With Friends
            </span>
          </div>
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
            isPlaying={isPlaying && isActive}
            size={window.innerHeight < 700 ? 180 : 240}
            progress={progress}
            onSeek={(newProgress) => {
              if (!isActive || totalSeconds <= 0) return;
              const newTime = (newProgress / 100) * totalSeconds;
              seekTo(newTime);
            }}
          />
          {/* Play/Pause overlay icon */}
          <div 
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
            style={{ opacity: (!isPlaying && isActive) ? 1 : 0, background: 'rgba(0,0,0,0.3)', borderRadius: '50%' }}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Play size={32} color="#fff" style={{ marginLeft: 4 }} />
            </div>
          </div>
        </motion.div>

        <WaveformAnim isPlaying={isPlaying && isActive} />

        {/* Progress bar and Timer removed as requested */}
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
            onComment={() => setShowComment(true)}
            onListenTogether={() => setShowListenModal(true)}
          />
        </div>
      </div>

      {/* Comment sheet */}
      <AnimatePresence>
        {showComment && (
          <CommentSheet song={song} onClose={() => setShowComment(false)} />
        )}
      </AnimatePresence>

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
