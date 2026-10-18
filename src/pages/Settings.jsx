import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { User, Bell, Lock, Palette, Link as LinkIcon, Save, Database, Download, Upload, Trash2 } from 'lucide-react';
import { exportStorageJSON, importStorageJSON, wipeStorage, getLocalUser, getContext, validateUserCredentials, saveUser } from '../utils/storage';
import { ThemeSlider } from '../components/ui/ThemeSlider';
import { useToast } from '../hooks/useToast';
import { useSubmitGuard } from '../hooks/useSubmitGuard';
import './Settings.css';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'data', label: 'Data & Maintenance', icon: Database },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: LinkIcon },
  { id: 'security', label: 'Security', icon: Lock },
];

export function Settings() {
  const { username } = getContext();
  const [user, setUser] = useState(() => getLocalUser(username));
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    email: user.email || '',
    bio: user.bio || '',
    profession: user.profession || '',
    currency: user.currency || 'USD',
  });
  const [workspaceName, setWorkspaceName] = useState(user.workspace || 'VERTEX Studio');
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeError, setWipeError] = useState('');
  const [securityForm, setSecurityForm] = useState({ current: '', next: '', confirm: '' });
  const [securityError, setSecurityError] = useState('');
  const toast = useToast();
  const { isSubmitting: isWiping, guard: guardWipe } = useSubmitGuard();

  useEffect(() => {
    const onDataChange = (e) => {
      if (!e.detail?.key || e.detail.key === 'user') {
        const next = getLocalUser(username);
        setUser(next);
        setProfileForm({
          name: next.name || '',
          email: next.email || '',
          bio: next.bio || '',
          profession: next.profession || '',
          currency: next.currency || 'USD',
        });
        setWorkspaceName(next.workspace || 'VERTEX Studio');
      }
    };
    window.addEventListener('vertex-data-change', onDataChange);
    return () => window.removeEventListener('vertex-data-change', onDataChange);
  }, [username]);

  const handleExport = () => exportStorageJSON();

  const handleImport = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const success = importStorageJSON(event.target.result);
      if (success) {
        toast.success('Workspace restored', 'Snapshot imported successfully.');
      } else {
        toast.error('Import failed', 'Ensure the file is a valid Vertex snapshot.');
      }
    };
    reader.readAsText(file);
  };

  const handleWipeSubmit = guardWipe(async (e) => {
    e.preventDefault();
    const pass = e.target.wipePassword.value;
    if (!pass) {
      setWipeError('Password is required to wipe data.');
      return;
    }

    const isValid = validateUserCredentials(username, pass);

    if (isValid) {
      await wipeStorage();
      window.location.replace('/');
    } else {
      setWipeError('Master Sequence (Password) validation failed. Workspace remains locked.');
    }
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    saveUser(username, {
      name: profileForm.name,
      email: profileForm.email,
      bio: profileForm.bio,
      profession: profileForm.profession,
      currency: profileForm.currency,
    });
    toast.success('Profile updated');
  };

  const handleSaveBranding = (e) => {
    e.preventDefault();
    saveUser(username, { workspace: workspaceName });
    toast.success('Workspace updated');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setSecurityError('');
    if (!securityForm.next || securityForm.next !== securityForm.confirm) {
      setSecurityError('New password and confirmation must match.');
      return;
    }
    if (!validateUserCredentials(username, securityForm.current)) {
      setSecurityError('Current password is incorrect.');
      return;
    }
    saveUser(username, { password: securityForm.next });
    setSecurityForm({ current: '', next: '', confirm: '' });
    toast.success('Workspace password updated', 'This does not change the API master key in .env.');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-nav">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <Card className="settings-card">
              <CardHeader>Personal Information</CardHeader>
              <CardContent>
                <form className="settings-form" onSubmit={handleSaveProfile}>
                  <div className="form-group">
                    <label>Display Name</label>
                    <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email Address / Handle</label>
                    <Input value={profileForm.email} type="email" onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Bio</label>
                    <textarea
                      className="form-textarea"
                      rows="4"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Craft / Profession</label>
                    <Input value={profileForm.profession} onChange={(e) => setProfileForm({ ...profileForm, profession: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      className="form-select"
                      value={profileForm.currency}
                      onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <Button type="submit" variant="primary"><Save size={16} /> Save Changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'branding' && (
            <Card className="settings-card">
              <CardHeader>Workspace</CardHeader>
              <CardContent>
                <form className="settings-form" onSubmit={handleSaveBranding}>
                  <div className="form-group">
                    <label>Workspace Name</label>
                    <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Theme</label>
                    <ThemeSlider />
                  </div>
                  <div className="form-actions">
                    <Button type="submit" variant="primary"><Save size={16} /> Save Changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'data' && (
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
          )}

          {activeTab === 'notifications' && (
            <Card className="settings-card">
              <CardHeader>Notifications</CardHeader>
              <CardContent>
                <p className="coming-soon">
                  Notification controls are intentionally out of scope for the Beta Mark - ii stability release.
                  Vertex does not send email or push notifications yet — no delivery channel is wired up.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'integrations' && (
            <Card className="settings-card">
              <CardHeader>Integrations</CardHeader>
              <CardContent>
                <p className="coming-soon">
                  Third-party integrations are not part of the Beta Mark - ii stability release and no
                  timeline is committed. Vertex currently keeps all data local to your workspace.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="settings-card">
              <CardHeader>Change Workspace Password</CardHeader>
              <CardContent>
                <p className="settings-card-desc">Updates the password used for wipe confirmation and other sensitive local actions. It does not rewrite the API master key in `.env`.</p>
                <form className="settings-form" onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <Input type="password" value={securityForm.current} onChange={(e) => setSecurityForm({ ...securityForm, current: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <Input type="password" value={securityForm.next} onChange={(e) => setSecurityForm({ ...securityForm, next: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <Input type="password" value={securityForm.confirm} onChange={(e) => setSecurityForm({ ...securityForm, confirm: e.target.value })} required />
                  </div>
                  {securityError && <p className="text-danger">{securityError}</p>}
                  <div className="form-actions">
                    <Button type="submit" variant="primary"><Lock size={16} /> Update Password</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={isWipeModalOpen} onClose={() => setIsWipeModalOpen(false)} title="Master Reset">
        <form onSubmit={handleWipeSubmit} className="flex-col gap-md">
          <p className="text-secondary" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
            <strong>WARNING:</strong> This action is irreversible. All of your clients, projects, tasks, and settings will be permanently erased.
          </p>
          <Input name="wipePassword" type="password" placeholder="Master Sequence (Password)" autoFocus required />
          {wipeError && <p className="text-danger" style={{ fontSize: '14px', margin: 0 }}>{wipeError}</p>}
          <Button type="submit" variant="ghost" className="btn-danger" style={{ marginTop: '8px' }} disabled={isWiping}>
            {isWiping ? 'Purging…' : 'Confirm Purge'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
