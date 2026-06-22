import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Send, MessageCircle, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE_URL, getAvatarUrl, timeAgo } from '../utils/config';

export default function ChatDrawer({ onClose, song }) {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [tab, setTab] = useState('global');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit('global-chat-join');
    socket.on('global-message', m => setMessages(p => [...p, m]));
    socket.on('global-history', h => setMessages(h || []));
    socket.on('global-typing', ({ username }) => {
      setTypingUsers(p => p.includes(username) ? p : [...p, username]);
      setTimeout(() => setTypingUsers(p => p.filter(u => u !== username)), 2500);
    });
    return () => {
      socket.off('global-message');
      socket.off('global-history');
      socket.off('global-typing');
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!typing && socket) {
      setTyping(true);
      socket.emit('global-typing');
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping(false), 2000);
  };

  const send = () => {
    if (!text.trim() || !socket || user?.isGuest) return;
    socket.emit('global-send', { text: text.trim() });
    setText('');
    setTyping(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-70" onClick={onClose} style={{ zIndex: 70 }} />
      <motion.div
        className="fixed bottom-0 left-0 right-0 flex flex-col"
        style={{
          height: '65dvh', zIndex: 75,
          background: 'rgba(10, 18, 40, 0.98)',
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab('global')}
              className={`tab-pill ${tab === 'global' ? 'active' : ''}`}
            >
              Global Chat
            </button>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              No messages yet. Start the conversation! 🎵
            </div>
          )}
          {messages.map((m, i) => {
            const isMe = m.sender?.userId === (user?._id || user?.id);
            return (
              <div key={m._id || i} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <img src={getAvatarUrl(m.sender)} alt="" className="avatar" style={{ width: 28, height: 28, flexShrink: 0 }} />
                )}
                <div style={{ maxWidth: '75%' }}>
                  {!isMe && (
                    <p style={{ fontSize: 11, color: '#A6F6F1', fontWeight: 600, marginBottom: 3 }}>
                      {m.sender?.username}
                    </p>
                  )}
                  <div style={{
                    background: isMe ? 'linear-gradient(135deg, #41AEA9, #2D9C96)' : 'rgba(255,255,255,0.08)',
                    padding: '8px 12px',
                    borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 13,
                    color: '#fff',
                    lineHeight: 1.5,
                  }}>
                    {m.text}
                  </div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                    {timeAgo(m.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
          {user?.isGuest ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              Sign in to send messages
            </p>
          ) : (
            <div className="flex gap-3 items-center">
              <input
                value={text}
                onChange={e => { setText(e.target.value); handleTyping(); }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Message everyone..."
                className="glass-input flex-1"
                style={{ borderRadius: 100, padding: '10px 16px', fontSize: 13 }}
                maxLength={500}
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="btn-primary"
                style={{ borderRadius: 50, width: 44, height: 44, padding: 0 }}
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
