import React from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { User, Bell, Lock, Palette, CreditCard, Link as LinkIcon, Save, Database, Download, Upload, Trash2, RefreshCw } from 'lucide-react';
import { exportStorageJSON, importStorageJSON, wipeStorage, getUser, getContext, validateUserCredentials } from '../utils/storage';
import './Settings.css';

export function Settings() {
  const { username } = getContext();
  const user = getUser(username) || { name: 'Freelancer', email: '', bio: '', profession: '' };

  const handleExport = () => exportStorageJSON();
  
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = importStorageJSON(event.target.result);
      if (success) {
        alert('Data imported successfully! The page will now reload.');
        window.location.reload();
      } else {
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const [isWipeModalOpen, setIsWipeModalOpen] = React.useState(false);
  const [wipeError, setWipeError] = React.useState('');

  const handleWipeSubmit = async (e) => {
    e.preventDefault();
    const pass = e.target.wipePassword.value;
    if (!pass) {
      setWipeError('Password is required to wipe data.');
      return;
    }

    const isValid = validateUserCredentials(username, pass);
    
    if (isValid) {
      await wipeStorage();
      window.location.href = '/';
    } else {
      setWipeError('Master Sequence (Password) validation failed. Workspace remains locked.');
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-layout">
        {/* Settings Nav */}
        <div className="settings-nav">
          <button className="settings-nav-item active"><User size={16} /> Profile</button>
          <button className="settings-nav-item"><Palette size={16} /> Branding</button>
          <button className="settings-nav-item"><Database size={16} /> Data & Maintenance</button>
          <button className="settings-nav-item"><Bell size={16} /> Notifications</button>
          <button className="settings-nav-item"><LinkIcon size={16} /> Integrations</button>
          <button className="settings-nav-item"><Lock size={16} /> Security</button>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Module 1: Data Sovereignty Section */}
          <Card className="settings-card highlight">
            <CardHeader>Data & Sovereignty</CardHeader>
            <CardContent>
              <p className="settings-card-desc">VERTEX is private-first. You own all your data. Use these tools to move or protect your information.</p>
              
              <div className="sovereignty-grid">
                <div className="sov-action">
                  <div className="sov-info">
                    <h4>Snapshot Export</h4>
                    <p>Download your entire business as a single JSON file for backup.</p>
                  </div>
                  <Button onClick={handleExport}><Download size={16} /> Download .json</Button>
                </div>

                <div className="sov-action">
                  <div className="sov-info">
                    <h4>Restore Workspace</h4>
                    <p>Upload a previously exported snapshot to restore your data.</p>
                  </div>
                  <div className="file-input-wrap">
                    <Button variant="secondary" onClick={() => document.getElementById('import-file').click()}>
                      <Upload size={16} /> Upload .json
                    </Button>
                    <input 
                      id="import-file" 
                      type="file" 
                      accept=".json" 
                      style={{ display: 'none' }} 
                      onChange={handleImport} 
                    />
                  </div>
                </div>

                <div className="sov-action danger-zone">
                  <div className="sov-info">
                    <h4>Wipe Memory</h4>
                    <p>Permanently delete everything and start with a clean slate.</p>
                  </div>
                  <Button variant="ghost" className="btn-danger" onClick={() => setIsWipeModalOpen(true)}>
                    <Trash2 size={16} /> Master Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Modal isOpen={isWipeModalOpen} onClose={() => setIsWipeModalOpen(false)} title="Master Reset">
            <form onSubmit={handleWipeSubmit} className="flex-col gap-md">
               <p className="text-secondary" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
                 <strong>WARNING:</strong> This action is irreversible. All of your clients, projects, tasks, and settings will be permanently erased.
               </p>
               <Input name="wipePassword" type="password" placeholder="Master Sequence (Password)" autoFocus required />
               {wipeError && <p className="text-danger" style={{ fontSize: '14px', margin: 0 }}>{wipeError}</p>}
               <Button type="submit" variant="ghost" className="btn-danger" style={{ marginTop: '8px' }}>
                 Confirm Purge
               </Button>
            </form>
          </Modal>

          <Card className="settings-card">
            <CardHeader>Personal Information</CardHeader>
            <CardContent className="settings-form">
              <div className="form-group">
                <label>Display Name</label>
                <Input defaultValue={user.name} />
              </div>
              
              <div className="form-group">
                <label>Email Address / Handle</label>
                <Input defaultValue={user.email} type="email" />
              </div>
              
              <div className="form-group">
                <label>Sentinel Bio</label>
                <textarea className="form-textarea" rows="4" defaultValue={user.sentinelData?.bio || user.bio}></textarea>
              </div>

              <div className="form-actions">
                <Button variant="primary"><Save size={16} /> Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="settings-card">
            <CardHeader>Workspace</CardHeader>
            <CardContent className="settings-form">
              <div className="form-group">
                <label>Craft / Profession</label>
                <Input defaultValue={user.profession} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select className="form-select" defaultValue="USD">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
