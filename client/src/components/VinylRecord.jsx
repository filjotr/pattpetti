import React from 'react';

export default function VinylRecord({ thumbnail, isPlaying, size = 280 }) {
  return (
    <div
      className="vinyl"
      style={{
        width: size,
        height: size,
        background: thumbnail
          ? `url(${thumbnail}) center/cover no-repeat`
          : 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)',
        animation: isPlaying ? 'spin 10s linear infinite' : 'none',
        flexShrink: 0,
      }}
    >
      {/* Center pin hole */}
      <div className="vinyl-center" />
      {/* Teal glow overlay when playing */}
      {isPlaying && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 30%, rgba(65,174,169,0.08) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
