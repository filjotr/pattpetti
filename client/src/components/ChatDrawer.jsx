import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Send, MessageCircle, Users, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE_URL, getAvatarUrl, timeAgo } from '../utils/config';

export default function ChatDrawer({ onClose, song }) {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [tab, setTab] = useState('global'); // 'global' | 'followers'
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // Followers & DM state
  const [connections, setConnections] = useState([]);
  const [loadingConn, setLoadingConn] = useState(false);
  const [activeDmUser, setActiveDmUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmText, setDmText] = useState('');

  const bottomRef = useRef(null);
  const dmBottomRef = useRef(null);
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

    socket.on('dm-history', ({ targetUserId, history }) => {
      setDmMessages(history || []);
    });
    socket.on('dm-message', ({ targetUserId, message }) => {
      setDmMessages(p => [...p, message]);
    });

    return () => {
      socket.off('global-message');
      socket.off('global-history');
      socket.off('global-typing');
      socket.off('dm-history');
      socket.off('dm-message');
    };
  }, [socket]);

  useEffect(() => {
    if (tab === 'followers' && token && !activeDmUser) {
      setLoadingConn(true);
      fetch(`${API_BASE_URL}/social/connections`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => {
          setConnections(d.connections || []);
          setLoadingConn(false);
        })
        .catch(() => setLoadingConn(false));
    }
  }, [tab, token, activeDmUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages, activeDmUser]);

  const handleTyping = () => {
    if (!typing && socket && !activeDmUser) {
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

  const handleOpenDm = (friend) => {
    setActiveDmUser(friend);
    setDmMessages([]);
    if (socket && friend) {
      socket.emit('dm-join', { targetUserId: friend._id || friend.id });
    }
  };

  const sendDm = () => {
    if (!dmText.trim() || !socket || !activeDmUser) return;
    socket.emit('dm-send', { targetUserId: activeDmUser._id || activeDmUser.id, text: dmText.trim() });
    setDmText('');
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
          {activeDmUser ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveDmUser(null)} className="btn-icon p-1 mr-1 text-slate-300 hover:text-white transition-colors">
                <ArrowLeft size={18} />
              </button>
              <img src={getAvatarUrl(activeDmUser)} alt="" className="w-7 h-7 rounded-full border border-teal-400 object-cover" />
              <span className="text-sm font-bold text-teal-300">{activeDmUser.username}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-full border border-white/10 shadow-inner">
              <button
                onClick={() => setTab('global')}
                className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all ${tab === 'global' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Global Chat
              </button>
              <button
                onClick={() => setTab('followers')}
                className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${tab === 'followers' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <Users size={13} />
                <span>Followers</span>
              </button>
            </div>
          )}
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        {activeDmUser ? (
          /* Private DM Timeline */
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {dmMessages.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                No private messages yet. Say hello to {activeDmUser.username}! 👋
              </div>
            )}
            {dmMessages.map((m, i) => {
              const isMe = m.sender?.userId === (user?._id || user?.id);
              return (
                <div key={m._id || i} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <img src={getAvatarUrl(m.sender)} alt="" className="w-7 h-7 rounded-full border border-teal-500/40 object-cover flex-shrink-0" />
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{
                      background: isMe ? 'linear-gradient(135deg, #41AEA9, #2D9C96)' : 'rgba(255,255,255,0.08)',
                      padding: '8px 12px',
                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      fontSize: 13, color: '#fff', lineHeight: 1.5,
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
            <div ref={dmBottomRef} />
          </div>
        ) : tab === 'followers' ? (
          /* Connections / Followers List */
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {loadingConn ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-400" size={24} /></div>
            ) : connections.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs px-6 leading-relaxed">
                No followers or friends connected yet. Follow users on the music feed to start chatting! 👥
              </div>
            ) : (
              connections.map((c, i) => (
                <div
                  key={c._id || i}
                  onClick={() => handleOpenDm(c)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-white/5 cursor-pointer transition-all hover:border-teal-500/40 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={getAvatarUrl(c)} alt="" className="w-10 h-10 rounded-full border border-teal-500/50 object-cover flex-shrink-0" />
                    <div className="min-w-0 truncate">
                      <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors truncate">{c.username}</h4>
                      <p className="text-[11px] text-slate-400 group-hover:text-slate-300">Tap to private message</p>
                    </div>
                  </div>
                  <MessageCircle size={18} className="text-slate-500 group-hover:text-teal-400 transition-colors mr-1" />
                </div>
              ))
            )}
          </div>
        ) : (
          /* Global Chat Timeline */
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
                      fontSize: 13, color: '#fff', lineHeight: 1.5,
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
        )}

        {/* Input Footer */}
        {tab !== 'followers' || activeDmUser ? (
          <div className="px-4 py-3 border-t border-white/10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
            {user?.isGuest ? (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                Sign in to send messages
              </p>
            ) : (
              <div className="flex gap-3 items-center">
                <input
                  value={activeDmUser ? dmText : text}
                  onChange={e => {
                    if (activeDmUser) setDmText(e.target.value);
                    else { setText(e.target.value); handleTyping(); }
                  }}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (activeDmUser ? sendDm() : send())}
                  placeholder={activeDmUser ? `Message ${activeDmUser.username}...` : "Message everyone..."}
                  className="glass-input flex-1"
                  style={{ borderRadius: 100, padding: '10px 16px', fontSize: 13 }}
                  maxLength={500}
                />
                <button
                  onClick={activeDmUser ? sendDm : send}
                  disabled={activeDmUser ? !dmText.trim() : !text.trim()}
                  className="btn-primary"
                  style={{ borderRadius: 50, width: 44, height: 44, padding: 0 }}
                >
                  <Send size={18} />
                </button>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </>
  );
}

