import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Lock, Unlock, Globe, ArrowRight, Radio, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { API_BASE_URL } from '../utils/config';

export default function RoomsPage() {
  const { token, user } = useAuth();
  const { createRoom } = useRoom();
  const navigate = useNavigate();

  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE_URL}/rooms/public`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setPublicRooms(d.rooms || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setCreating(true); setError('');
    try {
      const room = await createRoom(roomName.trim(), isPrivate, password);
      navigate(`/room/${room.code}`);
    } catch (err) {
      setError(err.message);
    }
    setCreating(false);
  };

  const handleJoin = async (code) => {
    const c = (code || joinCode).trim().toUpperCase();
    if (!c) return;
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/join/${c}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) navigate(`/room/${c}`);
      else {
        const d = await res.json();
        setError(d.message || 'Could not join room');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div style={{ background: '#0F172A', padding: 20, paddingBottom: 100, minHeight: '100dvh' }}>
      <div className="flex items-center justify-between mb-6">
        <Radio size={22} color="#41AEA9" />
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Listening Rooms</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Join by code */}
      <div className="glass-card p-5 mb-4">
        <h2 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }} className="flex items-center gap-2">
          <Unlock size={16} color="#41AEA9" /> Join via Code
        </h2>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            className="glass-input flex-1"
            style={{ letterSpacing: 3, fontWeight: 700, textAlign: 'center' }}
            maxLength={8}
          />
          <button onClick={() => handleJoin()} className="btn-primary" style={{ borderRadius: 10, padding: '12px 20px' }}>
            Join
          </button>
        </div>
      </div>

      {/* Create room */}
      <div className="glass-card p-5 mb-6">
        <h2 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }} className="flex items-center gap-2">
          <Plus size={16} color="#A6F6F1" /> Create Room
        </h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            placeholder="Room name"
            className="glass-input"
            required
          />
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Private room?</span>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              style={{
                width: 46, height: 26, borderRadius: 100,
                background: isPrivate ? '#41AEA9' : 'rgba(255,255,255,0.1)',
                border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: isPrivate ? 23 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          {isPrivate && (
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Room password"
              type="password"
              className="glass-input"
            />
          )}
          <button type="submit" disabled={creating} className="btn-primary w-full" id="btn-create-room">
            {creating ? 'Creating...' : 'Create & Launch'}
            {!creating && <ArrowRight size={16} />}
          </button>
        </form>
      </div>

      {/* Public rooms */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} color="#41AEA9" />
          <h2 style={{ fontWeight: 700, fontSize: 15 }}>Public Rooms</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid #41AEA9', borderTopColor: 'transparent' }} />
          </div>
        ) : publicRooms.length === 0 ? (
          <div className="text-center py-10 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            No public rooms right now.<br />Create one to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {publicRooms.map(room => (
              <div key={room._id} className="glass-card p-4 flex items-center gap-3">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <p style={{ fontWeight: 700, fontSize: 14 }} className="truncate">{room.name}</p>
                    {room.isPrivate ? <Lock size={12} color="rgba(255,255,255,0.3)" /> : null}
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    Host: {room.host?.username} · {room.members?.length || 0} members
                  </p>
                </div>
                <button
                  onClick={() => copyCode(room.code)}
                  className="btn-icon"
                  style={{ width: 32, height: 32 }}
                  title="Copy code"
                >
                  {copiedCode === room.code ? <Check size={14} color="#41AEA9" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => handleJoin(room.code)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: 12, borderRadius: 8 }}
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
