const express = require('express');
const ytSearch = require('yt-search');
const play = require('play-dl');
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

    const results = await ytSearch(`${q} song audio`);

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

/* =========================================================
   AUDIO STREAM
   GET /api/youtube/audio/:videoId
   HEAD /api/youtube/audio/:videoId
   ========================================================= */

router.all('/audio/:videoId', async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({
      message: 'Method Not Allowed',
    });
  }

  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({
      message: 'Video ID required',
    });
  }

  console.log(
    `[Audio API] ${req.method} request for video: ${videoId}`
  );

  try {
    const youtubeUrl =
      `https://www.youtube.com/watch?v=${videoId}`;

    /* Get fresh YouTube information */
    let info;

    try {
      info = await play.video_info(youtubeUrl);
    } catch (error) {
      console.error(
        '[Audio API] play-dl error:',
        error.message
      );

      return res.status(502).json({
        message: 'Unable to get YouTube video information',
      });
    }

    if (!info) {
      return res.status(404).json({
        message: 'Video information not found',
      });
    }

    const formats =
      info.format ||
      info.formats ||
      [];

    /* Find audio-only formats */
    const audioFormats = formats.filter((format) => {
      const mime = format.mimeType || '';

      return mime.startsWith('audio/');
    });

    if (audioFormats.length === 0) {
      console.error(
        `[Audio API] No audio formats found for ${videoId}`
      );

      return res.status(404).json({
        message: 'No audio format available',
      });
    }

    /*
      Prefer MP4/M4A audio because Android audio players
      generally handle AAC/M4A very well.
    */
    const chosen =
      audioFormats.find((format) =>
        (format.mimeType || '')
          .toLowerCase()
          .includes('mp4')
      ) ||
      audioFormats.find((format) =>
        (format.mimeType || '')
          .toLowerCase()
          .includes('webm')
      ) ||
      audioFormats[0];

    if (!chosen.url) {
      return res.status(404).json({
        message: 'Audio URL unavailable',
      });
    }

    console.log(
      `[Audio API] Selected format: ${chosen.mimeType}`
    );

    /* ---------------- REQUEST HEADERS ---------------- */

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/131.0.0.0 Safari/537.36',
      Accept: '*/*',
    };

    /* Forward Range request */
    if (req.headers.range) {
      headers.Range = req.headers.range;

      console.log(
        `[Audio API] Range: ${req.headers.range}`
      );
    }

    const proxyRequest = https.get(
      chosen.url,
      { headers },
      (sourceResponse) => {
        console.log(
          `[Audio API] YouTube status: ${sourceResponse.statusCode}`
        );

        /*
          Forward correct status:
          200 = full file
          206 = partial content / seek
        */

        res.status(sourceResponse.statusCode || 200);

        /* Content type */
        res.setHeader(
          'Content-Type',
          chosen.mimeType || 'audio/mp4'
        );

        /* Range support */
        res.setHeader(
          'Accept-Ranges',
          'bytes'
        );

        /* Content length */
        if (sourceResponse.headers['content-length']) {
          res.setHeader(
            'Content-Length',
            sourceResponse.headers['content-length']
          );
        }

        /* Content range */
        if (sourceResponse.headers['content-range']) {
          res.setHeader(
            'Content-Range',
            sourceResponse.headers['content-range']
          );
        }

        /* Cache control */
        res.setHeader(
          'Cache-Control',
          'no-cache'
        );

        /*
          HEAD request:
          Send headers only.
        */
        if (req.method === 'HEAD') {
          sourceResponse.destroy();
          return res.end();
        }

        /* Stream audio */
        sourceResponse.pipe(res);

        sourceResponse.on('error', (error) => {
          console.error(
            '[Audio API] Source stream error:',
            error.message
          );

          if (!res.headersSent) {
            res.status(502).json({
              message: 'YouTube stream error',
            });
          } else {
            res.destroy();
          }
        });
      }
    );

    proxyRequest.setTimeout(30000, () => {
      console.error(
        '[Audio API] Proxy timeout'
      );

      proxyRequest.destroy();

      if (!res.headersSent) {
        res.status(504).json({
          message: 'Audio stream timeout',
        });
      }
    });

    proxyRequest.on('error', (error) => {
      console.error(
        '[Audio API] Proxy error:',
        error.message
      );

      if (!res.headersSent) {
        res.status(502).json({
          message: 'Audio proxy error',
        });
      }
    });

    /*
      If client disconnects, stop YouTube request.
    */
    req.on('close', () => {
      if (!res.writableEnded) {
        proxyRequest.destroy();
      }
    });

  } catch (error) {
    console.error(
      '[Audio API] Unexpected error:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Failed to stream audio',
      });
    }
  }
});

module.exports = router;