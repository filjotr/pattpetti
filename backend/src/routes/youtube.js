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

    const results = await ytSearch(`${q} song`);
    const songs = (results.videos || []).slice(0, 15).map(v => parseSong(v, 'Search'));

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
    
    // Create an array of possible queries to randomize the results
    const queries = [
      `${g} hit songs 2024`,
      `${g} trending music`,
      `${g} top tracks`,
      `best ${g} songs ever`,
      `${g} latest music video`,
      `${g} popular songs`
    ];
    
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const results = await ytSearch(randomQuery);
    
    // Shuffle the results to get a random mix
    let videos = results.videos || [];
    for (let i = videos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [videos[i], videos[j]] = [videos[j], videos[i]];
    }

    const songs = videos.slice(0, 15).map(v => parseSong(v, g));

    res.json({ songs });
  } catch (err) {
    console.error('yt-search error:', err);
    res.status(500).json({ message: 'Error fetching trending songs' });
  }
});

module.exports = router;
