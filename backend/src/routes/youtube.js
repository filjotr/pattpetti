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
      `${g} hit songs ${year} lyric video`,
      `${g} latest songs ${year} audio`,
      `top ${g} songs lyric`,
      `${g} hit songs ${prevYear} lyric video`,
      `${g} movie hit songs audio`,
      `latest ${g} party hit songs lyric`,
      `${g} romantic hit songs lyric video`,
      `best ${g} songs official lyric video`,
      `${g} chartbusters audio`,
      `${g} melody hit songs lyric`,
      `new ${g} hit tracks audio`,
      `${g} super hit songs lyric video`,
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

const ytdlDistube = require('@distube/ytdl-core');
let ytdlYbd;
try { ytdlYbd = require('@ybd-project/ytdl-core'); } catch(e) { ytdlYbd = null; }

/* =========================================================
   AUDIO STREAM PROXY
   GET /api/youtube/audio/:videoId
   HEAD /api/youtube/audio/:videoId
   Streams audio through backend to avoid phone IP being 403-blocked by YouTube.
   ========================================================= */

router.all('/audio/:videoId', async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { videoId } = req.params;
  if (!videoId) {
    return res.status(400).json({ message: 'Video ID required' });
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Helper: try fetching with a given ytdl implementation
  async function tryStream(ytdl) {
    const info = await ytdl.getInfo(youtubeUrl);
    let format = ytdl.chooseFormat(info.formats, {
      filter: f => f.container === 'mp4' && f.hasAudio && !f.hasVideo,
    });
    if (!format) {
      format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    }
    return { info, format, ytdl };
  }

  try {
    let result = null;
    // Try @ybd-project first (better 403 bypass), fall back to @distube
    if (ytdlYbd) {
      try { result = await tryStream(ytdlYbd); } catch(e) {
        console.warn('[Audio Proxy] ybd failed, falling back to distube:', e.message);
      }
    }
    if (!result) {
      result = await tryStream(ytdlDistube);
    }

    const { format, ytdl } = result;

    if (!format) {
      return res.status(404).json({ message: 'No audio format available' });
    }

    const contentLength = format.contentLength ? parseInt(format.contentLength) : null;
    const contentType = format.container === 'mp4' ? 'audio/mp4' : 'audio/webm';

    // Handle Range requests so ExoPlayer can seek
    const rangeHeader = req.headers['range'];
    let start = 0, end = contentLength ? contentLength - 1 : undefined;
    let isPartial = false;

    if (rangeHeader && contentLength) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1]);
        end = match[2] ? parseInt(match[2]) : contentLength - 1;
        isPartial = true;
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');

    if (contentLength) {
      if (isPartial) {
        res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
        res.setHeader('Content-Length', end - start + 1);
      } else {
        res.setHeader('Content-Length', contentLength);
      }
    }

    if (req.method === 'HEAD') {
      return res.status(isPartial ? 206 : 200).end();
    }

    const streamOptions = { format };
    if (isPartial) streamOptions.range = { start, end };

    const stream = ytdl(youtubeUrl, streamOptions);

    stream.on('error', (err) => {
      console.error('[Audio Proxy Error]', err.message);
      if (!res.headersSent) {
        res.status(502).json({ message: 'Stream failed' });
      } else {
        res.end();
      }
    });

    req.on('close', () => stream.destroy());
    res.status(isPartial ? 206 : 200);
    stream.pipe(res);

  } catch (error) {
    console.error('[Audio Proxy Error]', error.message);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to stream audio', error: error.message });
    }
  }
});

module.exports = router;