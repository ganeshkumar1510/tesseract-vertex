import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { getData, updateDataItem, addDataItem, logActivity, stageForStatus, getCurrency } from '../utils/storage';
import { formatMoney } from '../utils/format';
import { useToast } from '../hooks/useToast';
import { 
  ArrowLeft, FileText, CheckSquare, Mail, 
  ChevronDown, Send, Plus
} from 'lucide-react';
import './DetailPages.css';

const PROJECT_STATUSES = [
  { id: 'In Progress', label: 'In Progress', color: 'green' },
  { id: 'On Hold', label: 'On Hold', color: 'amber' },
  { id: 'Overdue', label: 'Overdue', color: 'danger' },
  { id: 'Completed', label: 'Completed', color: 'gray' },
  { id: 'Archived', label: 'Archived', color: 'neutral' },
];

const VIBES = [
  { id: 'excellent', emoji: '🤩', label: 'Excellent' },
  { id: 'good', emoji: '😊', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'difficult', emoji: '😖', label: 'Difficult' },
  { id: 'risk', emoji: '🆘', label: 'Risk' }
];

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currency = getCurrency();

  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'timeline' | 'tasks' | 'invoices'
  const [vibe, setVibe] = useState('excellent');
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notFound, setNotFound] = useState(false);

  const toast = useToast();

  // Task creation modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const loadProjectData = useCallback(() => {
    const allProjects = getData('projects') || [];
    const foundProject = allProjects.find(p => p.id === id);

    if (!foundProject) {
      setNotFound(true);
      return;
    }

    setNotFound(false);
    setProject(foundProject);

    const allActivities = getData('activities') || [];
    const projActivities = allActivities.filter(a => 
      a.projectId === id || 
      (foundProject.name && a.description && a.description.includes(foundProject.name))
    );
    setActivities(projActivities);

    const allTasks = getData('tasks') || [];
    const projTasks = allTasks.filter(t => 
      t.project_id === id || 
      t.projectId === id || 
      (foundProject.name && t.project === foundProject.name) ||
      (foundProject.title && t.project === foundProject.title)
    );
    setTasks(projTasks);

    const allInvoices = getData('invoices') || [];
    const projInvoices = allInvoices.filter(i => 
      i.project_id === id || 
      (foundProject.name && i.project === foundProject.name) ||
      (foundProject.title && i.project === foundProject.title)
    );
    setInvoices(projInvoices);
  }, [id]);

  useEffect(() => {
    loadProjectData();
    const handleDataChange = (e) => {
      const key = e.detail?.key;
      if (!key || ['projects', 'tasks', 'activities', 'invoices', 'user'].includes(key)) {
        loadProjectData();
      }
    };
    window.addEventListener('vertex-data-change', handleDataChange);
    return () => window.removeEventListener('vertex-data-change', handleDataChange);
  }, [loadProjectData]);

  const handleUpdateProject = (updates, { silent = false } = {}) => {
    const updated = updateDataItem('projects', id, updates);
    if (updated) {
      setProject(updated);
      if (!silent) {
        toast.success('Project updated', 'Project details saved.');
      }
    }
  };

  const handleAddActivity = (type, description) => {
    const newActivity = {
      type,
      description,
      projectId: id,
      company: project.client || 'General',
      time: 'Just now'
    };
    const added = addDataItem('activities', newActivity);
    setActivities(prev => [added, ...prev]);
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    handleAddActivity('Note', noteText.trim());
    setNoteText('');
    toast.success('Note added', 'Added to the project timeline.');
  };

  const handleSendEmail = () => {
    handleAddActivity('Email', `Sent email to ${project.client || 'Client'}: "Project Status Update"`);
    toast.success('Status email queued', `Notification queued for ${project.client || 'Client'}.`);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !project) return;

    const newTask = {
      title: taskTitle.trim(),
      done: false,
      project_id: id,
      project: project.name || project.title,
      client_id: project.client_id || null,
      client: project.client || 'General',
      priority: taskPriority.toLowerCase(),
      due: taskDueDate || 'Next Week',
      dueDate: taskDueDate || new Date(Date.now() + 86400000 * 5).toISOString(),
      createdAt: new Date().toISOString()
    };

    const added = addDataItem('tasks', newTask);
    setTasks(prev => [added, ...prev]);
    handleAddActivity('Task', `Created task: ${newTask.title}`);
    setIsTaskModalOpen(false);
    setTaskTitle('');
    setTaskDueDate('');
    toast.success('Task added', `"${newTask.title}" added to the project.`);
  };

  const toggleTaskStatus = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const nextDone = !(task.done || task.status === 'Completed');
    const updated = updateDataItem('tasks', taskId, { 
      done: nextDone,
      status: nextDone ? 'Completed' : 'To Do',
      completedAt: nextDone ? new Date().toISOString() : null
    });

    if (updated) {
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (nextDone) {
        handleAddActivity('System', `Task completed: ${task.title}`);
      }
    }
  };

  // Financial calculations
  const totalInvoiced = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [invoices]);

  const progressPercent = useMemo(() => {
    const val = Number(project?.value) || 0;
    if (val <= 0) return 0;
    return Math.min(100, Math.round((totalPaid / val) * 100));
  }, [project, totalPaid]);

  if (notFound) {
    return (
      <div className="p-xl" style={{ textAlign: 'center', marginTop: 40 }}>
        <h2>Project Not Found</h2>
        <p className="text-secondary" style={{ marginBottom: 20 }}>
          The requested project does not exist or has been removed.
        </p>
        <Link to="/projects">
          <Button variant="primary">Return to Projects</Button>
        </Link>
      </div>
    );
  }

  if (!project) return <div className="p-xl">Loading project...</div>;

  const currentStatus = project.status || 'In Progress';
  const statusMeta = PROJECT_STATUSES.find(s => s.id === currentStatus) || PROJECT_STATUSES[0];

  return (
    <div className="detail-page">
      <div className="detail-left">
        {/* Header */}
        <div className="detail-header">
          <Link to="/projects" className="back-link">
            <ArrowLeft size={16} /> Projects
          </Link>
          <div className="header-main">
            {isEditing ? (
              <input 
                className="header-title-input"
                value={project.name || project.title || ''}
                onChange={(e) => handleUpdateProject({ name: e.target.value, title: e.target.value }, { silent: true })}
                onBlur={() => setIsEditing(false)}
                autoFocus
              />
            ) : (
              <h1 className="header-title" onClick={() => setIsEditing(true)}>
                {project.name || project.title}
              </h1>
            )}
            
            <div className="stage-selector-wrapper">
              <Badge variant={statusMeta.color} className="header-badge">
                {currentStatus} <ChevronDown size={14} style={{ marginLeft: 4 }} />
              </Badge>
              <select 
                className="stage-select-overlay"
                value={currentStatus}
                onChange={(e) => handleUpdateProject({ status: e.target.value, stage: stageForStatus(e.target.value) })}
              >
                {PROJECT_STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="project-quick-info">
            <span>Client: <strong className="text-primary">{project.client || 'General'}</strong></span>
            <span>Value: <strong className="text-primary">{formatMoney(project.value || 0, currency)}</strong></span>
            <span>Created: <strong className="text-primary">{new Date(project.createdAt).toLocaleDateString()}</strong></span>
          </div>
          
          <div className="header-actions">
            <Button variant="secondary" size="sm" onClick={() => setActiveTab('timeline')}>
              <FileText size={14} /> Note
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsTaskModalOpen(true)}>
              <CheckSquare size={14} /> Task
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSendEmail}>
              <Mail size={14} /> Email Client
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="detail-tabs">
          <button 
            type="button"
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'timeline' ? 'active' : ''}`} 
            onClick={() => setActiveTab('timeline')}
          >
            Timeline & Activity
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} 
            onClick={() => setActiveTab('tasks')}
          >
            Tasks ({tasks.length})
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'invoices' ? 'active' : ''}`} 
            onClick={() => setActiveTab('invoices')}
          >
            Invoices ({invoices.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <Card className="panel-card">
                <h4 className="panel-title">Project Details</h4>
                <div className="details-grid">
                  <div className="detail-field">
                    <label>Client</label>
                    <input 
                      value={project.client || ''} 
                      onChange={(e) => handleUpdateProject({ client: e.target.value })}
                      placeholder="Client name"
                    />
                  </div>
                  <div className="detail-field">
                    <label>Contract Value ($)</label>
                    <input 
                      type="number"
                      value={project.value || 0} 
                      onChange={(e) => handleUpdateProject({ value: Number(e.target.value) }, { silent: true })}
                    />
                  </div>
                  <div className="detail-field">
                    <label>Category</label>
                    <input 
                      value={project.category || 'General'} 
                      onChange={(e) => handleUpdateProject({ category: e.target.value }, { silent: true })}
                      placeholder="e.g. Product Design"
                    />
                  </div>
                </div>
                <div className="detail-field full-width" style={{ marginTop: 16 }}>
                  <label>Description & Scope</label>
                  <textarea 
                    placeholder="Describe the project goals, scope, and deliverables..."
                    value={project.description || ''}
                    onChange={(e) => handleUpdateProject({ description: e.target.value }, { silent: true })}
                    rows={4}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="timeline-container">
              <div className="log-activity-bar">
                <textarea 
                  className="log-input" 
                  placeholder="Record an update, call log, or milestone..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                />
                <div className="log-actions" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 12px 12px' }}>
                  <Button variant="primary" size="sm" onClick={handleAddNote}>
                    <Send size={14} /> Log Update
                  </Button>
                </div>
              </div>

              <div className="timeline-feed">
                {activities.length > 0 ? activities.map(activity => (
                  <div key={activity.id} className="timeline-entry">
                    <div className={`timeline-icon bg-${(activity.type || '').toLowerCase() === 'email' ? 'blue' : (activity.type || '').toLowerCase() === 'task' ? 'green' : 'amber'}`}>
                      {(activity.type || '').toLowerCase() === 'email' ? <Mail size={12} /> : (activity.type || '').toLowerCase() === 'task' ? <CheckSquare size={12} /> : <FileText size={12} />}
                    </div>
                    <div className="timeline-content">
                      <div className="entry-meta">
                        <strong>{activity.type || 'Note'}</strong>
                        <span className="entry-time">{activity.time || 'Recent'}</span>
                      </div>
                      <div className="entry-box">
                        <p className="entry-text">{activity.description}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state text-secondary" style={{ padding: '20px 0' }}>
                    No activity logged for this project yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="tasks-tab flex flex-col gap-md">
              <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, margin: 0 }}>Project Tasks</h3>
                <Button variant="secondary" size="sm" onClick={() => setIsTaskModalOpen(true)}>
                  <Plus size={14} /> Add Task
                </Button>
              </div>

              <div className="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.length > 0 ? tasks.map(task => {
                  const isDone = Boolean(task.done || task.status === 'Completed');
                  return (
                    <Card key={task.id} className="task-item-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="checkbox" 
                        checked={isDone} 
                        onChange={() => toggleTaskStatus(task.id)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: 14, 
                          fontWeight: 500, 
                          textDecoration: isDone ? 'line-through' : 'none',
                          color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)'
                        }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Due {task.due || (task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Upcoming')}
                        </div>
                      </div>
                      <Badge variant={isDone ? 'gray' : 'blue'} size="sm">
                        {isDone ? 'Completed' : 'To Do'}
                      </Badge>
                    </Card>
                  );
                }) : (
                  <div className="empty-state text-secondary" style={{ padding: '30px 0', textAlign: 'center' }}>
                    No tasks assigned to this project.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="invoices-tab flex flex-col gap-md">
              <div className="flex justify-between items-center mb-sm">
                <h3 className="font-semibold text-lg text-text-primary">
                  Project Invoices ({invoices.length})
                </h3>
                <Button variant="secondary" size="sm" onClick={() => navigate('/invoices')}>
                  <Plus size={14} /> New Invoice
                </Button>
              </div>

              {invoices.length > 0 ? (
                <Card className="p-none table-responsive">
                  <table className="clients-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Amount</th>
                        <th>Issued</th>
                        <th>Due</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id} className="client-row">
                          <td className="font-mono font-medium">{inv.id}</td>
                          <td className="font-mono font-semibold">{formatMoney(Number(inv.amount) || 0, currency)}</td>
                          <td className="text-secondary">{inv.issued || '—'}</td>
                          <td className="text-secondary">{inv.due || '—'}</td>
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
                <div className="empty-state text-secondary" style={{ padding: '30px 0', textAlign: 'center' }}>
                  No invoices linked to this project yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="detail-right">
        {/* Info Panel */}
        <Card className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar name={project.client || 'Client'} size="md" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>{project.client || 'Client Contact'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Relationship</div>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card className="panel-card">
          <h4 className="panel-title">Financial Summary</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Contract Value</span>
              <span className="stat-val">{formatMoney(Number(project.value) || 0, currency)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Invoiced</span>
              <span className="stat-val">{formatMoney(totalInvoiced, currency)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Paid</span>
              <span className="stat-val text-success">{formatMoney(totalPaid, currency)}</span>
            </div>
          </div>
          <div style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, marginTop: 16, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${progressPercent}%`, backgroundColor: '#10B981', height: '100%', transition: 'width 0.3s' }}></div>
          </div>
          <p className="text-xs text-secondary mt-2 text-right">{progressPercent}% Paid</p>
        </Card>

        <Card className="panel-card sentiment-card">
          <h4 className="panel-title flex items-center gap-sm">
            Client sentiment
          </h4>
          <p className="sov-info-p">How is the client feeling lately?</p>
          <div className="vibe-selector">
            {VIBES.map(v => (
              <button 
                key={v.id}
                type="button"
                className={`vibe-btn ${vibe === v.id ? 'active' : ''}`} 
                title={v.label}
                onClick={() => setVibe(v.id)}
              >
                {v.emoji}
              </button>
            ))}
          </div>
          <p className="vibe-insight">
            {vibe === 'risk' ? 'Alert: Urgent attention needed.' : 'Client relationship remains stable and responsive.'}
          </p>
        </Card>
      </div>

      {/* Inline Modal for Creating a Task (Replacing window.prompt) */}
      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title="Add Project Task"
      >
        <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-secondary font-medium block mb-1">Task Title *</label>
            <Input
              name="taskTitle"
              placeholder="e.g. Deliver sprint mockups"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Priority</label>
              <select
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Due Date</label>
              <Input
                name="taskDueDate"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="mt-2">
            Add Task
          </Button>
        </form>
      </Modal>
    </div>
  );
}
