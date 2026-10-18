import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardCode,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, List, Kanban, Columns } from 'lucide-react';
import { getData, addDataItem, saveData, getLocalUser, getContext } from '../utils/storage';
import { formatMoney, formatAddedDate } from '../utils/format';
import { useToast } from '../hooks/useToast';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useSubmitGuard } from '../hooks/useSubmitGuard';
import './Pipeline.css';

const STAGES = [
  { id: 'Lead', label: 'Lead', color: 'purple' },
  { id: 'Proposal Sent', label: 'Proposal Sent', color: 'amber' },
  { id: 'Negotiation', label: 'Negotiation', color: 'blue' },
  { id: 'Active', label: 'Active', color: 'green' },
  { id: 'Completed', label: 'Completed', color: 'gray' },
];

const emptyDealForm = { title: '', client_id: '', value: '' };

function DealCard({ project, stage, currency, onNavigate, overlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { stage: project.stage },
    disabled: overlay,
  });

  const dndProps = overlay ? {} : { ...listeners, ...attributes };

  // Keyboard: space picks the card up for moving (dnd kit), enter opens the
  // deal. While a keyboard drag is active enter stays the drop key.
  const handleKeyDown = (event) => {
    dndProps.onKeyDown?.(event);
    if (!overlay && event.key === 'Enter' && !isDragging) {
      event.preventDefault();
      onNavigate(project.id);
    }
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={`kanban-card-wrap ${isDragging ? 'is-dragging' : ''}`}
      {...dndProps}
      onKeyDown={handleKeyDown}
    >
    <Card
      className={`kanban-card border-left-${stage.color} ${overlay ? 'drag-overlay-card' : ''}`}
      onClick={overlay ? undefined : () => onNavigate(project.id)}
    >
      <div className="card-header-row">
        <h4 className="project-name">{project.title || project.name}</h4>
      </div>
      <p className="project-client">{project.client || 'General'}</p>
      <p className="project-value">{formatMoney(project.value || 0, currency)}</p>
      <div className="card-footer">
        <span className="date-added">{formatAddedDate(project.createdAt)}</span>
        <div className="status-indicator">
          <span className={`status-dot dot-${stage.color}`}></span>
          {project.status || stage.label}
        </div>
      </div>
    </Card>
    </div>
  );
}

