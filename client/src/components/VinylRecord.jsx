import React, { useRef } from 'react';

export default function VinylRecord({ thumbnail, isPlaying, size = 280, progress = 0, onSeek }) {
  const svgRef = useRef(null);

  const handlePointer = (e) => {
    if (!onSeek || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.clientX;
    const clientY = e.clientY;

    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    angle = angle + 90; // Shift 0 to top
    if (angle < 0) angle += 360;

    onSeek(angle / 360 * 100);
  };

  const strokeWidth = 6;
  const radius = (size / 2) + 12; // 12px gap from vinyl
  const svgSize = size + 64; // Room for stroke and hit area
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className="relative flex items-center justify-center" 
      style={{ width: svgSize, height: svgSize }}
    >
      {/* SVG Progress Ring */}
      <svg 
        ref={svgRef}
        width={svgSize}
        height={svgSize}
        className="absolute inset-0 z-10"
        style={{ transform: 'rotate(-90deg)', touchAction: 'none' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0) {
            e.stopPropagation();
            handlePointer(e);
          }
        }}
      >
        {/* Background track */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress track */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
        {/* Invisible thick hit area for easy drag */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="transparent"
          strokeWidth={40}
          className="cursor-pointer"
        />
      </svg>

      {/* The Vinyl */}
      <div
        className="vinyl absolute z-0"
        style={{
          width: size,
          height: size,
          background: thumbnail
            ? `url(${thumbnail}) center/cover no-repeat`
            : 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)',
          animation: isPlaying ? 'spin 10s linear infinite' : 'none',
        }}
      >
        {/* Center pin hole */}
        <div className="vinyl-center" />
      </div>
    </div>
  );
}
