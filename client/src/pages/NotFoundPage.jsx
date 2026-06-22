import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-5" style={{ background: '#0F172A' }}>
      <div style={{ fontSize: 72 }}>🎵</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, textAlign: 'center' }}>404</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 15 }}>
        This page doesn't exist — but the music never stops!
      </p>
      <button onClick={() => navigate('/feed')} className="btn-primary">
        <Home size={16} /> Go to Feed
      </button>
    </div>
  );
}
