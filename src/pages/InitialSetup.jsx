import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { setContext, setStorageMode } from '../utils/storage';
import { ArrowRight, Palette, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ModeToggle } from '../components/ui/ModeToggle';
import { Logo } from '../components/ui/Logo';
import logoWhite from '../assets/tesseract-mark-white.svg';
import logoDark from '../assets/tesseract-mark.svg';
import './InitialSetup.css';

const STEP = { INTRO: 0, THEME: 1, MOCK_DATA: 2, INIT: 3 };

export function InitialSetup() {
  const navigate = useNavigate();
  const { themeMode, setThemeMode, setSetupComplete, setDemoEnvironment, isSetupComplete } = useAppStore();

  const [step, setStep] = useState(STEP.INTRO);
  const [error, setError] = useState('');
  const [preLoadDemo, setPreLoadDemo] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    // If setup is already complete, redirect to dashboard.
    // However, the router should ideally handle this guard, 
    // we keep it here just in case.
    if (isSetupComplete) {
      navigate('/dashboard');
    }
    
    // Ensure the HTML root has the correct theme
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [isSetupComplete, themeMode, navigate]);

  const logoSrc = themeMode === 'quasar' ? logoDark : logoWhite;

  const handleNext = () => {
    setError('');
    if (step === STEP.INTRO) setStep(STEP.THEME);
    else if (step === STEP.THEME) setStep(STEP.MOCK_DATA);
    else if (step === STEP.MOCK_DATA) {
      setStep(STEP.INIT);
      initializeEnvironment();
    }
  };

  const parseApiError = async (res, fallback) => {
    try {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return data.error?.message || data.message || fallback;
      } catch {
        if (text && text.length < 200) {
          return `Server Error (${res.status}): ${text}`;
        }
        return `Server Error (${res.status}): ${res.statusText || fallback}`;
      }
    } catch {
      return fallback;
    }
  };

  const initializeEnvironment = async () => {
    setIsInitializing(true);
    setError('');

    try {
      // 1. Verify database / Supabase connection (no auth — setup runs before login)
      let verifyRes;
      try {
        verifyRes = await fetch('/api/system/verify');
      } catch {
        throw new Error(
          'Cannot reach the API server. Run `npm run dev` so both Vite and the API start together.'
        );
      }

      if (!verifyRes.ok) {
        throw new Error(await parseApiError(verifyRes, 'Failed to verify database connection.'));
      }

      const verifyData = await verifyRes.json();
      const status = verifyData.data || {};
      setDbStatus(status);
      // Persist whether this workspace runs in cloud or local-only mode.
      setStorageMode(status.configured ? 'cloud' : 'local');
      if (status.schemaReady === false) {
        console.warn(status.hint || 'Database schema not migrated yet.');
      }

      // 2. Pre-load demo data if requested
      if (preLoadDemo) {
        const seedRes = await fetch('/api/system/seed', { method: 'POST' });

        if (!seedRes.ok) {
          throw new Error(await parseApiError(seedRes, 'Failed to load demo data.'));
        }
        setDemoEnvironment(true);
        setContext('demo');
      } else {
        setDemoEnvironment(false);
        setContext('normal');
      }

      // 3. Mark setup as complete and redirect to login
      setSetupComplete(true);
      navigate('/login');
    } catch (err) {
      setIsInitializing(false);
      setError(err.message || 'Environment initialization failed.');
    }
  };

  return (
    <div className="ob-page">
      <div className="ob-card">
        {step !== STEP.INTRO && (
          <div className="ob-brand">
            <Logo height={32} />
            <span className="ob-logo-text">VERTEX</span>
          </div>
        )}

        {/* ── STEP 0: Intro ────────────────────────────────────────── */}
        {step === STEP.INTRO && (
          <div className="flex flex-col items-center text-center">
            <img src={logoSrc} alt="Tesseract Logo" className="w-24 h-24 mb-6" />
            <h1 className="font-display font-bold text-text-primary text-4xl mb-2">Welcome</h1>
            <h2 className="font-display font-bold text-text-muted text-xs uppercase tracking-[0.3em] mb-8">Creative Sapien</h2>
            
            <div className="max-w-md mx-auto mb-8">
              <p className="text-text-secondary text-[15px] leading-relaxed mb-4">
                Project TESSERACT is an open source initiative to build professional-grade tools for creators — free forever, secure, and entirely yours.
              </p>
              <p className="text-text-secondary text-[15px] leading-relaxed mb-6">
                Vertex is the first instrument in this constellation.
              </p>
              <p className="text-text-muted text-sm font-medium">
                — TESSERACT Studio
              </p>
            </div>

            <Button className="ob-btn-primary w-full" onClick={handleNext}>
              Begin new orbits <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* ── STEP 1: Theme Selection ────────────────────────────────────────── */}
        {step === STEP.THEME && (
          <div className="ob-step ob-theme-picker">
            <div className="ob-icon-wrap ob-icon-purple"><Palette size={24} /></div>
            <h1 className="ob-title">Visual Essence</h1>
            <p className="ob-sub">
              Choose the interface mode that aligns with your focus.
            </p>
            
            <div className="flex flex-col items-center w-full mb-xl">
              <ModeToggle size="lg" />
              <div className="mt-lg flex justify-between w-full max-w-[240px]">
                <span className="font-body text-[11px] text-text-muted">Aether (Violet)</span>
                <span className="font-body text-[11px] text-text-muted">Quasar (Monochrome)</span>
              </div>
            </div>

            <Button className="w-full ob-btn-primary" onClick={handleNext}>Confirm Essence <ArrowRight size={16} /></Button>
          </div>
        )}

        {/* ── STEP 2: Mock Data Option ───────────────────────────────────────── */}
        {step === STEP.MOCK_DATA && (
          <div className="ob-step">
            <div className="ob-icon-wrap ob-icon-purple"><Database size={24} /></div>
            <h1 className="ob-title">Initialise Environment</h1>
            <p className="ob-sub">Your instance is private. Would you like to seed it with demo records to explore the modules?</p>

            <div className="ob-field-group mb-xl">
              <label className="flex items-center gap-sm cursor-pointer p-md border border-border-color rounded-lg hover:border-accent-primary transition-colors">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="peer sr-only"
                    checked={preLoadDemo}
                    onChange={e => setPreLoadDemo(e.target.checked)}
                  />
                  <div className="w-5 h-5 border-2 border-border-color rounded transition-all peer-checked:bg-accent-primary peer-checked:border-accent-primary flex items-center justify-center">
                    {preLoadDemo && <CheckCircle size={14} className="text-white" />}
                  </div>
                </div>
                <span className="text-sm font-medium text-text-secondary">Pre-load environment with mock data</span>
              </label>
            </div>

            <Button className="w-full ob-btn-primary" onClick={handleNext}>Initialise Vertex <ArrowRight size={16} /></Button>
          </div>
        )}

        {/* ── STEP 3: Initialisation ────────────────────────────────────────── */}
        {step === STEP.INIT && (
          <div className="ob-step">
            <div className="ob-icon-wrap ob-icon-purple">
              {error ? <AlertTriangle size={24} className="text-red-500" /> : <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary"></div>}
            </div>
            
            <h1 className="ob-title">{error ? 'Initialisation Failed' : 'Aligning Systems...'}</h1>
            <p className="ob-sub mb-xl">
              {error ? 'Check your .env file and ensure the API server is running.' : 'Verifying database schema and provisioning your private environment.'}
            </p>

            {!error && dbStatus && (
              <div
                className="w-full"
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, rgba(148,163,184,0.3))',
                  fontSize: '13px',
                  textAlign: 'left',
                }}
              >
                <strong>Database status: </strong>
                {dbStatus.configured
                  ? (dbStatus.schemaReady ? `Connected (${dbStatus.method})` : `Connected, schema not ready (${dbStatus.method})`)
                  : 'Not configured — running in local mode'}
                {dbStatus.hint && (
                  <span className="text-text-muted" style={{ display: 'block', marginTop: '4px' }}>
                    {dbStatus.hint}
                  </span>
                )}
              </div>
            )}

            {error && (
              <div className="w-full">
                <div className="p-sm bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm mb-lg">
                  {error}
                </div>
                <Button className="w-full ob-btn-secondary" onClick={initializeEnvironment}>
                  Retry Initialisation
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
