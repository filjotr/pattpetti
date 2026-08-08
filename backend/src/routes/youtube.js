const express = require('express');
const ytSearch = require('yt-search');
const play = require('play-dl');
const router = express.Router();

function parseSong(video, category) {
  return {
    videoId: video.videoId,
    title: video.title,
    channel: video.author?.name || 'Unknown Artist',
    thumbnail: video.thumbnail,
    duration: video.timestamp || '', // e.g. "3:14"
    category,
    hashtags: [`#${category.toLowerCase()}`, '#music'],
    publishedAt: video.ago,
  };
}

function isSingleSong(v) {
  if (!v || !v.seconds || v.seconds < 75 || v.seconds > 380) return false;
  const title = (v.title || '').toLowerCase();
  const author = (v.author?.name || '').toLowerCase();
  const blockWords = [
    'jukebox', 'compilation', 'mashup', 'nonstop', 'non stop',
    'hits of', 'best of', 'all songs', 'full album', 'collection',
    'mega hit', 'top 10', 'top 20', 'top 30', 'top 50', 'top 100',
    '1 hour', '2 hour', '3 hour', 'hours', 'hrs', 'lofi mix',
    'medley', 'juke box', 'audio jukebox', 'evergreen hits'
  ];
  for (const word of blockWords) {
    if (title.includes(word) || author.includes(word)) return false;
  }
  return true;
}

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ songs: [] });

    const results = await ytSearch(`${q} song audio`);
    let videos = results.videos || [];
    videos = videos.filter(isSingleSong);
    const songs = videos.slice(0, 15).map(v => parseSong(v, 'Search'));

    res.json({ songs });
  } catch (err) {
    console.error('yt-search error:', err);
    res.status(500).json({ message: 'Error searching songs' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const { genre } = req.query;
    const g = genre || 'Music';
    
    const year = new Date().getFullYear();
    const prevYear = year - 1;
    const queries = [
      `${g} hit songs ${year}`,
      `${g} latest songs ${year}`,
      `top ${g} songs`,
      `${g} hit songs ${prevYear}`,
      `${g} movie hit songs`,
      `latest ${g} party hit songs`,
      `${g} romantic hit songs`,
      `best ${g} songs official video`,
      `${g} chartbusters music video`,
      `${g} melody hit songs`,
      `new ${g} hit tracks`,
      `${g} super hit songs`
    ];
    
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const results = await ytSearch(randomQuery);
    
    let videos = results.videos || [];
    let filtered = videos.filter(isSingleSong);
    if (filtered.length < 5) {
      // Fallback: relax duration slightly up to 450s (7.5 mins), but STILL block jukeboxes and compilations!
      filtered = videos.filter(v => {
        if (!v || !v.seconds || v.seconds < 60 || v.seconds > 450) return false;
        const title = (v.title || '').toLowerCase();
        const author = (v.author?.name || '').toLowerCase();
        return !title.includes('jukebox') && !title.includes('compilation') && !title.includes('mashup') && !title.includes('album') && !title.includes('nonstop') && !author.includes('jukebox');
      });
    }

    // Shuffle the results to get a random mix
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    const songs = filtered.slice(0, 25).map(v => parseSong(v, g));

    res.json({ songs });
  } catch (err) {
    console.error('yt-search error:', err);
    res.status(500).json({ message: 'Error fetching trending songs' });
  }
});

router.get('/details/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) return res.status(400).json({ message: 'Video ID required' });
    const video = await ytSearch({ videoId });
    if (!video) return res.status(404).json({ message: 'Song not found' });
    res.json({ song: parseSong(video, 'Shared') });
  } catch (err) {
    console.error('yt-search details error:', err);
    res.status(500).json({ message: 'Error fetching song details' });
  }
});

// GET /api/youtube/audio/:videoId — Get direct audio stream URL
router.get('/audio/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) return res.status(400).json({ message: 'Video ID required' });

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    const https = require('https');
    
    // Get video info using play-dl to bypass botguard
    const info = await play.video_info(url).catch(e => null);
    
    if (!info) {
      return res.status(404).json({ message: 'Video info not found or blocked' });
    }

    const formats = info.format || info.formats || [];
    const audioFormats = formats.filter(f => f.mimeType && f.mimeType.includes('audio'));
    
    if (!audioFormats || audioFormats.length === 0) {
      return res.status(404).json({ message: 'No audio found' });
    }

    // Prefer mp4/m4a format because Android and iOS just_audio support it perfectly
    const chosen = audioFormats.find(f => f.mimeType.includes('mp4')) || audioFormats[0];

    const proxyRequest = https.get(chosen.url, (streamRes) => {
      // Forward the correct MIME type
      res.setHeader('Content-Type', chosen.mimeType || 'audio/mp4');
      
      // Crucial: Forward Content-Length so the app player knows it's a valid seekable audio file
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      if (streamRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', streamRes.headers['accept-ranges']);
      }

      // Pipe the actual youtube data to the phone
      streamRes.pipe(res);
    });
    
    proxyRequest.on('error', (err) => {
      console.error('HTTPS Proxy error:', err);
      if (!res.headersSent) res.status(500).end();
    });

  } catch (err) {
    console.error('play-dl audio error:', err.message);
    res.status(500).json({ message: 'Failed to get audio URL', error: err.message });
  }
});

module.exports = router;
