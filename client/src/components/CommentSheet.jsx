import React, { useState, useEffect, useRef } from 'react';
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
  }, [song?.videoId]);

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
    if (!text.trim() || !token || user?.isGuest) return;
    const trimmed = text.trim();
    setText('');
    try {
      const res = await fetch(`${API_BASE_URL}/songs/${song.videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          height: '65dvh',
          background: 'rgba(13, 20, 40, 0.98)',
          backdropFilter: 'blur(30px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 0 0',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} color="#41AEA9" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Comments</span>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Song context */}
        <div className="px-5 py-3 border-b border-white/5" style={{ background: 'rgba(65,174,169,0.06)' }}>
          <p style={{ fontSize: 12, color: '#A6F6F1', fontWeight: 600 }}>{song?.title}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{song?.channel}</p>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" style={{ borderColor: '#41AEA9', borderTopColor: 'transparent' }} />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              No comments yet. Be the first! 💬
            </div>
          ) : (
            comments.map((c, i) => (
              <div key={c._id || i} className="flex gap-3">
                <img
                  src={getAvatarUrl(c.user)}
                  alt=""
                  className="avatar"
                  style={{ width: 32, height: 32, flexShrink: 0 }}
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#A6F6F1' }}>
                      {c.user?.username || 'User'}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 1.5 }}>
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
          className="px-4 py-3 border-t border-white/10"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {user?.isGuest ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              Sign in to comment
            </p>
          ) : (
            <div className="flex gap-3 items-center">
              <img src={getAvatarUrl(user)} alt="" className="avatar" style={{ width: 32, height: 32 }} />
              <div className="flex-1 flex items-center gap-2" style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 100,
                padding: '8px 16px',
              }}>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Add a comment..."
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: '#fff', fontSize: 13, flex: 1, fontFamily: 'Inter',
                  }}
                  maxLength={300}
                />
                <button onClick={send} disabled={!text.trim()} style={{ color: text.trim() ? '#41AEA9' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s' }}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
