import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE_URL, getAvatarUrl, timeAgo } from '../utils/config';

export default function CommentSheet({ song, onClose }) {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!song?.videoId) return;
    fetch(`${API_BASE_URL}/songs/${song.videoId}/comments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { setComments(d.comments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [song?.videoId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Real-time new comment via socket
  useEffect(() => {
    if (!socket) return;
    socket.on(`song-comment-${song?.videoId}`, (c) => {
      setComments(p => [...p, c]);
    });
    return () => socket.off(`song-comment-${song?.videoId}`);
  }, [socket, song?.videoId]);

  const send = async () => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    setText('');
    try {
      const res = await fetch(`${API_BASE_URL}/songs/${song.videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          text: trimmed,
          title: song.title,
          thumbnail: song.thumbnail,
          channel: song.channel,
        }),
      });
      const data = await res.json();
      if (res.ok) setComments(p => [...p, data.comment]);
    } catch {}
  };

  const stopProp = (e) => {
    e.stopPropagation();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex flex-col justify-end" 
      style={{ zIndex: 1000 }}
      onClick={stopProp} 
      onPointerDown={stopProp} 
      onTouchStart={stopProp} 
      onKeyDown={stopProp}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        style={{ zIndex: 1000 }}
        onClick={onClose}
      />

      <motion.div
        className="relative flex flex-col shadow-2xl overflow-hidden"
        style={{
          zIndex: 1001,
          height: '70dvh',
          background: 'rgba(13, 20, 40, 0.98)',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '24px 24px 0 0',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <MessageCircle size={20} className="text-teal-400" />
            <span className="font-bold text-base text-white">Comments ({comments.length})</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Song context */}
        <div className="px-5 py-2.5 border-b border-white/5 flex items-center gap-3 flex-shrink-0" style={{ background: 'rgba(65,174,169,0.08)' }}>
          {song?.thumbnail && <img src={song.thumbnail} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-teal-500/30" />}
          <div className="min-w-0 truncate">
            <p className="text-xs font-bold text-teal-300 truncate">{song?.title}</p>
            <p className="text-[11px] text-white/50 truncate">{song?.channel}</p>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-900/40 rounded-2xl p-6 border border-white/5 my-2 mx-2">
              No comments yet on this track. Be the first to start the conversation! 💬
            </div>
          ) : (
            comments.map((c, i) => (
              <div key={c._id || i} className="flex gap-3 items-start">
                <img
                  src={getAvatarUrl(c.user)}
                  alt=""
                  className="w-8 h-8 rounded-full border border-teal-500/30 object-cover flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-teal-300">
                      {c.user?.username || 'User'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-white/90 mt-1 leading-relaxed break-words">
                    {c.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 border-t border-white/10 bg-slate-900/95 flex-shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <div className="flex gap-2.5 items-center">
            <img src={getAvatarUrl(user)} alt="" className="w-8 h-8 rounded-full border border-teal-400 object-cover flex-shrink-0" />
            <div className="flex-1 flex items-center gap-2 bg-slate-800/80 border border-white/15 rounded-full px-4 py-1.5 focus-within:border-teal-400 transition-colors">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Add a comment..."
                className="bg-transparent border-none outline-none text-white text-xs flex-1 w-full placeholder:text-slate-400"
                maxLength={300}
              />
              <button 
                onClick={send} 
                disabled={!text.trim()} 
                className={`p-1.5 rounded-full transition-all ${text.trim() ? 'bg-teal-500 text-slate-950 scale-100' : 'text-slate-500 scale-90'}`}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
