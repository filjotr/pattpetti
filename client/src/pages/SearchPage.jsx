import React, { useState, useCallback } from 'react';
import { Search, TrendingUp, Music2, Users, X } from 'lucide-react';
import { searchYouTube } from '../utils/youtube';
import { API_BASE_URL, getAvatarUrl } from '../utils/config';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useFeed } from '../context/FeedContext';
import { useNavigate } from 'react-router-dom';

const TRENDING = ['#MalayalamHits','#KPop2024','#BollywoodBeat','#TamilSongs','#EnglishPop','#PunjabiVibes','#Devotional','#Retro'];

export default function SearchPage() {
  const { token } = useAuth();
  const { followingSet, followUser } = useSocial();
  const { setSongs: setGlobalSongs, setActiveIndex } = useFeed();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = React.useRef(null);

  const playSong = (index) => {
    setGlobalSongs(songs);
    setActiveIndex(index);
    navigate('/');
  };

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setSongs([]); setUsers([]); return; }
    setLoading(true);
    try {
      const [songRes, userRes] = await Promise.all([
        searchYouTube(q),
        token
          ? fetch(`${API_BASE_URL}/search/users?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
          : Promise.resolve({ users: [] }),
      ]);
      setSongs(songRes.songs || []);
      setUsers(userRes.users || []);
    } catch {}
    setLoading(false);
  }, [token]);

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  return (
    <div style={{ background: '#0F172A', padding: 20, paddingBottom: 100, minHeight: '100dvh' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Search</h1>

      {/* Search bar */}
      <div className="search-bar mb-5">
        <Search size={18} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <input
          id="search-input"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Songs, artists, users..."
          autoCapitalize="none"
        />
        {query && (
          <button onClick={() => handleInput('')} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {!query && (
        <>
          {/* Trending tags */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} color="#41AEA9" />
              <h2 style={{ fontWeight: 700, fontSize: 15 }}>Trending</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleInput(tag.replace('#', ''))}
                  style={{
                    padding: '7px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    background: 'rgba(65,174,169,0.1)', border: '1px solid rgba(65,174,169,0.2)',
                    color: '#A6F6F1', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Results */}
      {query && (
        <>
          {/* Tabs */}
          <div className="tabs-bar mb-4">
            {[
              { id: 'songs', label: 'Songs', icon: Music2 },
              { id: 'users', label: 'People', icon: Users },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #41AEA9', borderTopColor: 'transparent' }} />
            </div>
          ) : tab === 'songs' ? (
            <div className="space-y-3">
              {songs.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40 }}>No songs found</p>
              ) : songs.map((s, i) => (
                <div key={s.videoId + i} className="song-card" onClick={() => playSong(i)} style={{ cursor: 'pointer' }}>
                  {s.thumbnail && (
                    <img src={s.thumbnail} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#fff' }} className="truncate">{s.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.channel}</p>
                    <span style={{ fontSize: 11, color: '#A6F6F1', marginTop: 3, display: 'block' }}>{s.category}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                    <Music2 size={14} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {users.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40 }}>No users found</p>
              ) : users.map(u => {
                const uid = u._id || u.id;
                const isFollowing = followingSet.has(uid);
                return (
                  <div key={uid} className="user-card">
                    <img src={getAvatarUrl(u)} alt="" className="avatar" style={{ width: 44, height: 44 }} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${uid}`)}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{u.username}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{u.bio || ''}</p>
                    </div>
                    <button
                      onClick={() => followUser(uid)}
                      className={isFollowing ? 'btn-ghost' : 'btn-primary'}
                      style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, flexShrink: 0 }}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
