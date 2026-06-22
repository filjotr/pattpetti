import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Music2, ArrowRight, Chrome } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MUSIC_INTERESTS } from '../utils/config';

export default function OnboardingPage() {
  const { user, login, register, loginAsGuest, saveInterests } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('auth'); // 'auth' | 'interests'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    if (user && step === 'auth') {
      navigate('/feed', { replace: true });
    }
  }, [user, step, navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      setStep('interests');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate('/feed');
  };

  const toggleGenre = (id) => {
    setSelectedGenres(p => p.includes(id) ? p.filter(g => g !== id) : [...p, id]);
  };

  const handleInterestsDone = async () => {
    if (selectedGenres.length === 0) {
      navigate('/feed');
      return;
    }
    await saveInterests(selectedGenres);
    navigate('/feed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0F172A' }}>
      {/* Ambient glows */}
      <div className="ambient-bg">
        <div className="glow-1" />
        <div className="glow-2" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'auth' && (
          <motion.div
            key="auth"
            className="w-full max-w-sm z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <div style={{ width: 64, height: 64, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: 'var(--neu-shadow)' }}>
                <Music2 size={30} color="#fff" />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, color: '#fff' }}>
                Listen With Friends
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                Discover music together
              </p>
            </div>

            {/* Auth card */}
            <div className="glass-card p-6">
              {/* Mode toggle */}
              <div className="flex rounded-xl overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {['login', 'register'].map(m => (
                  <button
                    key={m}
                    onClick={() => { setAuthMode(m); setError(''); }}
                    className="flex-1 py-2.5 text-sm font-bold transition-all"
                    style={{
                      background: authMode === m ? 'rgba(65,174,169,0.2)' : 'transparent',
                      color: authMode === m ? '#41AEA9' : 'rgba(255,255,255,0.4)',
                      borderRadius: 10,
                    }}
                  >
                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div className="relative">
                    <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="glass-input"
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: 42 }}
                    required
                  />
                </div>
                <div className="relative">
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: 42, paddingRight: 42 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full" id="btn-auth-submit">
                  {loading ? 'Please wait...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="divider flex-1" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>or</span>
                <div className="divider flex-1" />
              </div>

              {/* Google OAuth */}
              <button
                id="btn-google-login"
                className="btn-ghost w-full mb-3"
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`}
              >
                <Chrome size={18} style={{ color: '#EA4335' }} />
                Continue with Google
              </button>

              {/* Guest */}
              <button
                id="btn-guest"
                className="w-full py-3 text-sm font-semibold transition-all"
                style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={handleGuest}
              >
                Continue as Guest →
              </button>
            </div>
          </motion.div>
        )}

        {step === 'interests' && (
          <motion.div
            key="interests"
            className="w-full max-w-sm z-10"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🎵</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
                What do you love?
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                Pick your music languages & genres to personalize your feed
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {MUSIC_INTERESTS.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={`genre-pill ${selectedGenres.includes(g.id) ? 'selected' : ''}`}
                >
                  <span>{g.flag}</span>
                  <span>{g.label}</span>
                </button>
              ))}
            </div>

            <button
              id="btn-interests-done"
              onClick={handleInterestsDone}
              className="btn-primary w-full"
            >
              {selectedGenres.length > 0 ? `Continue with ${selectedGenres.length} selected` : 'Skip for now'}
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
