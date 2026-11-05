import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useMode } from '../components/providers/ModeProvider';
import { setContext, saveUser } from '../utils/storage';
import {
  ArrowRight,
  ArrowLeft,
  Palette,
  Database,
  CheckCircle,
  Cpu,
  HardDrive,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ModeToggle } from '../components/ui/ModeToggle';
import { Logo } from '../components/ui/Logo';
import logoWhite from '../assets/tesseract-mark-white.svg';
import logoDark from '../assets/tesseract-mark.svg';
import './Auth.css';

const STEP = { INTRO: 0, THEME: 1, PROFILE: 2, DEMO_DATA: 3, READY: 4 };
const USERNAME = 'solo_admin';

const DEFAULT_PROFILE = {
  name: 'Alex Chen',
  email: 'alex@tesseract.design',
  profession: 'Creative Technologist',
  domain: 'Digital & Brand Systems',
  tools: 'Figma, React, Blender',
};

export function InitialSetup() {
  const navigate = useNavigate();
  const { setSetupComplete, setDemoEnvironment } = useAppStore();
  const { mode } = useMode();

  const [step, setStep] = useState(STEP.INTRO);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [preLoadDemo, setPreLoadDemo] = useState(true);
  const [isLeavingWelcome, setIsLeavingWelcome] = useState(false);
  const welcomeTimer = useRef(null);

  useEffect(() => () => clearTimeout(welcomeTimer.current), []);

  const logoSrc = mode === 'quasar' ? logoDark : logoWhite;

  const updateProfile = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  const goBack = () => {
    setError('');
    setStep((current) => Math.max(STEP.INTRO, current - 1));
  };

  const goNext = () => {
    setError('');

    if (step === STEP.INTRO) {
      setStep(STEP.THEME);
      return;
    }

    if (step === STEP.THEME) {
      setStep(STEP.PROFILE);
      return;
    }

    if (step === STEP.PROFILE) {
      if (!profile.name.trim() || !profile.email.trim() || !profile.profession.trim()) {
        setError('Please add your name, email, and profession to continue.');
        return;
      }
      setStep(STEP.DEMO_DATA);
      return;
    }

    if (step === STEP.DEMO_DATA) {
      finalizeSetup();
    }
  };

  const beginSetup = () => {
    if (welcomeTimer.current) return;

    setIsLeavingWelcome(true);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    welcomeTimer.current = window.setTimeout(() => {
      setError('');
      setStep(STEP.THEME);
    }, reduceMotion ? 0 : 560);
  };

  const finalizeSetup = () => {
    const contextMode = preLoadDemo ? 'demo' : 'normal';

    setContext(contextMode, USERNAME);
    saveUser(USERNAME, {
      name: profile.name.trim(),
      email: profile.email.trim(),
      profession: profile.profession.trim(),
      domain: profile.domain.trim(),
      tools: profile.tools.trim(),
    });
    setDemoEnvironment(preLoadDemo);
    setStep(STEP.READY);
  };

  const enterVertex = () => {
    setSetupComplete(true);
    navigate('/dashboard');
  };

  const quickLaunchDemo = () => {
    setContext('demo', USERNAME);
    saveUser(USERNAME, {
      name: profile.name.trim() || 'Alex Chen',
      email: profile.email.trim() || 'alex@tesseract.design',
      profession: profile.profession.trim() || 'Creative Technologist',
      domain: profile.domain.trim() || 'Digital & Brand Systems',
      tools: profile.tools.trim() || 'Figma, React, Blender',
    });
    setDemoEnvironment(true);
    setSetupComplete(true);
    navigate('/dashboard');
  };

  return (
    <div className={`auth-page${step === STEP.INTRO ? ' auth-page-welcome' : ''}`}>
      {step === STEP.INTRO ? (
        <div className={`welcome-shell${isLeavingWelcome ? ' is-leaving' : ''}`}>
          <aside className="welcome-visual">
            <div className="welcome-visual-brand">
              <Logo height={28} />
              <span className="welcome-wordmark">VERTEX</span>
              <span className="welcome-badge">Local demo</span>
            </div>

            <div className="welcome-mark-wrap">
              <div className="welcome-mark-head">
                <img src={logoSrc} alt="Tesseract logo" className="welcome-mark" />
                <div className="welcome-mark-copy">
                  <span className="welcome-kicker">Project Tesseract</span>
                </div>
              </div>

              <div className="welcome-promise">
                <p className="welcome-promise-line">
                  <strong>Creator Promise</strong>
                  <span>: Open source. Forever free. Build without subscriptions.</span>
                </p>
              </div>
            </div>
          </aside>

          <div className="welcome-content">
            <h1 className="welcome-title">
              Welcome,<br />
              <span>Creative Sapien.</span>
            </h1>

            <p className="welcome-lead">Manage your relationships at every vertex.</p>

            <p className="welcome-lede">
              Tesseract VERTEX brings your freelance business into one workspace, helping you manage
              clients, projects, and daily operations without mandatory subscription fees.
            </p>

            <Button className="auth-btn-primary welcome-cta w-full" onClick={beginSetup}>
              Begin Guided Setup <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" className="w-full mt-sm" onClick={quickLaunchDemo}>
              Quick Launch Demo Workspace
            </Button>
            <p className="welcome-note">
              <ShieldCheck size={14} /> Private by design — all data stays in this browser.
            </p>
          </div>
        </div>
      ) : (
        <div className="auth-card">
          <div className="auth-brand">
            <Logo height={32} />
            <span className="auth-logo-text">VERTEX</span>
          </div>

          {/* ── STEP 1: Theme Selection ────────────────────────────────────────── */}
        {step === STEP.THEME && (
          <div>
            <div className="auth-icon-wrap auth-icon-purple"><Palette size={24} /></div>
            <h1 className="auth-title">Visual Essence</h1>
            <p className="auth-sub">Choose the interface mode that aligns with your focus.</p>

            <div className="flex flex-col items-center w-full mb-xl">
              <ModeToggle size="lg" />
              <div className="mt-lg flex justify-between w-full max-w-[240px]">
                <span className="font-body text-[11px] text-text-muted">Aether (Violet)</span>
                <span className="font-body text-[11px] text-text-muted">Quasar (Monochrome)</span>
              </div>
            </div>

            <Button className="auth-btn-primary w-full" onClick={goNext}>
              Confirm Essence <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" className="w-full mt-sm" onClick={goBack}>
              <ArrowLeft size={16} /> Back
            </Button>
          </div>
        )}

        {/* ── STEP 2: Profile ───────────────────────────────────────────────── */}
        {step === STEP.PROFILE && (
          <div>
            <div className="auth-icon-wrap auth-icon-purple"><Cpu size={24} /></div>
            <h1 className="auth-title">Your Orbit</h1>
            <p className="auth-sub">
              Tell Vertex who you are. These details personalise your local workspace.
            </p>

            <div className="auth-field-group mb-xl">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="setup-name">
                  Full Name *
                </label>
                <input
                  id="setup-name"
                  className="auth-input"
                  placeholder="e.g. Ganesh Kumar"
                  value={profile.name}
                  onChange={updateProfile('name')}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="setup-email">
                  Email Address *
                </label>
                <input
                  id="setup-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={profile.email}
                  onChange={updateProfile('email')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="setup-profession">
                  Primary Profession *
                </label>
                <input
                  id="setup-profession"
                  className="auth-input"
                  placeholder="e.g. Lead Designer"
                  value={profile.profession}
                  onChange={updateProfile('profession')}
                />
              </div>

              <div className="h-[1px] bg-border-subtle my-sm" />

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="setup-domain">
                  Primary Domain
                </label>
                <input
                  id="setup-domain"
                  className="auth-input"
                  placeholder="e.g. FinTech, SaaS, Web3"
                  value={profile.domain}
                  onChange={updateProfile('domain')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="setup-tools">
                  Key Tools
                </label>
                <input
                  id="setup-tools"
                  className="auth-input"
                  placeholder="e.g. Figma, React, Stripe"
                  value={profile.tools}
                  onChange={updateProfile('tools')}
                />
              </div>
            </div>

            {error && <p className="auth-error mb-lg">{error}</p>}

            <Button className="auth-btn-primary w-full" onClick={goNext}>
              Next Sequence <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" className="w-full mt-sm" onClick={goBack}>
              <ArrowLeft size={16} /> Back
            </Button>
          </div>
        )}

        {/* ── STEP 3: Demo Data ─────────────────────────────────────────────── */}
        {step === STEP.DEMO_DATA && (
          <div>
            <div className="auth-icon-wrap auth-icon-purple"><Database size={24} /></div>
            <h1 className="auth-title">Initialise Environment</h1>
            <p className="auth-sub">
              Your instance is private and local. Would you like to seed it with demo records to
              explore the modules?
            </p>

            <div className="auth-field-group mb-xl">
              <label className="flex items-center gap-sm cursor-pointer p-md border border-border rounded-lg hover:border-accent-primary transition-colors">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={preLoadDemo}
                    onChange={(event) => setPreLoadDemo(event.target.checked)}
                  />
                  <div className="w-5 h-5 border-2 border-border rounded transition-all peer-checked:bg-accent-primary peer-checked:border-accent-primary flex items-center justify-center">
                    {preLoadDemo && <CheckCircle size={14} className="text-white" />}
                  </div>
                </div>
                <span className="text-sm font-medium text-text-secondary">
                  Pre-load environment with mock data
                </span>
              </label>

              <p className="flex items-start gap-sm text-text-muted text-xs leading-relaxed">
                <HardDrive size={14} className="mt-[2px] shrink-0" />
                All data stays in this browser. No account, server, or cloud database is used.
              </p>
            </div>

            <Button className="auth-btn-primary w-full" onClick={goNext}>
              Initialise Vertex <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" className="w-full mt-sm" onClick={goBack}>
              <ArrowLeft size={16} /> Back
            </Button>
          </div>
        )}

        {/* ── STEP 4: Ready ─────────────────────────────────────────────────── */}
        {step === STEP.READY && (
          <div className="text-center">
            <div className="auth-icon-wrap auth-icon-purple"><CheckCircle size={24} /></div>
            <h1 className="auth-title">Your orbit is ready</h1>
            <p className="auth-sub">
              Welcome, {profile.name.split(' ')[0] || 'Creative Sapien'}. Vertex is configured for
              local-only mode.
            </p>

            <div className="auth-field-group mb-xl text-left">
              <div className="flex items-center gap-sm text-sm text-text-secondary">
                <User size={16} className="text-accent-primary shrink-0" />
                <span>
                  <strong className="text-text-primary">{profile.profession}</strong>
                  {profile.domain ? ` · ${profile.domain}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-sm text-sm text-text-secondary">
                <Database size={16} className="text-accent-primary shrink-0" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-sm text-sm text-text-secondary">
                <HardDrive size={16} className="text-accent-primary shrink-0" />
                <span>
                  {preLoadDemo ? 'Demo records loaded' : 'Clean workspace'} — data stored only in
                  this browser.
                </span>
              </div>
            </div>

            <Button className="auth-btn-primary w-full" onClick={enterVertex}>
              Enter Vertex <ArrowRight size={16} />
            </Button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
