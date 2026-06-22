import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, X, Music2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAvatarUrl } from '../utils/config';

export default function ListenTogetherModal({ song, onClose }) {
  const { user, token } = useAuth();
  const { sendListenInvite } = useSocial();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const startAlone = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: `${song.title} Room`, isPrivate: false }),
      });
      const data = await res.json();
      if (res.ok) {
        onClose();
        navigate(`/room/${data.room.code}`);
      }
    } catch {}
    setCreating(false);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 90 }}>
      <motion.div
        className="modal-box w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div style={{ background: 'rgba(65,174,169,0.2)', borderRadius: 10, padding: 8 }}>
              <Users size={20} color="#41AEA9" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16 }}>Listen Together</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Invite friends to sync</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Song preview */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: 'rgba(65,174,169,0.08)', border: '1px solid rgba(65,174,169,0.2)' }}>
          {song?.thumbnail && (
            <img src={song.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
          )}
          <div className="min-w-0">
            <p style={{ fontWeight: 700, fontSize: 13, color: '#A6F6F1' }} className="truncate">{song?.title}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{song?.channel}</p>
          </div>
          <Music2 size={18} color="#41AEA9" className="flex-shrink-0" />
        </div>

        {/* Search */}
        <div className="search-bar mb-3">
          <input
            value={search}
            onChange={e => searchUsers(e.target.value)}
            placeholder="Search friends by username..."
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
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
                    ) : 'Invite'}
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

        {/* Start solo room */}
        <button
          onClick={startAlone}
          disabled={creating}
          className="btn-primary w-full mt-2"
          id="btn-start-room"
        >
          {creating ? 'Creating room...' : '🎧 Start Listening Room'}
        </button>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8 }}>
          Others can join via room link
        </p>
      </motion.div>
    </div>
  );
}
