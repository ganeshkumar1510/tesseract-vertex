import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Plus, Search, AlertCircle, ChevronRight } from 'lucide-react';
import { getData, addDataItem, logActivity, stageForStatus, getCurrency } from '../utils/storage';
import { formatMoney } from '../utils/format';
import { useToast } from '../hooks/useToast';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useSubmitGuard } from '../hooks/useSubmitGuard';
import './Projects.css';
import './Clients.css';

export function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const currency = getCurrency();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    value: '',
    deadline: '',
    status: 'In Progress',
    category: ''
  });
  const [formError, setFormError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const toast = useToast();
  const { isSubmitting, guard } = useSubmitGuard();

  const loadData = useCallback(() => {
    const projectList = getData('projects') || [];
    const clientList = getData('clients') || [];
    setProjects(projectList);
    setClients(clientList);
  }, []);

  useEffect(() => {
    loadData();
    const handleDataChange = (e) => {
      const key = e.detail?.key;
      if (!key || key === 'projects' || key === 'clients' || key === 'user') {
        loadData();
      }
    };
    window.addEventListener('vertex-data-change', handleDataChange);
    return () => window.removeEventListener('vertex-data-change', handleDataChange);
  }, [loadData]);

  // Helper to determine if project is overdue
  const isProjectOverdue = (project) => {
    if (project.status === 'Completed' || project.status === 'Archived') return false;
    if (project.status === 'Overdue') return true;
    if (!project.deadline) return false;
    const deadlineDate = new Date(project.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  // Helper to resolve client object for project
  const getClientForProject = (project) => {
    if (project.client_id) {
      const match = clients.find(c => c.id === project.client_id);
      if (match) return match;
    }
    if (project.client) {
      const match = clients.find(c => c.name === project.client || c.company === project.client);
      if (match) return match;
    }
    return null;
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    let inProgress = 0;
    let overdue = 0;
    let completed = 0;
    let activeValue = 0;

    projects.forEach(p => {
      const overdueFlag = isProjectOverdue(p);
      if (p.status === 'Completed') {
        completed += 1;
      } else if (overdueFlag) {
        overdue += 1;
        activeValue += (Number(p.value) || 0);
      } else {
        inProgress += 1;
        activeValue += (Number(p.value) || 0);
      }
    });

    return { inProgress, overdue, completed, activeValue };
  }, [projects]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const nameMatch = (p.name || p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const clientMatch = (p.client || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || clientMatch;

      if (!matchesSearch) return false;

      if (activeStatusFilter === 'All') return true;
      if (activeStatusFilter === 'Overdue') return isProjectOverdue(p);
      return p.status === activeStatusFilter;
    });
  }, [projects, searchQuery, activeStatusFilter]);

  const handleOpenModal = () => {
    setFormData({
      name: '',
      client_id: clients.length > 0 ? clients[0].id : '',
      value: '',
      deadline: '',
      status: 'In Progress',
      category: ''
    });
    setFormError('');
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsDirty(false);
    setFormError('');
  };

  const { requestClose, discardModalProps } = useDiscardGuard({
    isDirty,
    onClose: closeModal,
  });

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleCreateProject = guard((e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const selectedClient = clients.find(c => c.id === formData.client_id);
    if (!selectedClient) {
      setFormError('Please select a valid client.');
      return;
    }

    const newProjectPayload = {
      name: formData.name.trim(),
      client_id: selectedClient.id,
      client: selectedClient.company ? `${selectedClient.name} (${selectedClient.company})` : selectedClient.name,
      value: formData.value ? parseFloat(formData.value) : 0,
      deadline: formData.deadline || null,
      status: formData.status || 'In Progress',
      stage: stageForStatus(formData.status || 'In Progress'),
      category: formData.category.trim() || 'General',
      createdAt: new Date().toISOString()
    };

    const created = addDataItem('projects', newProjectPayload);
    logActivity('note', `Created project: ${created.name}`, selectedClient.company || selectedClient.name);

    closeModal();
    loadData();
    toast.success('Project created', created.name);
  });

  const getStatusBadgeVariant = (project) => {
    if (project.status === 'Completed') return 'neutral';
    if (isProjectOverdue(project)) return 'danger';
    if (project.status === 'On Hold') return 'amber';
    return 'green';
  };

  const getDisplayStatus = (project) => {
    if (project.status === 'Completed') return 'Completed';
    if (isProjectOverdue(project)) return 'Overdue';
    return project.status || 'In Progress';
  };

  return (
    <div className="projects-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="title-group">
          <h1 className="page-title">
            Projects <span className="count-badge">{projects.length}</span>
          </h1>
        </div>

        <div className="actions-group">
          <Input
            placeholder="Search projects or clients..."
            icon={<Search size={16} />}
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="primary" onClick={handleOpenModal}>
            <Plus size={16} /> New Project
          </Button>
        </div>
      </div>

      {/* Summary Metrics Chips */}
      <div className="projects-metrics-grid">
        <Card className="project-metric-card">
          <span className="project-metric-label">In Progress</span>
          <p className="project-metric-value">{metrics.inProgress}</p>
          <span className="project-metric-sub">Active delivery</span>
        </Card>
        <Card className="project-metric-card">
          <span className="project-metric-label">Overdue</span>
          <p className="project-metric-value text-danger">{metrics.overdue}</p>
          <span className="project-metric-sub">Needs attention</span>
        </Card>
        <Card className="project-metric-card">
          <span className="project-metric-label">Completed</span>
          <p className="project-metric-value">{metrics.completed}</p>
          <span className="project-metric-sub">Closed projects</span>
        </Card>
        <Card className="project-metric-card">
          <span className="project-metric-label">Active Value</span>
          <p className="project-metric-value">{formatMoney(metrics.activeValue, currency)}</p>
          <span className="project-metric-sub">Contracted pipeline</span>
        </Card>
      </div>

      {/* Toolbar Filter Tabs */}
      <div className="projects-toolbar">
        <div className="projects-filter-tabs">
          {['All', 'In Progress', 'On Hold', 'Overdue', 'Completed'].map((tab) => {
            let count = projects.length;
            if (tab === 'In Progress') count = projects.filter(p => p.status === 'In Progress' && !isProjectOverdue(p)).length;
            if (tab === 'On Hold') count = projects.filter(p => p.status === 'On Hold').length;
            if (tab === 'Overdue') count = metrics.overdue;
            if (tab === 'Completed') count = metrics.completed;

            return (
              <button
                key={tab}
                type="button"
                className={`projects-tab-btn ${activeStatusFilter === tab ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter(tab)}
              >
                <span>{tab}</span>
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects Table */}
      <Card className="p-none table-responsive">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Client</th>
              <th>Deadline</th>
              <th>Value</th>
              <th>Status</th>
              <th className="th-actions"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const linkedClient = getClientForProject(project);
                const overdue = isProjectOverdue(project);
                const displayStatus = getDisplayStatus(project);
                const badgeVariant = getStatusBadgeVariant(project);

                return (
                  <tr
                    key={project.id}
                    className="client-row cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <td>
                      <div className="project-name-cell">
                        <span className="project-title">{project.name || project.title}</span>
                        {project.category && (
                          <span className="project-category">{project.category}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {linkedClient ? (
                        <Link
                          to={`/clients/${linkedClient.id}`}
                          className="project-client-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {linkedClient.name}
                          {linkedClient.company && ` (${linkedClient.company})`}
                        </Link>
                      ) : (
                        <span className="text-secondary">{project.client || '—'}</span>
                      )}
                    </td>
                    <td>
                      {project.deadline ? (
                        <span className={overdue ? 'deadline-overdue' : 'deadline-normal'}>
                          {overdue && <AlertCircle size={14} />}
                          {new Date(project.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      ) : (
                        <span className="text-secondary">No deadline</span>
                      )}
                    </td>
                    <td className="font-medium">
                      {formatMoney(project.value || 0, currency)}
                    </td>
                    <td>
                      <Badge variant={badgeVariant}>{displayStatus}</Badge>
                    </td>
                    <td className="actions-cell">
                      <ChevronRight size={16} className="text-secondary" />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  {searchQuery || activeStatusFilter !== 'All' 
                    ? 'No projects match your current filters.' 
                    : 'No projects found. Create your first project to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Relational + New Project Modal */}
      <Modal isOpen={isModalOpen} onClose={requestClose} title="Create New Project">
        {clients.length === 0 ? (
          <div className="zero-clients-alert">
            <p><strong>No clients found!</strong> You must create a client before initializing a project.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                closeModal();
                navigate('/clients');
              }}
            >
              Go to Clients
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Project Name *</label>
              <Input
                name="name"
                placeholder="e.g. Brand Identity 2026"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  markDirty();
                }}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Client *</label>
              <select
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                value={formData.client_id}
                onChange={(e) => {
                  setFormData({ ...formData, client_id: e.target.value });
                  if (formError) setFormError('');
                  markDirty();
                }}
                required
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Contract Value ($)</label>
                <Input
                  name="value"
                  type="number"
                  placeholder="e.g. 8500"
                  value={formData.value}
                  onChange={(e) => {
                    setFormData({ ...formData, value: e.target.value });
                    markDirty();
                  }}
                />
              </div>

              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Deadline</label>
                <Input
                  name="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => {
                    setFormData({ ...formData, deadline: e.target.value });
                    markDirty();
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Initial Status</label>
                <select
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  value={formData.status}
                  onChange={(e) => {
                    setFormData({ ...formData, status: e.target.value });
                    markDirty();
                  }}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Category</label>
                <Input
                  name="category"
                  placeholder="e.g. Web App, Branding"
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    markDirty();
                  }}
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-danger" style={{ margin: 0 }}>{formError}</p>
            )}

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              Initialize Project
            </Button>
          </form>
        )}
      </Modal>

      <ConfirmModal {...discardModalProps} />
    </div>
  );
}
