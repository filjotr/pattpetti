import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE_URL } from '../utils/config';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('lt_token'));
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    const init = async () => {
      const guestFlag = localStorage.getItem('lt_guest');
      if (guestFlag === 'true') {
        setIsGuest(true);
        setUser({ username: 'Guest', id: 'guest', isGuest: true, interests: [] });
        setLoading(false);
        return;
      }

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          logout();
        }
      } catch {
        // Keep token, may be offline
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  const login = async (emailOrUsername, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    localStorage.setItem('lt_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsGuest(false);
    return data.user;
  };

  const register = async (username, email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    localStorage.setItem('lt_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsGuest(false);
    return data.user;
  };

  const loginAsGuest = () => {
    localStorage.setItem('lt_guest', 'true');
    localStorage.removeItem('lt_token');
    setIsGuest(true);
    setToken(null);
    setUser({ username: 'Guest', id: 'guest', isGuest: true, interests: [] });
  };

  const saveInterests = async (interests) => {
    if (isGuest) {
      setUser(u => ({ ...u, interests }));
      return;
    }
    const res = await fetch(`${API_BASE_URL}/auth/interests`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ interests }),
    });
    const data = await res.json();
    if (res.ok) setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('lt_token');
    localStorage.removeItem('lt_guest');
    setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  const updateProfile = async (updates) => {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Update failed');
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, isGuest,
      login, register, loginAsGuest, saveInterests, logout, updateProfile,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
