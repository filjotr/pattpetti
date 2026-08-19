import { API_BASE_URL, YOUTUBE_GENRES } from './config';

// Fallback mock songs (Embeddable Hits)
const MOCK_SONGS = [
  { videoId: 'tOM-nWPcR4U', title: 'Illuminati | Aavesham', channel: 'Sushin Shyam', thumbnail: 'https://i.ytimg.com/vi/tOM-nWPcR4U/hqdefault.jpg', duration: 'PT3M15S', category: 'Malayalam', hashtags: ['#aavesham', '#sushinshyam'] },
  { videoId: 'W-TE_Ys4iqM', title: 'Darshana | Hridayam', channel: 'Hesham Abdul Wahab', thumbnail: 'https://i.ytimg.com/vi/W-TE_Ys4iqM/hqdefault.jpg', duration: 'PT4M30S', category: 'Malayalam', hashtags: ['#hridayam', '#romantic'] },
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
  const genres = Array.isArray(interests) && interests.length > 0 ? interests : ['English'];
  // Take up to 3 random selected genres per fetch to keep network fast and diverse
  const selectedGenres = [...genres].sort(() => 0.5 - Math.random()).slice(0, Math.min(3, genres.length));

  try {
    const promises = selectedGenres.map(genre =>
      fetch(`${API_BASE_URL}/youtube/trending?genre=${encodeURIComponent(genre)}`)
        .then(res => res.json())
        .catch(() => ({ songs: [] }))
    );
    const results = await Promise.all(promises);
    
    let allSongs = [];
    results.forEach(data => {
      if (data.songs && Array.isArray(data.songs)) {
        allSongs.push(...data.songs);
      }
    });

    if (allSongs.length > 0) {
      // Deduplicate by videoId
      const seen = new Set();
      const uniqueSongs = allSongs.filter(s => {
        if (seen.has(s.videoId)) return false;
        seen.add(s.videoId);
        return true;
      });

      // Shuffle the combined multi-language playlist!
      for (let i = uniqueSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueSongs[i], uniqueSongs[j]] = [uniqueSongs[j], uniqueSongs[i]];
      }

      return { songs: uniqueSongs, nextPageToken: `next-page-${Date.now()}` };
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
