import { API_BASE_URL, YOUTUBE_GENRES } from './config';

// Fallback mock songs (Malayalam Hits included)
const MOCK_SONGS = [
  { videoId: 'tOM-nWPcR4U', title: 'Illuminati | Aavesham', channel: 'Sushin Shyam', thumbnail: 'https://i.ytimg.com/vi/tOM-nWPcR4U/hqdefault.jpg', duration: 'PT3M15S', category: 'Malayalam', hashtags: ['#aavesham', '#sushinshyam'] },
  { videoId: 'W-TE_Ys4iqM', title: 'Darshana | Hridayam', channel: 'Hesham Abdul Wahab', thumbnail: 'https://i.ytimg.com/vi/W-TE_Ys4iqM/hqdefault.jpg', duration: 'PT4M30S', category: 'Malayalam', hashtags: ['#hridayam', '#romantic'] },
  { videoId: 'XJp4_m_eP7Y', title: 'Manavalan Thug | Thallumaala', channel: 'Dabzee', thumbnail: 'https://i.ytimg.com/vi/XJp4_m_eP7Y/hqdefault.jpg', duration: 'PT3M5M', category: 'Malayalam', hashtags: ['#thallumaala', '#rap'] },
  { videoId: 'tX3O4U7tMqw', title: 'Neela Nilave | RDX', channel: 'Kapil Kapilan', thumbnail: 'https://i.ytimg.com/vi/tX3O4U7tMqw/hqdefault.jpg', duration: 'PT3M50S', category: 'Malayalam', hashtags: ['#rdx', '#hit'] },
  { videoId: 'a3g4D0eIof0', title: 'Aaluma Doluma | Vedalam', channel: 'Anirudh', thumbnail: 'https://i.ytimg.com/vi/a3g4D0eIof0/hqdefault.jpg', duration: 'PT4M15S', category: 'Tamil', hashtags: ['#tamil', '#anirudh'] },
  { videoId: 'lp-EBQmnFMc', title: 'Kesariya', channel: 'Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/lp-EBQmnFMc/hqdefault.jpg', duration: 'PT4M26S', category: 'Hindi', hashtags: ['#hindi', '#bollywood'] },
  { videoId: 'HQmmM_qwG4k', title: 'Butter', channel: 'BTS', thumbnail: 'https://i.ytimg.com/vi/HQmmM_qwG4k/hqdefault.jpg', duration: 'PT2M45S', category: 'Korean', hashtags: ['#kpop', '#bts'] },
];

function parseSong(item, category = 'English') {
  const id = typeof item.id === 'object' ? item.id.videoId : item.id;
  const snippet = item.snippet || {};
  const content = item.contentDetails || {};
  return {
    videoId: id,
    title: snippet.title || 'Unknown Song',
    channel: snippet.channelTitle || 'Unknown Artist',
    thumbnail:
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      '',
    duration: content.duration || '',
    category,
    hashtags: [`#${category.toLowerCase()}`, '#music'],
    publishedAt: snippet.publishedAt,
  };
}

export async function fetchTrendingByGenre(interests = ['English'], pageToken = '') {
  const genre = interests[Math.floor(Math.random() * interests.length)] || 'English';

  try {
    const res = await fetch(`${API_BASE_URL}/youtube/trending?genre=${encodeURIComponent(genre)}`);
    const data = await res.json();
    if (data.songs && data.songs.length > 0) {
      return { songs: data.songs, nextPageToken: `next-page-${Date.now()}` };
    }
  } catch (err) {
    console.error('YouTube fetch error:', err);
  }
  
  return { songs: MOCK_SONGS, nextPageToken: null };
}

export async function searchYouTube(query, pageToken = '') {
  try {
    const res = await fetch(`${API_BASE_URL}/youtube/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.songs) {
      return { songs: data.songs, nextPageToken: null };
    }
  } catch (err) {
    console.error('YouTube search error:', err);
  }
  
  return { songs: [], nextPageToken: null };
}

export { MOCK_SONGS };