function KanbanColumn({ stage, projects, currency, onNavigate }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className={`kanban-column ${isOver ? 'drag-over' : ''}`}>
      <div className={`column-header border-${stage.color}`}>
        <h3 className="column-title">{stage.label}</h3>
        <div className="column-meta">
          <span>{projects.length} projects</span>
          <span>•</span>
          <span>{formatMoney(projects.reduce((sum, p) => sum + (p.value || 0), 0), currency)}</span>
        </div>
      </div>
      <div ref={setNodeRef} className="kanban-cards">
        {projects.length > 0 ? (
          projects.map(project => (
            <DealCard
              key={project.id}
              project={project}
              stage={stage}
              currency={currency}
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <div className="empty-column">Add a deal here</div>
        )}
      </div>
    </div>
  );
}

export function Pipeline() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(() => getData('projects') || []);
  const [clients, setClients] = useState(() => getData('clients') || []);
  const [activeView, setActiveView] = useState('kanban');
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const [nameError, setNameError] = useState('');
  const [isDealFormDirty, setIsDealFormDirty] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [dragError, setDragError] = useState('');
  const [currency, setCurrency] = useState(() => getLocalUser(getContext().username).currency || 'USD');
  const toast = useToast();
  const { isSubmitting, guard } = useSubmitGuard();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      // Space moves the card between stages; enter opens the deal instead.
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab],
      },
    })
  );

  const reloadProjects = useCallback(() => {
    setProjects(getData('projects') || []);
    setClients(getData('clients') || []);
    setCurrency(getLocalUser(getContext().username).currency || 'USD');
  }, []);

  useEffect(() => {
    reloadProjects();
    const onDataChange = (e) => {
      const key = e.detail?.key;
      if (!key || key === 'projects' || key === 'clients' || key === 'user') reloadProjects();
    };
    window.addEventListener('vertex-data-change', onDataChange);
    return () => window.removeEventListener('vertex-data-change', onDataChange);
  }, [reloadProjects]);

  const getProjectsByStage = (stageId) => projects.filter(p => p.stage === stageId);
  const grandTotal = projects.reduce((sum, p) => sum + (p.value || 0), 0);
  const activeProject = projects.find(p => p.id === activeId);

  const listProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const stageCmp = String(a.stage || '').localeCompare(String(b.stage || ''));
      if (stageCmp !== 0) return stageCmp;
      return (b.value || 0) - (a.value || 0);
    });
  }, [projects]);

  const closeDealModal = () => {
    setIsNewDealOpen(false);
    setDealForm(emptyDealForm);
    setNameError('');
    setIsDealFormDirty(false);
  };

  const { requestClose, discardModalProps } = useDiscardGuard({
    isDirty: isDealFormDirty,
    onClose: closeDealModal,
  });

  const markDealDirty = () => {
    if (!isDealFormDirty) setIsDealFormDirty(true);
  };

  const handleCreateDeal = guard((e) => {
    e.preventDefault();
    const title = dealForm.title.trim();
    if (!title) {
      setNameError('Deal name is required');
      return;
    }
    const client = clients.find(c => c.id === dealForm.client_id);
    addDataItem('projects', {
      title,
      name: title,
      client_id: client?.id || null,
      client: client ? (client.company || client.name) : 'General',
      value: dealForm.value === '' ? 0 : Number(dealForm.value),
      stage: 'Lead',
      status: 'In Progress',
    });
    closeDealModal();
    toast.success('Deal created', title);
  });

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setDragError('');
    if (!over) return;
    const newStage = over.id;
    const project = projects.find(p => p.id === active.id);
    if (!project || project.stage === newStage) return;
    const updated = projects.map(p => p.id === active.id ? { ...p, stage: newStage } : p);
    setProjects(updated);
    try {
      saveData('projects', updated);
    } catch (err) {
      console.error('Failed to persist deal stage change:', err);
      // Revert the optimistic update so the UI never diverges from storage.
      setProjects(projects);
      setDragError(`Could not move "${project.title || project.name}" to ${newStage}. Please try again.`);
    }
  };

  const handleDragCancel = () => setActiveId(null);

  // ── Accessibility: describe drag operations to screen readers (AC1.2.2) ──
  const dealName = (id) => {
    const p = projects.find(item => item.id === id);
    return p ? (p.title || p.name) : 'deal';
  };
  const stageLabel = (id) => STAGES.find(s => s.id === id)?.label || id;

  const dndAnnouncements = {
    onDragStart({ active }) {
      return `Picked up ${dealName(active.id)}. Use the arrow keys to choose a column, then press space or enter to drop.`;
    },
    onDragOver({ active, over }) {
      if (!over) return `${dealName(active.id)} is no longer over a column.`;
      return `${dealName(active.id)} is over ${stageLabel(over.id)}.`;
    },
    onDragEnd({ active, over }) {
      if (!over) return `${dealName(active.id)} was dropped and returned to its column.`;
      return `${dealName(active.id)} moved to ${stageLabel(over.id)}.`;
    },
    onDragCancel({ active }) {
      return `Moving ${dealName(active.id)} was cancelled.`;
    },
  };

  const goToProject = (id) => navigate(`/projects/${id}`);

  return (
    <div className="pipeline-page">
      <div className="page-header">
        <div className="title-group">
          <h1 className="page-title">Pipeline</h1>
          <div className="view-toggles">
            <button type="button" className={`view-btn ${activeView === 'kanban' ? 'active' : ''}`} onClick={() => setActiveView('kanban')} aria-label="Kanban view">
              <Kanban size={16} />
            </button>
            <button type="button" className={`view-btn ${activeView === 'list' ? 'active' : ''}`} onClick={() => setActiveView('list')} aria-label="List view">
              <List size={16} />
            </button>
            <button type="button" className={`view-btn ${activeView === 'table' ? 'active' : ''}`} onClick={() => setActiveView('table')} aria-label="Table view">
              <Columns size={16} />
            </button>
          </div>
        </div>

        <div className="actions-group">
          <div className="pipeline-stats">
            <span className="text-secondary">Expected Revenue:</span>
            <span className="bold-value">{formatMoney(grandTotal, currency)}</span>
          </div>
          <Button variant="primary" onClick={() => setIsNewDealOpen(true)}>
            <Plus size={16} /> New Deal
          </Button>
        </div>
      </div>

      {dragError && (
        <div
          role="alert"
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>{dragError}</span>
          <button
            type="button"
            onClick={() => setDragError('')}
            aria-label="Dismiss error"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {projects.length === 0 && (
        <div className="pipeline-empty">
          <EmptyState
            icon={Kanban}
            title="No deals yet"
            description="Create your first deal to start tracking your pipeline."
            action={(
              <Button variant="primary" onClick={() => setIsNewDealOpen(true)}>
                <Plus size={16} /> New Deal
              </Button>
            )}
          />
        </div>
      )}

      {projects.length > 0 && activeView === 'kanban' && (
        <div className="kanban-scroll-area">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            accessibility={{
              announcements: dndAnnouncements,
              screenReaderInstructions: {
                draggable:
                  'To open a deal, press enter. To move a deal between pipeline stages, press space to pick it up, use the arrow keys to choose a column, then press space or enter to drop it. Press escape to cancel.',
              },
            }}
          >
            <div className="kanban-board">
              {STAGES.map(stage => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  projects={getProjectsByStage(stage.id)}
                  currency={currency}
                  onNavigate={goToProject}
                />
              ))}
            </div>
            <DragOverlay>
              {activeProject ? (
                <DealCard
                  overlay
                  project={activeProject}
                  stage={STAGES.find(s => s.id === activeProject.stage) || STAGES[0]}
                  currency={currency}
                  onNavigate={goToProject}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {projects.length > 0 && activeView === 'list' && (
        <div className="pipeline-list">
          {listProjects.map(project => (
            <button type="button" key={project.id} className="pipeline-list-row" onClick={() => goToProject(project.id)}>
              <span className="list-title">{project.title || project.name}</span>
              <span className="list-stage">{project.stage}</span>
              <span className="list-client">{project.client || 'General'}</span>
              <span className="list-value">{formatMoney(project.value || 0, currency)}</span>
            </button>
          ))}
        </div>
      )}

      {projects.length > 0 && activeView === 'table' && (
        <div className="pipeline-table-wrap">
          <table className="pipeline-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Stage</th>
                <th>Client</th>
                <th>Value</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id} onClick={() => goToProject(project.id)}>
                  <td>{project.title || project.name}</td>
                  <td>{project.stage}</td>
                  <td>{project.client || 'General'}</td>
                  <td>{formatMoney(project.value || 0, currency)}</td>
                  <td>{formatAddedDate(project.createdAt).replace('Added ', '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isNewDealOpen} onClose={requestClose} title="New Deal">
        <form onSubmit={handleCreateDeal} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="deal-name">Deal Name</label>
            <Input
              id="deal-name"
              value={dealForm.title}
              onChange={(e) => {
                setDealForm({ ...dealForm, title: e.target.value });
                if (nameError) setNameError('');
                markDealDirty();
              }}
              placeholder="Deal name"
              autoFocus
            />
            {nameError && <p className="field-error">{nameError}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="deal-client">Client</label>
            <select
              id="deal-client"
              className="form-select"
              value={dealForm.client_id}
              onChange={(e) => {
                setDealForm({ ...dealForm, client_id: e.target.value });
                markDealDirty();
              }}
            >
              <option value="">None</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company || c.name}</option>
              ))}
            </select>
            {!dealForm.client_id && (
              <p className="field-hint">
                No client linked — assign one later from the project page so this deal can be invoiced.
              </p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="deal-value">Estimated Value</label>
            <Input
              id="deal-value"
              type="number"
              min="0"
              value={dealForm.value}
              onChange={(e) => {
                setDealForm({ ...dealForm, value: e.target.value });
                markDealDirty();
              }}
              placeholder="0"
            />
          </div>
          <p className="text-secondary" style={{ fontSize: 13, margin: 0 }}>Stage is set to Lead.</p>
          <Button type="submit" disabled={isSubmitting}>Create Deal</Button>
        </form>
      </Modal>

      <ConfirmModal {...discardModalProps} />
    </div>
  );
}
