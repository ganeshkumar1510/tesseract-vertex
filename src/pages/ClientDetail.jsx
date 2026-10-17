import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  ArrowLeft, Mail, Phone, FileText, CheckSquare, 
  Calendar, Tag, Plus, ExternalLink, Users
} from 'lucide-react';
import { getData, addDataItem, logActivity, stageForStatus, getCurrency } from '../utils/storage';
import { formatMoney } from '../utils/format';
import './DetailPages.css';
import './Clients.css';

export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const logInputRef = useRef(null);
  const currency = getCurrency();

  const [client, setClient] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'projects' | 'invoices' | 'notes'
  
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Quick Log State
  const [logText, setLogText] = useState('');
  const [logType, setLogType] = useState('Note'); // 'Note' | 'Call' | 'Email' | 'Meeting'

  // New Project Modal State (from Client view)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectValue, setNewProjectValue] = useState('');
  const [newProjectDeadline, setNewProjectDeadline] = useState('');

  const loadClientData = useCallback(() => {
    const allClients = getData('clients') || [];
    const found = allClients.find(c => c.id === id);

    if (!found) {
      setNotFound(true);
      return;
    }

    setNotFound(false);
    setClient(found);

    const allProjects = getData('projects') || [];
    const allInvoices = getData('invoices') || [];
    const allActivities = getData('activities') || [];

    // Filter projects linked to this client
    const clientProjects = allProjects.filter(p => 
      p.client_id === found.id ||
      (found.name && p.client === found.name) ||
      (found.company && p.client === found.company) ||
      (p.client && p.client.includes(found.name))
    );

    // Filter invoices linked to this client
    const clientInvoices = allInvoices.filter(i => 
      i.client_id === found.id ||
      (found.name && i.client === found.name) ||
      (found.company && i.client === found.company) ||
      (i.client && i.client.includes(found.name))
    );

    // Filter activities linked to this client
    const clientActivities = allActivities.filter(a => 
      a.clientId === found.id ||
      (found.name && a.company === found.name) ||
      (found.company && a.company === found.company)
    );

    setProjects(clientProjects);
    setInvoices(clientInvoices);
    setActivities(clientActivities);
  }, [id]);

  useEffect(() => {
    loadClientData();
    const handleDataChange = (e) => {
      const key = e.detail?.key;
      if (!key || ['clients', 'projects', 'invoices', 'activities', 'user'].includes(key)) {
        loadClientData();
      }
    };
    window.addEventListener('vertex-data-change', handleDataChange);
    return () => window.removeEventListener('vertex-data-change', handleDataChange);
  }, [loadClientData]);

  // Calculations
  const stats = useMemo(() => {
    const lifetimeRevenue = invoices
      .filter(i => i.status === 'Paid')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const unpaidBalance = invoices
      .filter(i => i.status !== 'Paid')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const totalInvoiced = invoices
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const activeProjects = projects
      .filter(p => p.status !== 'Completed' && p.status !== 'Archived').length;

    const avgProjectValue = projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + (Number(p.value) || 0), 0) / projects.length) 
      : 0;

    return { lifetimeRevenue, unpaidBalance, totalInvoiced, activeProjects, avgProjectValue };
  }, [invoices, projects]);

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!logText.trim() || !client) return;

    const companyTarget = client.company || client.name;
    const newAct = addDataItem('activities', {
      type: logType.toLowerCase(),
      description: logText.trim(),
      company: companyTarget,
      clientId: client.id,
      time: 'Just now'
    });

    setActivities(prev => [newAct, ...prev]);
    setLogText('');
  };

  const handleCreateProjectForClient = (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !client) return;

    const newProject = addDataItem('projects', {
      name: newProjectName.trim(),
      client_id: client.id,
      client: client.company ? `${client.name} (${client.company})` : client.name,
      value: newProjectValue ? parseFloat(newProjectValue) : 0,
      deadline: newProjectDeadline || null,
      status: 'In Progress',
      stage: stageForStatus('In Progress'),
      createdAt: new Date().toISOString()
    });

    logActivity('note', `Created project: ${newProject.name}`, client.company || client.name);
    setIsProjectModalOpen(false);
    setNewProjectName('');
    setNewProjectValue('');
    setNewProjectDeadline('');
    loadClientData();
  };

  if (notFound) {
    return (
      <div className="detail-page" style={{ justifyContent: 'center', paddingTop: '60px' }}>
        <EmptyState
          icon={Users}
          title="Client Not Found"
          description="The requested client record does not exist or was removed from this workspace."
          action={
            <Button variant="primary" onClick={() => navigate('/clients')}>
              <ArrowLeft size={16} /> Return to Clients
            </Button>
          }
        />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  const clientStatusVariant = client.status === 'Active' ? 'green' : client.status === 'Lead' ? 'amber' : 'neutral';

  return (
    <div className="detail-page">
      <div className="detail-left">
        {/* Header */}
        <div className="detail-header">
          <Link to="/clients" className="back-link">
            <ArrowLeft size={16} /> Clients
          </Link>
          <div className="header-main">
            <h1 className="header-title">{client.name}</h1>
            <Badge variant={clientStatusVariant} className="header-badge">
              {client.status || 'Active'}
            </Badge>
          </div>
          {client.company && (
            <p className="header-sub">
              Client at <span className="text-accent">{client.company}</span>
            </p>
          )}

          <div className="header-actions">
            {client.email ? (
              <a href={`mailto:${client.email}`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm">
                  <Mail size={14} /> Email
                </Button>
              </a>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => { setActiveTab('timeline'); setLogType('Email'); logInputRef.current?.focus(); }}>
                <Mail size={14} /> Email
              </Button>
            )}

            {client.phone ? (
              <a href={`tel:${client.phone}`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm">
                  <Phone size={14} /> Call
                </Button>
              </a>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => { setActiveTab('timeline'); setLogType('Call'); logInputRef.current?.focus(); }}>
                <Phone size={14} /> Call
              </Button>
            )}

            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => { 
                setActiveTab('timeline'); 
                setLogType('Note'); 
                setTimeout(() => logInputRef.current?.focus(), 50); 
              }}
            >
              <FileText size={14} /> Note
            </Button>

            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setIsProjectModalOpen(true)}
            >
              <Plus size={14} /> New Project
            </Button>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="detail-tabs">
          <button 
            type="button"
            className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline & Activity
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects ({projects.length})
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices ({invoices.length})
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
        </div>

        {/* TAB 1: TIMELINE & ACTIVITY */}
        {activeTab === 'timeline' && (
          <div className="timeline-container">
            <form onSubmit={handleLogSubmit} className="log-activity-bar">
              <input 
                ref={logInputRef}
                type="text" 
                placeholder={`Write a ${logType.toLowerCase()} or record client update...`} 
                className="log-input" 
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
              />
              <div className="log-type-pills">
                {['Note', 'Call', 'Email', 'Meeting'].map(type => (
                  <button 
                    key={type}
                    type="button" 
                    className={`type-pill ${logType === type ? 'active' : ''}`}
                    style={logType === type ? { backgroundColor: 'var(--accent-primary)', color: 'white' } : {}}
                    onClick={() => setLogType(type)}
                  >
                    {type}
                  </button>
                ))}
                <Button type="submit" size="sm" variant="primary" style={{ marginLeft: 'auto' }}>
                  Log {logType}
                </Button>
              </div>
            </form>

            <div className="timeline-feed">
              {activities.length > 0 ? (
                activities.map((act) => {
                  const type = (act.type || 'note').toLowerCase();
                  let iconBg = 'bg-blue';
                  let IconComponent = Mail;

                  if (type === 'call') {
                    iconBg = 'bg-green';
                    IconComponent = Phone;
                  } else if (type === 'note') {
                    iconBg = 'bg-amber';
                    IconComponent = FileText;
                  } else if (type === 'meeting') {
                    iconBg = 'bg-purple';
                    IconComponent = Calendar;
                  } else if (type === 'task') {
                    iconBg = 'bg-gray';
                    IconComponent = CheckSquare;
                  }

                  return (
                    <div key={act.id} className="timeline-entry">
                      <div className={`timeline-icon ${iconBg}`}>
                        <IconComponent size={14} />
                      </div>
                      <div className="timeline-content">
                        <p className="entry-meta">
                          <strong>{type.toUpperCase()}:</strong> {act.description}{' '}
                          <span className="entry-time">{act.time || 'Recent'}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-secondary" style={{ padding: '20px 0' }}>
                  No activity recorded for this client yet. Use the bar above to log notes, calls, or meetings.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="tab-pane-projects flex flex-col gap-md">
            <div className="flex justify-between items-center mb-sm">
              <h3 className="font-semibold text-lg text-text-primary">
                Linked Projects ({projects.length})
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setIsProjectModalOpen(true)}>
                <Plus size={14} /> Add Project
              </Button>
            </div>

            {projects.length > 0 ? (
              <Card className="p-none table-responsive">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Project Title</th>
                      <th>Status</th>
                      <th>Contract Value</th>
                      <th>Deadline</th>
                      <th className="th-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const isOverdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== 'Completed';
                      const badgeVariant = p.status === 'Completed' ? 'neutral' : isOverdue ? 'danger' : p.status === 'On Hold' ? 'amber' : 'green';

                      return (
                        <tr 
                          key={p.id} 
                          className="client-row cursor-pointer"
                          onClick={() => navigate(`/projects/${p.id}`)}
                        >
                          <td className="font-semibold text-text-primary">
                            {p.name || p.title}
                          </td>
                          <td>
                            <Badge variant={badgeVariant}>
                              {isOverdue ? 'Overdue' : p.status || 'In Progress'}
                            </Badge>
                          </td>
                          <td className="font-mono">
                            {formatMoney(Number(p.value) || 0, currency)}
                          </td>
                          <td className={isOverdue ? 'text-danger font-medium' : 'text-secondary'}>
                            {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                          </td>
                          <td className="actions-cell">
                            <ExternalLink size={14} className="text-secondary" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card style={{ textAlign: 'center', padding: '40px' }}>
                <p className="text-secondary" style={{ marginBottom: '16px' }}>
                  No projects linked to this client yet.
                </p>
                <Button variant="primary" onClick={() => setIsProjectModalOpen(true)}>
                  <Plus size={14} /> Create First Project
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* TAB 3: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="tab-pane-invoices flex flex-col gap-md">
            {/* Invoice Summary Chips */}
            <div className="grid grid-cols-2 gap-4 mb-sm">
              <Card className="p-md">
                <span className="text-xs text-secondary font-medium uppercase">Total Invoiced</span>
                <p className="text-2xl font-bold font-mono text-text-primary mt-1">
                  {formatMoney(stats.totalInvoiced, currency)}
                </p>
              </Card>
              <Card className="p-md">
                <span className="text-xs text-secondary font-medium uppercase">Unpaid Balance</span>
                <p className={`text-2xl font-bold font-mono mt-1 ${stats.unpaidBalance > 0 ? 'text-danger' : 'text-success'}`}>
                  {formatMoney(stats.unpaidBalance, currency)}
                </p>
              </Card>
            </div>

            {invoices.length > 0 ? (
              <Card className="p-none table-responsive">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Project</th>
                      <th>Amount</th>
                      <th>Issued</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="client-row">
                        <td className="font-mono font-medium">{inv.id}</td>
                        <td className="text-secondary">{inv.project || 'General Service'}</td>
                        <td className="font-mono font-semibold">{formatMoney(Number(inv.amount) || 0, currency)}</td>
                        <td className="text-secondary">{inv.issued || '—'}</td>
                        <td className={inv.status === 'Overdue' ? 'text-danger font-medium' : 'text-secondary'}>
                          {inv.due || '—'}
                        </td>
                        <td>
                          <Badge variant={inv.status === 'Paid' ? 'green' : inv.status === 'Overdue' ? 'danger' : 'amber'}>
                            {inv.status || 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card style={{ textAlign: 'center', padding: '40px' }}>
                <p className="text-secondary" style={{ marginBottom: '16px' }}>
                  No invoices generated for this client yet.
                </p>
                <Button variant="primary" onClick={() => navigate('/invoices')}>
                  <Plus size={14} /> Go to Invoices
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* TAB 4: NOTES */}
        {activeTab === 'notes' && (
          <div className="tab-pane-notes flex flex-col gap-md">
            <Card className="p-lg">
              <h4 className="font-semibold text-text-primary mb-3">Pinned Notes & History</h4>
              {client.notes ? (
                <div className="entry-box bg-light mb-4">
                  <p className="entry-text">{client.notes}</p>
                </div>
              ) : null}

              <div className="timeline-feed" style={{ marginTop: '10px' }}>
                {activities.filter(a => (a.type || '').toLowerCase() === 'note').length > 0 ? (
                  activities
                    .filter(a => (a.type || '').toLowerCase() === 'note')
                    .map(note => (
                      <div key={note.id} className="timeline-entry">
                        <div className="timeline-icon bg-amber">
                          <FileText size={14} />
                        </div>
                        <div className="timeline-content">
                          <p className="entry-meta">
                            {note.description} <span className="entry-time">{note.time || 'Recent'}</span>
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-secondary">No notes logged yet for this client.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Right Column Profile & Stats */}
      <div className="detail-right">
        {/* Info Panel */}
        <Card className="panel-card">
          <div className="panel-profile">
            <Avatar name={client.name} size="lg" />
            <div className="profile-info">
              <h3>{client.name}</h3>
              {client.company && <p>{client.company}</p>}
            </div>
          </div>
          <div className="panel-details">
            <div className="detail-row">
              <Mail size={14} /> 
              <span>{client.email || '—'}</span>
            </div>
            <div className="detail-row">
              <Phone size={14} /> 
              <span>{client.phone || '—'}</span>
            </div>
            <div className="detail-row">
              <Tag size={14} /> 
              <div className="tag-group">
                <span className="mini-tag">{client.status || 'Active'}</span>
                {client.company && <span className="mini-tag">Client</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats Panel */}
        <Card className="panel-card">
          <h4 className="panel-title">Client Performance</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Lifetime Revenue</span>
              <span className="stat-val font-mono">{formatMoney(stats.lifetimeRevenue, currency)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Projects</span>
              <span className="stat-val font-mono">{stats.activeProjects}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Project Value</span>
              <span className="stat-val font-mono">{formatMoney(stats.avgProjectValue, currency)}</span>
            </div>
          </div>
        </Card>

        {/* Pinned Note Panel */}
        <Card className="panel-card bg-amber-light">
          <h4 className="panel-title" style={{ color: 'var(--text-primary)' }}>Pinned Memo</h4>
          <p className="pinned-text">
            {client.notes || 'Prefers email for updates. Key account in active relationship.'}
          </p>
        </Card>
      </div>

      {/* Relational New Project Modal (pre-assigned to this client) */}
      <Modal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        title={`New Project for ${client.name}`}
      >
        <form onSubmit={handleCreateProjectForClient} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-secondary font-medium block mb-1">Project Name *</label>
            <Input
              name="projectName"
              placeholder="e.g. Website Overhaul"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Contract Value ($)</label>
              <Input
                name="projectValue"
                type="number"
                placeholder="e.g. 7500"
                value={newProjectValue}
                onChange={(e) => setNewProjectValue(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Deadline</label>
              <Input
                name="projectDeadline"
                type="date"
                value={newProjectDeadline}
                onChange={(e) => setNewProjectDeadline(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="mt-2">
            Create Project
          </Button>
        </form>
      </Modal>
    </div>
  );
}
