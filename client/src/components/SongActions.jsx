import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, UserPlus, UserCheck, Users } from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { formatCount } from '../utils/config';

export default function SongActions({ song, onComment, onListenTogether }) {
  const { likedSongs, likeCounts, likeSong } = useFeed();
  const { followingSet, followUser, sendListenInvite } = useSocial();
  const { user } = useAuth();
  const [shareMsg, setShareMsg] = useState('');

  const vid = song?.videoId;
  const isLiked = likedSongs.has(vid);
  const likeCount = likeCounts[vid] || 0;

  const handleLike = () => {
    if (user?.isGuest) return;
    likeSong(song);
  };

  const handleShare = async () => {
    const shareData = {
      title: song.title,
      text: `🎵 ${song.title} by ${song.channel} — Listen with Friends!`,
      url: `${window.location.origin}/#/feed?song=${vid}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareMsg('Link copied!');
        setTimeout(() => setShareMsg(''), 2000);
      }
    } catch {}
  };

  return (
    <div className="flex flex-col gap-3 items-center" style={{ zIndex: 20 }}>
      {/* Like */}
      <button
        id="btn-like-song"
        onClick={handleLike}
        className={`action-btn ${isLiked ? 'liked' : ''}`}
        aria-label="Like song"
      >
        <Heart
          size={26}
          fill={isLiked ? '#f43f5e' : 'none'}
          className={`transition-transform ${isLiked ? 'scale-110' : ''}`}
        />
        <span className="action-btn-count">{formatCount(likeCount)}</span>
      </button>

      {/* Comment */}
      <button
        id="btn-comment-song"
        onClick={onComment}
        className="action-btn"
        aria-label="Comments"
      >
        <MessageCircle size={26} />
        <span className="action-btn-count">{formatCount(song?.commentCount || 0)}</span>
      </button>

      {/* Share */}
      <button
        id="btn-share-song"
        onClick={handleShare}
        className="action-btn"
        aria-label="Share"
      >
        <Share2 size={26} />
        {shareMsg && <span className="action-btn-count text-teal-300 font-bold">{shareMsg}</span>}
      </button>

      {/* Listen Together */}
      <button
        id="btn-listen-together"
        onClick={() => {
          if (user?.isGuest) return;
          onListenTogether?.();
        }}
        className="action-btn"
        aria-label="Listen Together"
      >
        <Users size={26} />
      </button>
    </div>
  );
}
