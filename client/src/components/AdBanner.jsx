import React, { useEffect } from 'react';

export default function AdBanner({ slot, format = 'auto', responsive = 'true', style = {} }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle && process.env.NODE_ENV !== 'development') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="w-full my-2 overflow-hidden flex justify-center items-center">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '50px', ...style }}
        data-ad-client="ca-pub-1906480256084726"
        data-ad-slot={slot || "1234567890"}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
