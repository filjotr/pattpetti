import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Hide if already installed or dismissed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || localStorage.getItem('hideInstall') === 'true') {
      return;
    }
    
    // On mobile, show it initially as a fallback
    if (window.innerWidth <= 768) {
      setShow(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShow(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    } else {
      alert("Please tap the 3-dots menu (⋮) in your browser and select 'Add to Home screen' or 'Install app' to install Listen With Friends!");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('hideInstall', 'true');
    setShow(false);
  };

  if (window.innerWidth > 768) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-[999] glass-card p-3 flex items-center justify-between"
          style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
              <Download size={20} color="#0F172A" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Install App</p>
              <p className="text-xs text-white/70">For full-screen & background play</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-[var(--primary)] text-[#0F172A] font-bold text-xs rounded-full shadow-lg"
            >
              Install
            </button>
            <button onClick={handleDismiss} className="p-2 text-white/50 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-[999] glass-card p-3 flex items-center justify-between"
          style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
              <Download size={20} color="#0F172A" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Install App</p>
              <p className="text-xs text-white/70">For full-screen & background play</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-[var(--primary)] text-[#0F172A] font-bold text-xs rounded-full shadow-lg"
            >
              Install
            </button>
            <button onClick={() => setShow(false)} className="p-2 text-white/50 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
