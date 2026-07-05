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
      `${g} latest hit songs ${year}`,
      `${g} new release song ${year}`,
      `${g} viral hit song audio`,
      `top trending ${g} songs ${year}`,
      `${g} super hit songs ${prevYear} ${year}`,
      `latest ${g} melody hit songs`,
      `new ${g} party dance hits ${year}`,
      `${g} romantic hits audio`,
      `${g} chartbusters official music video`,
      `${g} viral instagram reel song full audio`,
      `${g} independent music new single`,
      `${g} latest lofi remix hit song`,
      `best ${g} songs of ${year}`,
      `new ${g} movie song official video ${year}`,
      `${g} fast beat hits ${year}`,
      `${g} acoustic live performance song`
    ];
    
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const results = await ytSearch(randomQuery);
    
    let videos = results.videos || [];
    // Filter out long compilation videos and super short shorts (1.5 min to 7 mins)
    videos = videos.filter(v => v.seconds && v.seconds >= 90 && v.seconds <= 420);

    // Shuffle the results to get a random mix
    for (let i = videos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [videos[i], videos[j]] = [videos[j], videos[i]];
    }

    const songs = videos.slice(0, 20).map(v => parseSong(v, g));

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
