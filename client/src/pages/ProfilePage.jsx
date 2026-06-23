import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Music2, Heart, Clock, Users, UserPlus, UserCheck, Camera, Save, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { API_BASE_URL, getAvatarUrl, MUSIC_INTERESTS } from '../utils/config';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: me, token, updateProfile, logout } = useAuth();
  const { followingSet, followUser } = useSocial();
  const navigate = useNavigate();

  const isOwnProfile = !userId || userId === (me?._id || me?.id);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('history');
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [interests, setInterests] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOwnProfile) {
      setProfile(me);
      setBio(me?.bio || '');
      setUsername(me?.username || '');
      setInterests(me?.interests || []);
    } else {
      fetch(`${API_BASE_URL}/social/profile/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => r.json())
        .then(d => setProfile(d.user))
        .catch(console.error);
    }
  }, [userId, me]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ username, bio });
      await fetch(`${API_BASE_URL}/auth/interests`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interests }),
      });
      if (me) me.interests = interests;
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #41AEA9', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const uid = profile._id || profile.id;
  const isFollowing = followingSet.has(uid);

  return (
    <div style={{ background: '#0F172A', paddingBottom: 100, minHeight: '100dvh' }}>
      {/* Hero gradient */}
      <div style={{
        height: 180,
        background: 'linear-gradient(135deg, rgba(65,174,169,0.3) 0%, rgba(15,23,42,0) 100%)',
        position: 'relative',
      }}>
        {/* Avatar */}
        <div style={{ position: 'absolute', bottom: -44, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="relative">
            <img
              src={getAvatarUrl(profile)}
              alt={profile.username}
              className="avatar avatar-glow"
              style={{ width: 88, height: 88 }}
            />
            {isOwnProfile && (
              <button
                onClick={() => setEditing(true)}
                className="btn-icon"
                style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: 'var(--primary)' }}
              >
                <Camera size={14} color="#fff" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="text-center mt-14 px-5">
        {editing && isOwnProfile ? (
          <div className="space-y-3 mb-4">
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="glass-input text-center"
              style={{ fontSize: 16, fontWeight: 700 }}
              placeholder="Username"
            />
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="glass-input text-center"
              style={{ fontSize: 13, resize: 'none', height: 70 }}
              placeholder="Bio (optional)"
              maxLength={120}
            />
            <div className="flex flex-wrap justify-center gap-2 my-3">
              {MUSIC_INTERESTS.map(m => {
                const isSel = interests.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isSel) setInterests(interests.filter(i => i !== m.id));
                      else setInterests([...interests, m.id]);
                    }}
                    className={`genre-pill ${isSel ? 'selected' : ''}`}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    {m.flag} {m.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} className="btn-ghost flex-1" style={{ borderRadius: 10 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1" style={{ borderRadius: 10 }}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <h1 style={{ fontSize: 22, fontWeight: 900 }}>{profile.username}</h1>
              {isOwnProfile && (
                <button onClick={() => setEditing(true)} className="btn-icon" style={{ width: 28, height: 28 }}>
                  <Edit2 size={14} />
                </button>
              )}
            </div>
            {profile.bio && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.5 }}>
                {profile.bio}
              </p>
            )}
          </>
        )}

        {/* Genres */}
        {profile.interests?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {profile.interests.map(g => {
              const info = MUSIC_INTERESTS.find(m => m.id === g);
              return (
                <span key={g} className="genre-pill selected" style={{ padding: '4px 12px', fontSize: 11 }}>
                  {info?.flag} {info?.label || g}
                </span>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Followers', value: profile.followers?.length || 0, icon: Users },
            { label: 'Following', value: profile.following?.length || 0, icon: UserPlus },
            { label: 'Liked', value: profile.stats?.songsLiked || profile.favoriteSongs?.length || 0, icon: Heart },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontSize: 20, fontWeight: 900, color: '#41AEA9' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Follow / Edit / Log Out button */}
        <div className="mt-4 px-4 flex justify-center">
          {!isOwnProfile ? (
            <button
              onClick={() => followUser(uid)}
              className={isFollowing ? 'btn-ghost w-full' : 'btn-primary w-full'}
              id="btn-follow-user"
            >
              {isFollowing ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
            </button>
          ) : (
            <button
              onClick={() => { logout(); navigate('/onboarding'); }}
              className="btn-ghost w-full flex items-center justify-center gap-2"
              style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', padding: '10px' }}
            >
              <LogOut size={16} /> Log Out
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar px-5 mt-6">
        {[
          { id: 'history', label: '🎵 History' },
          { id: 'liked', label: '❤️ Liked' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 mt-4 space-y-3">
        {tab === 'history' && (
          profile.listeningHistory?.length > 0 ? (
            profile.listeningHistory.slice(0, 20).map((s, i) => (
              <div key={i} className="song-card">
                {s.thumbnail && <img src={s.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />}
                <div className="flex-1 min-w-0">
                  <p style={{ fontWeight: 700, fontSize: 13 }} className="truncate">{s.title}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.channel}</p>
                </div>
                <Clock size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '32px 0' }}>
              No listening history yet
            </p>
          )
        )}

        {tab === 'liked' && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '32px 0' }}>
            Liked songs appear here
          </p>
        )}
      </div>
    </div>
  );
}
