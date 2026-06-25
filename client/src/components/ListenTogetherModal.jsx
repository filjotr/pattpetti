import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, X, Music2, Check, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useFeed } from '../context/FeedContext';
import { API_BASE_URL, getAvatarUrl } from '../utils/config';

export default function ListenTogetherModal({ song, onClose }) {
  const { user, token } = useAuth();
  const { sendListenInvite } = useSocial();
  const { syncRoomCode, setSyncRoomCode, syncMembers } = useFeed();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!syncRoomCode) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setSyncRoomCode(code);
    }
  }, [syncRoomCode, setSyncRoomCode]);

  const searchUsers = async (q) => {
    setSearch(q);
    if (!q.trim() || !token) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search/users?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data.users || []);
    } catch {}
    setLoading(false);
  };

  const invite = (targetUser) => {
    sendListenInvite(targetUser._id || targetUser.id, song);
    setInvitedIds(p => new Set([...p, targetUser._id || targetUser.id]));
  };

  const shareLink = `${window.location.origin}/#/feed?sync=${syncRoomCode || ''}`;

  return (
    <div className="modal-overlay" style={{ zIndex: 90 }}>
      <motion.div
        className="modal-box w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div style={{ background: 'rgba(65,174,169,0.2)', borderRadius: 10, padding: 8 }}>
              <Users size={20} color="#41AEA9" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16 }}>Live 2-Seat Sync</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Listen on feed together with no lag</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* 2 Seats Card */}
        <div className="mb-4 p-4 rounded-2xl glass-card border border-teal-500/40 flex items-center justify-around bg-slate-900/60">
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <img src={getAvatarUrl((syncMembers || [])[0] || user)} className="w-12 h-12 rounded-full border-2 border-teal-400 object-cover shadow-lg" />
              <span className="absolute -bottom-1 -right-1 bg-teal-500 text-[9px] text-slate-900 font-extrabold px-1.5 py-0.5 rounded-full">Seat 1</span>
            </div>
            <span className="text-xs font-bold text-teal-300 max-w-[80px] truncate">{(syncMembers || [])[0]?.username || user?.username || 'You'}</span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <span className="text-teal-400 text-sm font-extrabold tracking-wider animate-pulse">⚡ SYNC ⚡</span>
            <span className="text-[10px] text-white/50 mt-0.5">Shared Control</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            {(syncMembers || [])[1] ? (
              <>
                <div className="relative">
                  <img src={getAvatarUrl((syncMembers || [])[1])} className="w-12 h-12 rounded-full border-2 border-teal-400 object-cover shadow-lg" />
                  <span className="absolute -bottom-1 -right-1 bg-teal-500 text-[9px] text-slate-900 font-extrabold px-1.5 py-0.5 rounded-full">Seat 2</span>
                </div>
                <span className="text-xs font-bold text-teal-300 max-w-[80px] truncate">{(syncMembers || [])[1].username}</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-teal-400/50 flex items-center justify-center bg-teal-500/5 shadow-inner">
                  <Users size={20} className="text-teal-400/60" />
                </div>
                <span className="text-[11px] text-teal-400/80 font-semibold">Seat 2 Empty</span>
              </>
            )}
          </div>
        </div>

        {/* Invitation Link Box */}
        <div className="mb-4 p-3 rounded-xl flex flex-col items-center gap-2" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--primary)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#A6F6F1' }}>🔗 Share Invitation Link (Direct Feed Access)</p>
          <div className="flex items-center gap-2 w-full">
            <input
              readOnly
              value={syncRoomCode ? shareLink : 'Generating invitation link...'}
              className="glass-input flex-1 text-center truncate"
              style={{ fontSize: 11, padding: '6px 10px' }}
            />
            <button
              disabled={!syncRoomCode}
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="btn-primary flex-shrink-0 flex items-center gap-1"
              style={{ padding: '6px 14px', fontSize: 11, borderRadius: 8 }}
            >
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Search Friends */}
        <div className="search-bar mb-3">
          <input
            value={search}
            onChange={e => searchUsers(e.target.value)}
            placeholder="Or invite friends directly by username..."
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {results.map(u => {
              const uid = u._id || u.id;
              const invited = invitedIds.has(uid);
              return (
                <div key={uid} className="user-card">
                  <img src={getAvatarUrl(u)} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{u.username}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{u.bio || 'Music lover'}</p>
                  </div>
                  <button
                    onClick={() => !invited && invite(u)}
                    className={invited ? 'btn-ghost' : 'btn-primary'}
                    style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8 }}
                    disabled={invited}
                  >
                    {invited ? (
                      <><Check size={14} /> Invited</>
                    ) : 'Invite Seat 2'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#41AEA9', borderTopColor: 'transparent' }} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
