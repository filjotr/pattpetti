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
    
    // Create an array of possible queries to randomize the results
    const queries = [
      `${g} new single music video 2024`,
      `${g} latest hit song audio 2024`,
      `latest ${g} songs 2024 single`,
      `new ${g} tracks official audio`,
      `${g} new songs this week`
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

    const songs = videos.slice(0, 15).map(v => parseSong(v, g));

    res.json({ songs });
  } catch (err) {
    console.error('yt-search error:', err);
    res.status(500).json({ message: 'Error fetching trending songs' });
  }
});

module.exports = router;
