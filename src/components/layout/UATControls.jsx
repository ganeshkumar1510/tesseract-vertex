import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearTestContext, logout } from '../../utils/storage';
import { Power, RotateCcw } from 'lucide-react';
import './UATControls.css';

export function UATControls() {
  const navigate = useNavigate();

  const handleEndUAT = () => {
    if (window.confirm('This will clear all temporary test data and return you to the onboarding screen. Proceed?')) {
      clearTestContext();
      logout();
      navigate('/setup');
    }
  };

  return (
    <div className="uat-controls">
      <div className="uat-info">
        <span className="uat-pulse"></span>
        <span>UAT Persistence Active</span>
      </div>
      <button className="uat-end-btn" onClick={handleEndUAT}>
        <RotateCcw size={14} /> End UAT & Clear Data
      </button>
    </div>
  );
}
