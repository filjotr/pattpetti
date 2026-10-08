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

const youtubedlExec = require('youtube-dl-exec');
const http = require('http');

// Simple in-memory cache for extracted audio URLs (expires in 4 hours)
const audioUrlCache = new Map();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

function getCachedUrl(videoId) {
  const entry = audioUrlCache.get(videoId);
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.url;
  audioUrlCache.delete(videoId);
  return null;
}

function setCachedUrl(videoId, url) {
  audioUrlCache.set(videoId, { url, time: Date.now() });
}

/* =========================================================
   AUDIO STREAM PROXY  (yt-dlp based)
   GET  /api/youtube/audio/:videoId
   HEAD /api/youtube/audio/:videoId
   Uses yt-dlp to extract the direct audio URL server-side,
   then proxies the stream to the client. This avoids the
   phone's IP being 403-blocked by YouTube CDN.
   ========================================================= */

router.all('/audio/:videoId', async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: 'Video ID required' });

  try {
    // Step 1: Extract direct audio URL using yt-dlp (cached)
    let audioUrl = getCachedUrl(videoId);
    if (!audioUrl) {
      console.log(`[Audio Proxy] Extracting URL for ${videoId}...`);
      
      // Use android_embedded client which has lower rate-limiting from YouTube
      const output = await youtubedlExec(`https://www.youtube.com/watch?v=${videoId}`, {
        format: 'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio',
        getUrl: true,
        noPlaylist: true,
        extractorArgs: 'youtube:player_client=android_embedded',
        addHeader: [
          'User-Agent:com.google.android.youtube/18.43.45 (Linux; U; Android 13; gzip)',
        ],
      });
      
      // output is either a string URL or may have newlines
      audioUrl = (typeof output === 'string' ? output : output.stdout || '').trim().split('\n')[0];
      if (!audioUrl || !audioUrl.startsWith('http')) {
        return res.status(502).json({ message: 'Could not extract audio URL' });
      }
      setCachedUrl(videoId, audioUrl);
      console.log(`[Audio Proxy] URL extracted for ${videoId}`);
    }


    // Step 2: Proxy the audio stream from YouTube CDN → client
    // Forward the Range header if present (needed for seeking in ExoPlayer)
    const proxyHeaders = {
      'User-Agent': 'com.google.android.youtube/18.43.45 (Linux; U; Android 13; gzip)',
    };
    if (req.headers['range']) {
      proxyHeaders['Range'] = req.headers['range'];
    }

    const parsedUrl = new URL(audioUrl);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const ytReq = transport.request(
      audioUrl,
      { headers: proxyHeaders, method: req.method },
      (ytRes) => {
        // Pass through status and headers
        const status = ytRes.statusCode;
        const forwardHeaders = [
          'content-type', 'content-length', 'content-range',
          'accept-ranges', 'cache-control',
        ];
        forwardHeaders.forEach(h => {
          if (ytRes.headers[h]) res.setHeader(h, ytRes.headers[h]);
        });
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(status);

        if (req.method === 'HEAD') {
          return res.end();
        }
        ytRes.pipe(res);
        req.on('close', () => ytRes.destroy());
      }
    );

    ytReq.on('error', (err) => {
      console.error('[Audio Proxy] Stream error:', err.message);
      // If the cached URL expired (403), purge cache and tell client to retry
      if (err.message.includes('403') || err.message.includes('ECONNRESET')) {
        audioUrlCache.delete(videoId);
      }
      if (!res.headersSent) res.status(502).json({ message: 'Upstream stream error' });
    });

    ytReq.end();

  } catch (error) {
    console.error('[Audio Proxy] Error:', error.message);
    // Purge bad cache entry
    audioUrlCache.delete(videoId);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to stream audio', error: error.message });
    }
  }
});

module.exports = router;

