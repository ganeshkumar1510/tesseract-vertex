import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { CheckSquare, Calendar, Kanban, Plus, MoreHorizontal, List, AlertCircle } from 'lucide-react';
import { getData, addDataItem, updateDataItem, saveData, logActivity, isDemoMode } from '../utils/storage';
import { todayISO } from '../utils/format';
import { mockData } from '../utils/mockData';
import './Tasks.css';

const emptyTaskForm = {
  title: '',
  priority: 'medium',
  due: '',
  project_id: '',
  notes: '',
};

function taskFromForm(form, projects) {
  const project = projects.find(p => p.id === form.project_id);
  const due = form.due || todayISO();
  return {
    title: form.title.trim(),
    done: false,
    priority: (form.priority || 'medium').toLowerCase(),
    due,
    dueDate: due,
    project_id: project?.id || null,
    project: project ? (project.title || project.name) : null,
    client_id: project?.client_id || null,
    client: project ? (project.client || 'General') : 'General',
    notes: form.notes || '',
  };
}

export function Tasks() {
  const isDemo = isDemoMode();

  const [persistentTasks, setPersistentTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [menuTaskId, setMenuTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [titleError, setTitleError] = useState('');

  const loadTasks = useCallback(() => {
    setPersistentTasks(getData('tasks') || []);
    setProjects(getData('projects') || []);
  }, []);

  useEffect(() => {
    loadTasks();
    const handleDataChange = (e) => {
      const key = e.detail?.key;
      if (!key || key === 'tasks' || key === 'projects') {
        loadTasks();
      }
    };
    window.addEventListener('vertex-data-change', handleDataChange);
    return () => window.removeEventListener('vertex-data-change', handleDataChange);
  }, [loadTasks]);

  useEffect(() => {
    const closeMenu = () => {
      setMenuTaskId(null);
      setDeletingTaskId(null);
    };
    if (menuTaskId) {
      window.addEventListener('click', closeMenu);
      return () => window.removeEventListener('click', closeMenu);
    }
    return undefined;
  }, [menuTaskId]);

  const allTasks = useMemo(() => {
    const storedIds = new Set(persistentTasks.map(t => t.id));
    const demoAgendaItems = isDemo
      ? mockData.agenda.filter(a => !storedIds.has(a.id)).map(a => ({
          ...a,
          due: a.time ? `Today, ${a.time}` : 'Today'
        }))
      : [];
    return [...persistentTasks, ...demoAgendaItems];
  }, [persistentTasks, isDemo]);

  const getTaskCategory = (task) => {
    if (task.done) return 'completed';

    const rawDue = task.dueDate || task.due;
    if (!rawDue) return 'today';

    const dueStr = String(rawDue).toLowerCase();
    if (dueStr.includes('today') || dueStr.includes('all day')) return 'today';
    if (dueStr.includes('overdue')) return 'overdue';

    const dueDateObj = new Date(rawDue);
    if (!isNaN(dueDateObj.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueDay = new Date(dueDateObj);
      dueDay.setHours(0, 0, 0, 0);

      const diffTime = dueDay.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'overdue';
      if (diffDays === 0) return 'today';
      if (diffDays <= 7) return 'thisWeek';
    }

    return 'today';
  };

  const tasksByStatus = useMemo(() => {
    const buckets = {
      overdue: [],
      today: [],
      thisWeek: [],
      completed: []
    };

    allTasks.forEach(task => {
      const cat = getTaskCategory(task);
      if (buckets[cat]) {
        buckets[cat].push(task);
      } else {
        buckets.today.push(task);
      }
    });

    return buckets;
  }, [allTasks]);

  const handleToggle = (id) => {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;

    const nextDone = !task.done;

    setPersistentTasks(prev => {
      const exists = prev.some(t => t.id === id);
      if (exists) {
        return prev.map(t => t.id === id ? { ...t, done: nextDone, completedAt: nextDone ? new Date().toISOString() : null } : t);
      }
      return [{ ...task, done: nextDone, completedAt: nextDone ? new Date().toISOString() : null }, ...prev];
    });

    const existsInPersistent = persistentTasks.some(t => t.id === id);
    if (existsInPersistent) {
      updateDataItem('tasks', id, {
        done: nextDone,
        completedAt: nextDone ? new Date().toISOString() : null
      });
    } else {
      addDataItem('tasks', {
        ...task,
        done: nextDone,
        completedAt: nextDone ? new Date().toISOString() : null
      });
    }

    if (nextDone) {
      logActivity('note', `Completed task: ${task.title}`);
    }
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    const title = e.target.taskTitle.value.trim();
    if (!title) return;

    const due = todayISO();
    addDataItem('tasks', {
      title,
      done: false,
      due,
      dueDate: due,
      priority: 'medium',
      client: 'General',
      project: null,
    });
    logActivity('note', `Scheduled task: ${title}`);
    e.target.reset();
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setTaskForm(emptyTaskForm);
    setTitleError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task) => {
    setMenuTaskId(null);
    setDeletingTaskId(null);
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      priority: (task.priority || 'medium').toLowerCase(),
      due: (task.dueDate || task.due || '').toString().slice(0, 10),
      project_id: task.project_id || '',
      notes: task.notes || '',
    });
    setTitleError('');
    setIsCreateModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsCreateModalOpen(false);
    setEditingTask(null);
    setTaskForm(emptyTaskForm);
    setTitleError('');
  };

  const handleSaveTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      setTitleError('Task title is required');
      return;
    }

    const payload = taskFromForm(taskForm, projects);

    if (editingTask) {
      updateDataItem('tasks', editingTask.id, payload);
    } else {
      addDataItem('tasks', payload);
      logActivity('note', `Scheduled task: ${payload.title}`);
    }
    closeTaskModal();
  };

  const confirmDelete = (id) => {
    const remaining = persistentTasks.filter(t => t.id !== id);
    saveData('tasks', remaining);
    setPersistentTasks(remaining);
    setDeletingTaskId(null);
    setMenuTaskId(null);
  };

  const formatDueLabel = (task, isOverdue) => {
    const raw = task.dueDate || task.due;
    if (!raw) return 'Due Today';
    if (String(raw).toLowerCase().includes('today') || String(raw).toLowerCase() === 'done') {
      return `Due ${task.due || 'Today'}`;
    }
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return `${isOverdue ? 'Due' : 'Due'} ${d.toLocaleDateString()}`;
    }
    return `Due ${raw}`;
  };

  const showSection = (filterKey) => activeFilter === 'All' || activeFilter === filterKey;

  const TaskRow = ({ task, isOverdue }) => (
    <div className="task-row">
      <button
        type="button"
        className={`task-checkbox ${task.done ? 'checked' : ''}`}
        onClick={() => handleToggle(task.id)}
      >
        {task.done && <CheckSquare size={14} />}
      </button>
      <div className="task-content">
        <span className={`task-title ${task.done ? 'strikethrough' : ''}`}>{task.title}</span>
        <div className="task-meta">
          <span className={`task-due ${isOverdue ? 'text-danger' : 'text-secondary'}`}>
            {isOverdue && <AlertCircle size={12} style={{ display: 'inline', marginRight: 2 }} />}
            {formatDueLabel(task, isOverdue)}
          </span>
          <span className="meta-dot">•</span>
          <span className="task-client">{task.client || 'General'}</span>
          {task.project && (
            <>
              <span className="meta-dot">•</span>
              <span className="task-project">{task.project}</span>
            </>
          )}
          {task.priority && (
            <>
              <span className="meta-dot">•</span>
              <span className={`priority-badge priority-${String(task.priority).toLowerCase()}`}>
                {String(task.priority).charAt(0).toUpperCase() + String(task.priority).slice(1).toLowerCase()}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="task-menu-wrap" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            setDeletingTaskId(null);
            setMenuTaskId(prev => prev === task.id ? null : task.id);
          }}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuTaskId === task.id && (
          <div className="task-context-menu">
            {deletingTaskId === task.id ? (
              <div className="delete-confirm">
                <p>Delete this task? This cannot be undone.</p>
                <div className="delete-confirm-actions">
                  <button type="button" onClick={() => setDeletingTaskId(null)}>Cancel</button>
                  <button type="button" className="confirm-delete" onClick={() => confirmDelete(task.id)}>Delete</button>
                </div>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => openEditModal(task)}>Edit</button>
                <button type="button" className="danger" onClick={() => setDeletingTaskId(task.id)}>Delete</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div className="title-group">
          <h1 className="page-title">
            Tasks & Follow-ups <span className="count-badge">{allTasks.length}</span>
          </h1>
          <div className="view-toggles">
            <button type="button" className="view-btn active"><List size={16} /></button>
            <button type="button" className="view-btn"><Calendar size={16} /></button>
            <button type="button" className="view-btn"><Kanban size={16} /></button>
          </div>
        </div>
        <div className="header-right">
          <div className="filter-pills">
            {['All', 'Today', 'This Week', 'Overdue', 'Completed'].map(tab => (
              <button
                key={tab}
                type="button"
                className={`filter-pill ${activeFilter === tab ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Task
          </Button>
        </div>
      </div>

      <form className="quick-add-bar" onSubmit={handleQuickAdd}>
        <Input name="taskTitle" placeholder="What needs to get done?" className="quick-input" />
        <Button type="submit" variant="primary">
          <Plus size={16} /> Add Task
        </Button>
      </form>

      <div className="task-sections">
        {showSection('Overdue') && (activeFilter === 'Overdue' || tasksByStatus.overdue.length > 0) && (
          <div className="task-section">
            <h3 className="section-title text-danger">
              Overdue <span className="count-badge red">{tasksByStatus.overdue.length}</span>
            </h3>
            <div className="tasks-list">
              {tasksByStatus.overdue.length > 0
                ? tasksByStatus.overdue.map(t => <TaskRow key={t.id} task={t} isOverdue={true} />)
                : <p className="empty-msg">No overdue tasks.</p>}
            </div>
          </div>
        )}

        {showSection('Today') && (
          <div className="task-section">
            <h3 className="section-title text-accent">
              Today's Agenda <span className="count-badge">{tasksByStatus.today.length}</span>
            </h3>
            <div className="tasks-list">
              {tasksByStatus.today.length > 0 ? (
                tasksByStatus.today.map(t => (
                  <TaskRow key={t.id} task={{ ...t, due: t.due || 'Today', client: t.client || 'General' }} isOverdue={false} />
                ))
              ) : (
                <p className="empty-msg">No tasks scheduled for today. Add one above to get started.</p>
              )}
            </div>
          </div>
        )}

        {showSection('This Week') && (activeFilter === 'This Week' || tasksByStatus.thisWeek.length > 0) && (
          <div className="task-section">
            <h3 className="section-title text-primary">
              Upcoming This Week <span className="count-badge">{tasksByStatus.thisWeek.length}</span>
            </h3>
            <div className="tasks-list">
              {tasksByStatus.thisWeek.length > 0
                ? tasksByStatus.thisWeek.map(t => (
                    <TaskRow key={t.id} task={{ ...t, due: t.due || 'This Week', client: t.client || 'General' }} isOverdue={false} />
                  ))
                : <p className="empty-msg">No tasks due this week.</p>}
            </div>
          </div>
        )}

        {showSection('Completed') && (
          <div className="task-section">
            <h3 className="section-title text-success">
              Completed <span className="count-badge">{tasksByStatus.completed.length}</span>
            </h3>
            <div className="tasks-list">
              {tasksByStatus.completed.length > 0 ? (
                tasksByStatus.completed.map(t => (
                  <TaskRow key={t.id} task={{ ...t, due: 'Done', client: t.client || 'General' }} isOverdue={false} />
                ))
              ) : (
                <p className="empty-msg">No completed tasks yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeTaskModal}
        title={editingTask ? 'Edit Task' : 'Add Task'}
      >
        <form onSubmit={handleSaveTask} className="task-form">
          <div className="form-group">
            <label htmlFor="task-title">Task Title</label>
            <Input
              id="task-title"
              value={taskForm.title}
              onChange={(e) => {
                setTaskForm({ ...taskForm, title: e.target.value });
                if (titleError) setTitleError('');
              }}
              autoFocus
            />
            {titleError && <p className="field-error">{titleError}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              className="form-select"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-due">Due Date</label>
            <Input
              id="task-due"
              type="date"
              value={taskForm.due}
              onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-project">Project</label>
            <select
              id="task-project"
              className="form-select"
              value={taskForm.project_id}
              onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}
            >
              <option value="">None</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title || p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-notes">Notes</label>
            <textarea
              id="task-notes"
              className="form-textarea"
              rows="3"
              value={taskForm.notes}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
            />
          </div>
          <Button type="submit">{editingTask ? 'Save Changes' : 'Create Task'}</Button>
        </form>
      </Modal>
    </div>
  );
}
