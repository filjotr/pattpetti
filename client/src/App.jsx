import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { FeedProvider } from './context/FeedContext';
import { SocialProvider } from './context/SocialContext';
import { RoomProvider } from './context/RoomContext';

import BottomNav from './components/BottomNav';
import OnboardingPage from './pages/OnboardingPage';
import FeedPage from './pages/FeedPage';
import SearchPage from './pages/SearchPage';
import RoomsPage from './pages/RoomsPage';
import RoomPage from './pages/RoomPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ background: '#0F172A', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function GuestGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  // Let OnboardingPage handle its own redirects so the interests step isn't skipped
  return children;
}

function Layout() {
  const { user } = useAuth();
  return (
    <>
      {/* Ambient background */}
      <div className="ambient-bg">
        <div className="glow-1" />
        <div className="glow-2" />
      </div>

      <Routes>
        {/* Public */}
        <Route path="/" element={<GuestGuard><OnboardingPage /></GuestGuard>} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />

        {/* Protected with bottom nav */}
        <Route path="/feed" element={<AuthGuard><FeedPage /></AuthGuard>} />
        <Route path="/search" element={<AuthGuard><SearchPage /></AuthGuard>} />
        <Route path="/rooms" element={<AuthGuard><RoomsPage /></AuthGuard>} />
        <Route path="/room/:code" element={<AuthGuard><RoomPage /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="/profile/:userId" element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
        <Route path="/admin" element={<AuthGuard><AdminPage /></AuthGuard>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Bottom nav shown on all protected pages except room detail */}
      {user && <BottomNavWrapper />}
    </>
  );
}

function BottomNavWrapper() {
  const { pathname } = window.location;
  // Hide in full-room view (but show on /rooms list)
  if (pathname.startsWith('/room/')) return null;
  return <BottomNav />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <FeedProvider>
            <SocialProvider>
              <RoomProvider>
                <Layout />
              </RoomProvider>
            </SocialProvider>
          </FeedProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
