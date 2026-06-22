import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/config';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const SocialContext = createContext();
export const useSocial = () => useContext(SocialContext);

export function SocialProvider({ children }) {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [followingSet, setFollowingSet] = useState(new Set());
  const [listenInvite, setListenInvite] = useState(null); // incoming invite

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter(n => !n.read).length || 0);
      }
    } catch {}
  }, [token]);

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${API_BASE_URL}/notifications/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Follow / unfollow
  const followUser = async (targetUserId) => {
    if (!token) return;
    const isFollowing = followingSet.has(targetUserId);
    setFollowingSet(prev => {
      const s = new Set(prev);
      if (isFollowing) s.delete(targetUserId); else s.add(targetUserId);
      return s;
    });
    try {
      await fetch(`${API_BASE_URL}/social/${isFollowing ? 'unfollow' : 'follow'}/${targetUserId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  };

  const checkFollowing = async (userId) => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/social/is-following/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.isFollowing) {
        setFollowingSet(prev => new Set([...prev, userId]));
      }
    } catch {}
  };

  // Send Listen Together invite
  const sendListenInvite = (targetUserId, song) => {
    if (!socket) return;
    socket.emit('listen-invite', { targetUserId, song });
  };

  const acceptInvite = (inviteId) => {
    if (!socket) return;
    socket.emit('listen-invite-accept', { inviteId });
    setListenInvite(null);
  };

  const declineInvite = () => {
    if (!socket || !listenInvite) return;
    socket.emit('listen-invite-decline', { inviteId: listenInvite.inviteId });
    setListenInvite(null);
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('notification-new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('listen-invite-received', (invite) => {
      setListenInvite(invite);
    });

    socket.on('listen-invite-declined', () => {
      // optional toast
    });

    return () => {
      socket.off('notification-new');
      socket.off('listen-invite-received');
      socket.off('listen-invite-declined');
    };
  }, [socket]);

  useEffect(() => {
    if (token && user && !user.isGuest) loadNotifications();
  }, [token, user]);

  return (
    <SocialContext.Provider value={{
      notifications, unreadCount, followingSet,
      listenInvite,
      loadNotifications, markAllRead,
      followUser, checkFollowing,
      sendListenInvite, acceptInvite, declineInvite,
    }}>
      {children}
    </SocialContext.Provider>
  );
}
