import React, { useState, useEffect } from 'react';
import { Shield, Users, Music2, Settings, Trash2, Ban, Star, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, getAvatarUrl } from '../utils/config';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/feed'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const uData = await usersRes.json();
      const sData = await statsRes.json();
      setUsers(uData.users || []);
      setStats(sData.stats || {});
    } catch {}
    setLoading(false);
  };

  const banUser = async (uid) => {
    await fetch(`${API_BASE_URL}/admin/users/${uid}/ban`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(p => p.filter(u => (u._id || u.id) !== uid));
  };

  const promoteUser = async (uid) => {
    await fetch(`${API_BASE_URL}/admin/users/${uid}/promote`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(p => p.map(u => (u._id || u.id) === uid ? { ...u, isAdmin: !u.isAdmin } : u));
  };

  return (
    <div className="min-h-screen px-4 pt-12 pb-24" style={{ background: '#0F172A' }}>
      <div className="flex items-center gap-3 mb-6">
        <Shield size={22} color="#41AEA9" />
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Total Users', value: stats.totalUsers || 0, icon: Users },
          { label: 'Active Rooms', value: stats.activeRooms || 0, icon: Music2 },
          { label: 'Songs Liked', value: stats.songsLiked || 0, icon: Star },
          { label: 'Messages', value: stats.totalMessages || 0, icon: Settings },
        ].map(s => (
          <div key={s.label} className="stat-card text-left">
            <s.icon size={18} color="#41AEA9" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 22, fontWeight: 900, color: '#41AEA9' }}>{s.value}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-bar mb-4">
        <button onClick={() => setTab('users')} className={`tab-pill ${tab === 'users' ? 'active' : ''}`}>Users</button>
      </div>

      <button onClick={loadData} className="btn-ghost mb-4" style={{ padding: '8px 16px', fontSize: 12, borderRadius: 8 }}>
        <RefreshCw size={14} /> Refresh
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #41AEA9', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => {
            const uid = u._id || u.id;
            return (
              <div key={uid} className="user-card">
                <img src={getAvatarUrl(u)} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{u.username}</p>
                    {u.isAdmin && (
                      <span style={{ fontSize: 10, color: '#41AEA9', background: 'rgba(65,174,169,0.15)', padding: '2px 6px', borderRadius: 4 }}>Admin</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => promoteUser(uid)} className="btn-icon" style={{ width: 32, height: 32 }} title={u.isAdmin ? 'Demote' : 'Promote'}>
                    <Star size={14} color={u.isAdmin ? '#41AEA9' : undefined} />
                  </button>
                  <button onClick={() => banUser(uid)} className="btn-icon" style={{ width: 32, height: 32 }} title="Ban">
                    <Ban size={14} color="#f87171" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
