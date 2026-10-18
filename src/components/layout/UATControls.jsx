import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../ui/ConfirmModal';
import { clearTestContext, logout } from '../../utils/storage';
import { Power, RotateCcw } from 'lucide-react';
import './UATControls.css';

export function UATControls() {
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleEndUAT = () => {
    clearTestContext();
    logout();
    navigate('/setup');
  };

  return (
    <>
      <div className="uat-controls">
        <div className="uat-info">
          <span className="uat-pulse"></span>
          <span>UAT Persistence Active</span>
        </div>
        <button className="uat-end-btn" onClick={() => setIsConfirmOpen(true)}>
          <RotateCcw size={14} /> End UAT & Clear Data
        </button>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="End UAT session?"
        message="This clears all temporary test data and returns you to the onboarding screen. This cannot be undone."
        confirmLabel="End UAT & clear data"
        variant="danger"
        onConfirm={handleEndUAT}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
