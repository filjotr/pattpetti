const express = require('express');
const ytSearch = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const https = require('https');

const router = express.Router();

/* ---------------- SONG HELPERS ---------------- */

function parseSong(video, category) {
  return {
    videoId: video.videoId,
    title: video.title,
    channel: video.author?.name || 'Unknown Artist',
    thumbnail: video.thumbnail,
    duration: video.timestamp || '',
    category,
    hashtags: [`#${category.toLowerCase()}`, '#music'],
    publishedAt: video.ago,
  };
}

function isSingleSong(v) {
  if (!v || !v.seconds || v.seconds < 75 || v.seconds > 380) {
    return false;
  }

  const title = (v.title || '').toLowerCase();
  const author = (v.author?.name || '').toLowerCase();

  const blockWords = [
    'jukebox',
    'compilation',
    'mashup',
    'nonstop',
    'non stop',
    'hits of',
    'best of',
    'all songs',
    'full album',
    'collection',
    'mega hit',
    'top 10',
    'top 20',
    'top 30',
    'top 50',
    'top 100',
    '1 hour',
    '2 hour',
    '3 hour',
    'hours',
    'hrs',
    'lofi mix',
    'medley',
    'juke box',
    'audio jukebox',
    'evergreen hits',
  ];

  for (const word of blockWords) {
    if (title.includes(word) || author.includes(word)) {
      return false;
    }
  }

  return true;
}

/* ---------------- SEARCH ---------------- */

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({ songs: [] });
    }

    let searchQuery = q;
    const lowerQ = q.toLowerCase();
    
    // Only append keywords if the user hasn't already specified what they want
    if (!lowerQ.includes('song') && !lowerQ.includes('audio') && !lowerQ.includes('bgm') && !lowerQ.includes('music') && !lowerQ.includes('lyrics') && !lowerQ.includes('cover')) {
      searchQuery = `${q} song audio`; // Append this to enforce music results instead of movie scenes
    }

    const results = await ytSearch(searchQuery);

    let videos = results.videos || [];

    videos = videos.filter(isSingleSong);

    const songs = videos
      .slice(0, 15)
      .map((v) => parseSong(v, 'Search'));

    return res.json({ songs });
  } catch (err) {
    console.error('[YouTube Search Error]', err);

    return res.status(500).json({
      message: 'Error searching songs',
    });
  }
});

/* ---------------- TRENDING ---------------- */

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
      `${g} super hit songs`,
    ];

    const randomQuery =
      queries[Math.floor(Math.random() * queries.length)];

    const results = await ytSearch(randomQuery);

    const videos = results.videos || [];

    let filtered = videos.filter(isSingleSong);

    if (filtered.length < 5) {
      filtered = videos.filter((v) => {
        if (!v || !v.seconds || v.seconds < 60 || v.seconds > 450) {
          return false;
        }

        const title = (v.title || '').toLowerCase();
        const author = (v.author?.name || '').toLowerCase();

        return (
          !title.includes('jukebox') &&
          !title.includes('compilation') &&
          !title.includes('mashup') &&
          !title.includes('album') &&
          !title.includes('nonstop') &&
          !author.includes('jukebox')
        );
      });
    }

    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [filtered[i], filtered[j]] = [
        filtered[j],
        filtered[i],
      ];
    }

    const songs = filtered
      .slice(0, 25)
      .map((v) => parseSong(v, g));

    return res.json({ songs });
  } catch (err) {
    console.error('[YouTube Trending Error]', err);

    return res.status(500).json({
      message: 'Error fetching trending songs',
    });
  }
});

/* ---------------- DETAILS ---------------- */

router.get('/details/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        message: 'Video ID required',
      });
    }

    const results = await ytSearch(videoId);
    const video = results.videos?.find(
      (v) => v.videoId === videoId
    );

    if (!video) {
      return res.status(404).json({
        message: 'Song not found',
      });
    }

    return res.json({
      song: parseSong(video, 'Shared'),
    });
  } catch (err) {
    console.error('[YouTube Details Error]', err);

    return res.status(500).json({
      message: 'Error fetching song details',
    });
  }
});

const ytdl = require('@distube/ytdl-core');

/* =========================================================
   AUDIO STREAM
   GET /api/youtube/audio/:videoId
   HEAD /api/youtube/audio/:videoId
   ========================================================= */

router.all('/audio/:videoId', async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { videoId } = req.params;
  if (!videoId) {
    return res.status(400).json({ message: 'Video ID required' });
  }

  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(youtubeUrl);
    
    // CRITICAL: iOS Safari ONLY supports mp4/m4a audio natively. It will instantly crash and throw onError on webm.
    // We must force the mp4 container.
    let format = ytdl.chooseFormat(info.formats, { 
      filter: f => f.container === 'mp4' && f.hasAudio && !f.hasVideo 
    });
    
    if (!format) {
       // Fallback to highest audio if mp4 is somehow missing, though iOS will break on webm.
       format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    }

    if (!format) {
      return res.status(404).json({ message: 'No audio format available' });
    }

    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    
    if (format.contentLength) {
      res.setHeader('Content-Length', format.contentLength);
    }

    if (req.method === 'HEAD') {
      return res.end();
    }

    const stream = ytdl(youtubeUrl, { format });
    
    stream.on('error', (err) => {
      console.error('[Audio Proxy Error]', err);
      if (!res.headersSent) {
        res.status(502).json({ message: 'Stream failed' });
      } else {
        res.end();
      }
    });

    req.on('close', () => {
      stream.destroy();
    });

    stream.pipe(res);

  } catch (error) {
    console.error('[Audio Proxy Error]', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to stream audio', error: error.message });
    }
  }
});

module.exports = router;