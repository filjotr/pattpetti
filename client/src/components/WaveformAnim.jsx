import React from 'react';

const DELAYS = [0, 0.15, 0.3, 0.15, 0, 0.2, 0.35];

export default function WaveformAnim({ isPlaying = true, bars = 7 }) {
  return (
    <div className="waveform" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`wave-bar ${!isPlaying ? 'paused' : ''}`}
          style={{ animationDelay: `${DELAYS[i % DELAYS.length]}s` }}
        />
      ))}
    </div>
  );
}
