import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import MusicFeedCard from '../components/MusicFeedCard';
import { useFeed } from '../context/FeedContext';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Clock } from 'lucide-react';

export default function FeedPage() {
  const { songs, loading, loadFeed, nextPageToken, activeIndex, changeTrack } = useFeed();
  const { listenInvite, acceptInvite, declineInvite } = useSocial();
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const containerRef = useRef(null);
  const loadedRef = useRef(false);
  const isRestoringRef = useRef(true);
  const isRemoteScrollingRef = useRef(false);

  // Initial feed load and scroll restore
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      if (songs.length === 0) {
        loadFeed(true);
        isRestoringRef.current = false;
      } else {
        // Restore scroll position on returning
        setTimeout(() => {
          if (containerRef.current) {
            const el = containerRef.current.querySelector(`[data-idx="${activeIndex}"]`);
            if (el) el.scrollIntoView({ behavior: 'instant' });
          }
          setTimeout(() => { isRestoringRef.current = false; }, 100);
        }, 100);
      }
    }
  }, []);

  // Detect which card is visible using IntersectionObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !isRestoringRef.current && !isRemoteScrollingRef.current) {
            const idx = parseInt(entry.target.dataset.idx);
            if (changeTrack && idx !== activeIndex) {
              changeTrack(idx);
            }
            // Load more when near end
            if (idx >= songs.length - 3 && nextPageToken && !loading) {
              loadFeed(false);
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.6 }
    );

    const cards = containerRef.current.querySelectorAll('[data-idx]');
    cards.forEach(c => observer.observe(c));
    return () => observer.disconnect();
  }, [songs, nextPageToken, loading]);

  // Auto-scroll when activeIndex changes programmatically (e.g. song ends or partner synced)
  useEffect(() => {
    if (containerRef.current && !isRestoringRef.current) {
      const el = containerRef.current.querySelector(`[data-idx="${activeIndex}"]`);
      if (el) {
        const diff = Math.abs(containerRef.current.scrollTop - el.offsetTop);
        if (diff > 20) {
          isRemoteScrollingRef.current = true;
          el.scrollIntoView({ behavior: 'smooth' });
          setTimeout(() => { isRemoteScrollingRef.current = false; }, 700);
        }
      }
    }
  }, [activeIndex]);

  return (
    <div className="relative" style={{ background: '#0F172A' }}>
      {/* Feed */}
      <div ref={containerRef} className="feed-container">
        {songs.length === 0 && loading ? (
          <div
            className="feed-card"
            style={{ background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}
          >
            <div className="w-12 h-12 rounded-full border-3 border-t-transparent animate-spin" style={{ border: '3px solid #41AEA9', borderTopColor: 'transparent' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading your feed...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="feed-card" style={{ flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>No songs found</p>
            <button onClick={() => loadFeed(true)} className="btn-primary">
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        ) : (
          songs.map((song, i) => (
            <div key={song.videoId + i} data-idx={i}>
              <MusicFeedCard song={song} isActive={i === activeIndex} index={i} />
            </div>
          ))
        )}

        {/* Infinite load indicator */}
        {loading && songs.length > 0 && (
          <div className="feed-card" style={{ height: 80, background: 'transparent' }}>
            <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid #41AEA9', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {/* Listen Together Invite Banner */}
      <AnimatePresence>
        {listenInvite && (
          <div
            className="fixed top-4 left-4 right-4 z-50 glass-card p-4 flex items-center gap-3"
            style={{ maxWidth: 400, margin: '0 auto', animation: 'slideDown 0.4s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #41AEA9, #A6F6F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              🎧
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontWeight: 700, fontSize: 13 }}>
                {listenInvite.senderName} invited you to listen together!
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }} className="truncate">
                🎵 {listenInvite.song?.title}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={declineInvite} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}>
                Decline
              </button>
              <button onClick={() => acceptInvite(listenInvite.inviteId)} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}>
                Accept
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
