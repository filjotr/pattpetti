import React, { useState, useEffect } from 'react';
import { Bell, Heart, UserPlus, MessageCircle, Music2, Users, Check } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { getAvatarUrl, timeAgo } from '../utils/config';

const TYPE_ICONS = {
  follow:  { icon: UserPlus,       color: '#41AEA9' },
  like:    { icon: Heart,          color: '#f43f5e' },
  comment: { icon: MessageCircle,  color: '#a78bfa' },
  invite:  { icon: Users,          color: '#41AEA9' },
  message: { icon: MessageCircle,  color: '#fb923c' },
};

export default function NotificationsPage() {
  const { notifications, unreadCount, loadNotifications, markAllRead } = useSocial();

  useEffect(() => { loadNotifications(); }, []);

  const getIcon = (type) => {
    const cfg = TYPE_ICONS[type] || TYPE_ICONS.like;
    const Icon = cfg.icon;
    return <Icon size={18} color={cfg.color} />;
  };

  const getMessage = (n) => {
    switch (n.type) {
      case 'follow':  return `${n.sender?.username} started following you`;
      case 'like':    return `${n.sender?.username} liked your comment on "${n.data?.songTitle || 'a song'}"`;
      case 'comment': return `${n.sender?.username} commented on "${n.data?.songTitle || 'a song'}"`;
      case 'invite':  return `${n.sender?.username} invited you to listen together`;
      case 'message': return `${n.sender?.username} sent you a message`;
      default:        return 'New notification';
    }
  };

  return (
    <div style={{ background: '#0F172A', padding: 20, paddingBottom: 100, minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={22} color="#41AEA9" />
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>Notifications</h1>
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--primary)', color: '#fff', fontSize: 11,
              fontWeight: 800, padding: '4px 10px', borderRadius: 100, border: 'none'
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, color: '#41AEA9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div style={{ fontSize: 48 }}>🔔</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' }}>
            You're all caught up!<br />No new notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n, i) => (
            <div key={n._id || i} className={`notif-item ${!n.read ? 'unread' : ''}`}>
              {/* Sender avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={getAvatarUrl(n.sender)}
                  alt=""
                  className="avatar"
                  style={{ width: 44, height: 44 }}
                />
                <div style={{
                  position: 'absolute', bottom: -4, right: -4, width: 20, height: 20,
                  background: 'var(--bg)', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  {getIcon(n.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, color: '#fff', lineHeight: 1.4 }}>
                  <strong style={{ color: '#A6F6F1' }}>{n.sender?.username}</strong>{' '}
                  {getMessage(n).replace(n.sender?.username, '').trim()}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                  {timeAgo(n.createdAt)}
                </p>
              </div>

              {!n.read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#41AEA9', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
