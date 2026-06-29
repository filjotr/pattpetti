import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Users, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE_URL, getAvatarUrl, timeAgo } from '../utils/config';

export default function ChatPage() {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  
  // Followers & DM state
  const [connections, setConnections] = useState([]);
  const [loadingConn, setLoadingConn] = useState(false);
  const [activeDmUser, setActiveDmUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmText, setDmText] = useState('');

  const dmBottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('dm-history', ({ targetUserId, history }) => {
      setDmMessages(history || []);
    });
    socket.on('dm-message', ({ targetUserId, message }) => {
      setDmMessages(p => [...p, message]);
    });

    return () => {
      socket.off('dm-history');
      socket.off('dm-message');
    };
  }, [socket]);

  useEffect(() => {
    if (token && !activeDmUser) {
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
  }, [token, activeDmUser]);

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages, activeDmUser]);

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
    <div className="flex flex-col bg-slate-950 text-white" style={{ height: '100dvh', paddingBottom: 'calc(var(--nav-height) + 10px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
        {activeDmUser ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveDmUser(null)} className="btn-icon p-1 mr-1 text-slate-300 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <img src={getAvatarUrl(activeDmUser)} alt="" className="w-8 h-8 rounded-full border border-teal-400 object-cover" />
            <div>
              <h3 className="text-sm font-bold text-teal-300 leading-tight">{activeDmUser.username}</h3>
              <p className="text-[10px] text-slate-400">Private Message</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h1 className="text-lg font-black text-white flex items-center gap-2.5">
              <MessageCircle className="text-teal-400" size={24} />
              <span>Messages & Friends</span>
            </h1>
            <div className="flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full">
              <Users size={14} className="text-teal-400" />
              <span className="text-xs font-bold text-teal-300">{connections.length} Friends</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Body */}
      {activeDmUser ? (
        /* Private DM Timeline */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {dmMessages.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-xs bg-slate-900/30 rounded-2xl p-6 border border-white/5 my-4 mx-2">
              No private messages yet. Say hello to {activeDmUser.username}! 👋
            </div>
          )}
          {dmMessages.map((m, i) => {
            const isMe = m.sender?.userId === (user?._id || user?.id);
            return (
              <div key={m._id || i} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <img src={getAvatarUrl(m.sender)} alt="" className="w-8 h-8 rounded-full border border-teal-500/40 object-cover flex-shrink-0 mt-0.5" />
                )}
                <div style={{ maxWidth: '75%' }}>
                  <div style={{
                    background: isMe ? 'linear-gradient(135deg, #41AEA9, #2D9C96)' : 'rgba(255,255,255,0.08)',
                    padding: '10px 14px',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 13.5, color: '#fff', lineHeight: 1.5,
                  }}>
                    {m.text}
                  </div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                    {timeAgo(m.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={dmBottomRef} />
        </div>
      ) : (
        /* Connections / Followers List */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {loadingConn ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-400" size={28} /></div>
          ) : connections.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs px-6 leading-relaxed bg-slate-900/30 rounded-2xl p-6 border border-white/5 my-4">
              No followers or friends connected yet. Follow users on the music feed to start chatting privately! 👥
            </div>
          ) : (
            connections.map((c, i) => (
              <div
                key={c._id || i}
                onClick={() => handleOpenDm(c)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 cursor-pointer transition-all hover:border-teal-500/40 group shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img src={getAvatarUrl(c)} alt="" className="w-11 h-11 rounded-full border border-teal-500/50 object-cover flex-shrink-0" />
                  <div className="min-w-0 truncate">
                    <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors truncate">{c.username}</h4>
                    <p className="text-[11px] text-slate-400 group-hover:text-slate-300 mt-0.5">Tap to private message</p>
                  </div>
                </div>
                <MessageCircle size={20} className="text-slate-500 group-hover:text-teal-400 transition-colors mr-1" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Input Footer */}
      {activeDmUser ? (
        <div className="px-4 py-3 border-t border-white/10 bg-slate-900/95 backdrop-blur-lg">
          {user?.isGuest ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '8px 0' }}>
              Sign in to send messages
            </p>
          ) : (
            <div className="flex gap-3 items-center">
              <input
                value={dmText}
                onChange={e => setDmText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendDm()}
                placeholder={`Message ${activeDmUser.username}...`}
                className="glass-input flex-1"
                style={{ borderRadius: 100, padding: '12px 18px', fontSize: 13.5 }}
                maxLength={500}
              />
              <button
                onClick={sendDm}
                disabled={!dmText.trim()}
                className="btn-primary flex items-center justify-center transition-transform active:scale-95"
                style={{ borderRadius: 50, width: 46, height: 46, padding: 0 }}
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
