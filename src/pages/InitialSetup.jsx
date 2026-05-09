import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setContext, createUser, getTheme, saveData } from '../utils/storage';
import { mockData } from '../utils/mockData';
import { Shield, Sparkles, ArrowRight, Eye, EyeOff, CheckCircle, Palette, Terminal, Cpu } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ModeToggle } from '../components/ui/ModeToggle';
import { Logo } from '../components/ui/Logo';
import logoWhite from '../assets/tesseract-mark-white.svg';
import logoDark from '../assets/tesseract-mark.svg';
import './InitialSetup.css';

const STEP = { INTRO: 0, THEME: 1, PROFILE: 2, CREDS: 3 };

export function InitialSetup() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const currentMode = localStorage.getItem('vertex-mode') || 'quasar';
  const logoSrc = currentMode === 'quasar' ? logoDark : logoWhite;

  const [step, setStep] = useState(STEP.INTRO);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Form States
  const [userForm, setUserForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    profession: '',
    domain: '',
    tools: '',
    sentinelTone: 'professional', // professional | mystical | direct
    preLoadDemo: false
  });

  const handleNext = () => {
    if (step === STEP.INTRO) setStep(STEP.THEME);
    else if (step === STEP.THEME) setStep(STEP.PROFILE);
    else if (step === STEP.PROFILE) {
      if (!userForm.name || !userForm.email || !userForm.profession) {
        setError('Please fill in your primary details.');
        return;
      }
      setError('');
      setStep(STEP.CREDS);
    }
  };

  const finalizeSetup = async (e) => {
    e.preventDefault();
    if (!userForm.password) {
      setError('A master sequence (password) is required.');
      return;
    }

    try {
      // 1. Pre-load demo data if requested
      if (userForm.preLoadDemo) {
        if (mockData.clients) saveData('clients', mockData.clients);
        if (mockData.invoices) saveData('invoices', mockData.invoices);
        if (mockData.projects) saveData('projects', mockData.projects);
        if (mockData.tasks) saveData('tasks', mockData.tasks);
      }

      // 2. Save User (Central DB via API)
      await createUser({
        ...userForm,
        username: 'solo_admin', 
        setupComplete: true,
        sentinelData: {
          domain: userForm.domain,
          tools: userForm.tools,
          tone: userForm.sentinelTone,
          initializedAt: new Date().toISOString()
        }
      });

      setContext('normal', 'solo_admin');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Failed to initialize orbit.');
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

            <Button className="w-full" onClick={handleNext}>Confirm Essence <ArrowRight size={16} /></Button>
          </div>
        )}

        {/* ── STEP 2: Profile & Sentinel ───────────────────────────────────── */}
        {step === STEP.PROFILE && (
          <div className="ob-step">
            <div className="ob-icon-wrap ob-icon-purple"><Cpu size={24} /></div>
            <h1 className="ob-title">Heyy! Creative Sapien</h1>
            <p className="ob-sub">Define your identity and workspace context for the VERTEX environment.</p>

            <div className="ob-field-group gap-lg">
              <div className="flex flex-col gap-sm">
                <input 
                  className="ob-input" 
                  placeholder="Full Name" 
                  value={userForm.name}
                  onChange={e => setUserForm({...userForm, name: e.target.value})}
                />
                <input 
                  className="ob-input" 
                  placeholder="Email Address" 
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                />
                <input 
                  className="ob-input" 
                  placeholder="Primary Profession (e.g. Lead Designer)" 
                  value={userForm.profession}
                  onChange={e => setUserForm({...userForm, profession: e.target.value})}
                />
              </div>

              <div className="h-[1px] bg-border-subtle my-sm" />

              <div className="flex flex-col gap-sm">
                <input 
                  className="ob-input" 
                  placeholder="Primary Domain (e.g. FinTech, SaaS, Web3)" 
                  value={userForm.domain}
                  onChange={e => setUserForm({...userForm, domain: e.target.value})}
                />
                <input 
                  className="ob-input" 
                  placeholder="Key Tools (e.g. Figma, React, Stripe)" 
                  value={userForm.tools}
                  onChange={e => setUserForm({...userForm, tools: e.target.value})}
                />
              </div>

              <label className="flex items-center gap-sm cursor-pointer mt-sm group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="peer sr-only"
                    checked={userForm.preLoadDemo}
                    onChange={e => setUserForm({ ...userForm, preLoadDemo: e.target.checked })}
                  />
                  <div className="w-5 h-5 border-2 border-border-color rounded transition-all peer-checked:bg-accent-primary peer-checked:border-accent-primary flex items-center justify-center">
                    {userForm.preLoadDemo && <CheckCircle size={14} className="text-white" />}
                  </div>
                </div>
                <span className="text-xs font-medium text-text-muted group-hover:text-text-secondary transition-colors">Pre-load environment with demo data</span>
              </label>
            </div>

            {error && <p className="ob-error mt-md">{error}</p>}
            <Button className="ob-btn-primary mt-xl" onClick={handleNext}>Next Sequence <ArrowRight size={16} /></Button>
          </div>
        )}

        {/* ── STEP 4: Credentials ────────────────────────────────────────── */}
        {step === STEP.CREDS && (
          <form className="ob-step" onSubmit={finalizeSetup}>
            <div className="ob-icon-wrap ob-icon-purple"><Shield size={24} /></div>
            <h1 className="ob-title">Master Sequence</h1>
            <p className="ob-sub">This password secures your local storage and sensitive actions.</p>

            <div className="ob-field-group mb-xl">
              <div className="ob-pin-wrap">
                <input 
                  type={showPin ? 'text' : 'password'}
                  className="ob-input ob-pin-input" 
                  placeholder="Master Password" 
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                  autoFocus
                />
                <button type="button" className="ob-pin-toggle" onClick={() => setShowPin(!showPin)}>
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="ob-error mb-lg">{error}</p>}
            <Button type="submit" className="ob-btn-primary mt-xl">Lock and Launch my orbit <ArrowRight size={16} /></Button>
          </form>
        )}


      </div>
    </div>
  );
}
