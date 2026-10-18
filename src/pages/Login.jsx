import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import './Auth.css';

export function Login() {
  const navigate = useNavigate();
  const { setAuthToken } = useAppStore();
  const [password, setPassword] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || !data?.data?.token) {
        throw new Error(data?.error?.message || 'Invalid Master Key');
      }

      setAuthToken(data.data.token);
      localStorage.setItem('vtx_jwt', data.data.token);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Cannot reach the Vertex server. Confirm the app is running (npm run dev), then try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Logo height={32} />
          <span className="auth-logo-text">VERTEX</span>
        </div>

        <form onSubmit={handleLogin}>
          <div className="auth-icon-wrap auth-icon-purple"><Shield size={24} /></div>
          <h1 className="auth-title">Master Sequence</h1>
          <p className="auth-sub">Enter your master key to unlock Vertex.</p>

          <div className="auth-field-group mb-xl w-full">
            <div className="auth-pin-wrap">
              <input 
                type={showPin ? 'text' : 'password'}
                className="auth-input auth-pin-input text-center" 
                placeholder="Master Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="auth-pin-toggle"
                onClick={() => setShowPin(!showPin)}
                aria-label={showPin ? 'Hide master key' : 'Show master key'}
                aria-pressed={showPin}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="auth-error mb-lg">{error}</p>}
          <Button type="submit" className="auth-btn-primary mt-md w-full" disabled={isLoading}>
            {isLoading ? 'Decrypting...' : 'Unlock Orbit'} <ArrowRight size={16} />
          </Button>
        </form>

        <details className="auth-recovery">
          <summary>Trouble signing in?</summary>
          <p>
            The unlock key comes from your workspace environment: <code>MASTER_PASSWORD</code> in the
            project <code>.env</code> file (<code>VITE_ADMIN_PIN</code> is used when it is unset).
          </p>
          <p>
            Vertex keeps this workspace in your browser. Clearing the site's browser data returns
            Vertex to initial setup — anything not exported first cannot be recovered.
          </p>
        </details>
      </div>
    </div>
  );
}
