export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
export const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

export const YOUTUBE_GENRES = {
  Malayalam: 'Malayalam songs 2024',
  Tamil: 'Tamil songs 2024',
  Hindi: 'Hindi songs 2024',
  English: 'English pop hits 2024',
  Telugu: 'Telugu songs 2024',
  Kannada: 'Kannada songs 2024',
  Korean: 'K-pop 2024',
  Arabic: 'Arabic music 2024',
  Punjabi: 'Punjabi songs 2024',
  Other: 'world music trending 2024',
};

export const MUSIC_INTERESTS = [
  { id: 'Malayalam', label: 'മലയാളം', flag: '🎵' },
  { id: 'Tamil', label: 'தமிழ்', flag: '🎶' },
  { id: 'Hindi', label: 'हिन्दी', flag: '🎸' },
  { id: 'English', label: 'English', flag: '🎤' },
  { id: 'Telugu', label: 'తెలుగు', flag: '🎼' },
  { id: 'Kannada', label: 'ಕನ್ನಡ', flag: '🥁' },
  { id: 'Korean', label: 'K-Pop', flag: '🎹' },
  { id: 'Arabic', label: 'عربي', flag: '🪘' },
  { id: 'Punjabi', label: 'ਪੰਜਾਬੀ', flag: '🎺' },
  { id: 'Other', label: 'Other', flag: '🌍' },
];

export function formatDuration(str) {
  if (!str) return '0:00';
  const match = String(str).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    const h = parseInt(match[1] || 0);
    const m = parseInt(match[2] || 0);
    const s = parseInt(match[3] || 0);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }
  if (!isNaN(str)) {
    const total = Number(str);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }
  return String(str);
}

export function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function getAvatarUrl(user) {
  if (user?.avatar) return user.avatar;
  const name = encodeURIComponent(user?.username || 'U');
  return `https://ui-avatars.com/api/?name=${name}&background=41AEA9&color=fff&size=128&bold=true`;
}
