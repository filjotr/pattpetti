import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Users, Mic, MicOff, SkipForward, MessageCircle, Music2, Headphones, Trash2 } from 'lucide-react';
import { getAvatarUrl } from '../utils/config';

export default function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const {
    room, members, chatMessages, queue, currentSong,
    joinRoom, leaveRoom, deleteRoom,
    voiceJoined, isMuted, joinVoice, leaveVoice, toggleMute,
    sendMessage, addToQueue, skipSong,
  } = useRoom();

  const [chatText, setChatText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    if (!code || !socket) return;
    joinRoom(code.toUpperCase());
    socket.on('kicked-from-room', () => { setKicked(true); setTimeout(() => navigate('/rooms'), 2000); });
    return () => {
      socket.off('kicked-from-room');
      leaveRoom();
    };
  }, [code, socket]);

  const isHost = room?.host === (user?._id || user?.id) || room?.host?._id === (user?._id || user?.id);

  const sendMsg = () => {
    if (!chatText.trim()) return;
    sendMessage(chatText.trim());
    setChatText('');
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await deleteRoom(room.code);
      navigate('/rooms');
    } catch (err) {
      alert(err.message);
    }
  };

  if (kicked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <p style={{ fontWeight: 700, fontSize: 18 }}>You've been removed from this room</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0F172A', paddingBottom: 100, minHeight: '100dvh' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3 border-b border-white/10">
        <button onClick={() => { leaveRoom(); navigate('/rooms'); }} className="btn-icon" style={{ width: 36, height: 36 }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 style={{ fontWeight: 800, fontSize: 16 }} className="truncate">{room?.name || 'Room'}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {members.length} {members.length === 1 ? 'listener' : 'listeners'}
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#41AEA9', fontWeight: 700, padding: '4px 10px', background: 'rgba(65,174,169,0.15)', borderRadius: 8 }}>
          {room?.code}
        </span>
        {isHost && (
          <button onClick={handleDeleteRoom} className="btn-icon" style={{ width: 36, height: 36, color: '#ef4444' }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Now playing */}
      <div className="px-4 py-6 text-center border-b border-white/10">
        {currentSong?.videoId ? (
          <>
            {currentSong.thumbnail && (
              <img src={currentSong.thumbnail} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', margin: '0 auto 12px' }} />
            )}
            <p style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{currentSong.title}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{currentSong.channelTitle}</p>
            {isHost && (
              <button onClick={skipSong} className="btn-ghost mt-4" style={{ borderRadius: 10, padding: '8px 20px', fontSize: 13 }}>
                <SkipForward size={14} /> Skip
              </button>
            )}
          </>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            <Music2 size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            No song playing
          </div>
        )}
      </div>

      {/* Members */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Users size={15} color="#41AEA9" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Listening Together</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {members.map(m => (
            <div key={m.socketId} className="flex flex-col items-center gap-1">
              <div className="relative">
                <img
                  src={getAvatarUrl({ username: m.username, avatar: m.avatar })}
                  alt={m.username}
                  className={`avatar ${m.isSpeaking ? 'speaking-ring' : ''}`}
                  style={{ width: 44, height: 44 }}
                />
                {m.isVoiceJoined && (
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: m.isMuted ? '#666' : '#41AEA9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.isMuted ? <MicOff size={7} color="#fff" /> : <Mic size={7} color="#fff" />}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', maxWidth: 48, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Voice controls */}
      <div className="px-4 py-4 flex gap-3">
        {!voiceJoined ? (
          <button onClick={joinVoice} className="btn-primary flex-1" id="btn-join-voice">
            <Mic size={16} /> Join Voice
          </button>
        ) : (
          <>
            <button onClick={toggleMute} className="btn-ghost flex-1" id="btn-toggle-mute">
              {isMuted ? <><MicOff size={16} /> Unmute</> : <><Mic size={16} color="#41AEA9" /> Mute</>}
            </button>
            <button onClick={leaveVoice} className="btn-ghost" style={{ padding: '12px 16px', borderRadius: 10 }}>
              Leave Voice
            </button>
          </>
        )}
        <button onClick={() => setShowChat(!showChat)} className="btn-icon" style={{ width: 48, height: 48 }}>
          <MessageCircle size={20} />
        </button>
      </div>

      {/* Chat */}
      {showChat && (
        <div className="flex-1 flex flex-col px-4">
          <div className="flex-1 overflow-y-auto max-h-60 space-y-2 mb-3">
            {chatMessages.map((m, i) => (
              <div key={m._id || i} className="flex gap-2">
                <span style={{ fontSize: 13, color: '#A6F6F1', fontWeight: 700, flexShrink: 0 }}>{m.sender?.username}:</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="Type a message..."
              className="glass-input flex-1"
              style={{ padding: '10px 14px', fontSize: 13 }}
            />
            <button onClick={sendMsg} className="btn-primary" style={{ borderRadius: 10, padding: '0 16px' }}>Send</button>
          </div>
        </div>
      )}

      {/* Hidden Audio Player for Room */}
      {currentSong?.videoId && (
        <iframe
          width="1"
          height="1"
          src={`https://www.youtube.com/embed/${currentSong.videoId}?autoplay=1&controls=0&disablekb=1&playsinline=1&start=${Math.floor(currentSong.playbackTime || 0)}`}
          allow="autoplay"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          title="room-audio"
        />
      )}
    </div>
  );
}
