import React, { useEffect, useRef } from 'react';

/**
 * AdsterraBanner — Adsterra 468×60 iframe Banner
 * Usage: <AdsterraBanner />
 */
export default function AdsterraBanner({ style = {} }) {
  const containerRef = useRef(null);
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current || !containerRef.current) return;
    injected.current = true;

    window.atOptions = {
      key: 'dc4ca82109912680146dcd66ff54b63c',
      format: 'iframe',
      height: 60,
      width: 468,
      params: {},
    };

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://bauval.org/22/dc4ca82109912680146dcd66ff54b63c';
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
        padding: '6px 0',
        ...style,
      }}
    >
      <div
        id="container-daa8325fd4f9b79df124b3190a8a7b5d"
        ref={containerRef}
        style={{ maxWidth: 468, width: '100%' }}
      />
    </div>
  );
}

/**
 * AdsterraDirectLink — Adsterra Direct Link as a subtle sponsored label
 * Usage: <AdsterraDirectLink />
 */
export function AdsterraDirectLink({ label = 'Sponsored', style = {} }) {
  return (
    <a
      href="https://araplhn.org/4/f9c325068e7c375bdd4ce0790511d358"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        textDecoration: 'none',
        padding: '2px 8px',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
        transition: 'color 0.2s',
        ...style,
      }}
    >
      <span style={{ fontSize: 8, opacity: 0.5 }}>AD</span>
      {label}
    </a>
  );
}

