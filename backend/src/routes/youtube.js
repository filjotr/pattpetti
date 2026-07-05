const express = require('express');
const ytSearch = require('yt-search');
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

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ songs: [] });

    const results = await ytSearch(`${q} song audio`);
    let videos = results.videos || [];
    // Filter out long compilation videos and super short shorts (1.5 min to 7 mins)
    videos = videos.filter(v => v.seconds && v.seconds >= 90 && v.seconds <= 420);
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
    let filtered = videos.filter(v => v.seconds && v.seconds >= 60 && v.seconds <= 600);
    if (filtered.length < 5) {
      filtered = videos; // Fall back to unfiltered videos so we never run out of songs!
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

module.exports = router;
