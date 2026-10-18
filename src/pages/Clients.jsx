import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Search, Filter, Plus, MoreHorizontal } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { getData, addDataItem, logActivity } from '../utils/storage';
import { useToast } from '../hooks/useToast';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useSubmitGuard } from '../hooks/useSubmitGuard';
import { useQueryParams } from '../hooks/useQueryParams';
import './Clients.css';

export function Clients() {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const { getParam, setParam } = useQueryParams();
  const searchQuery = getParam('q');
  const [isDirty, setIsDirty] = useState(false);
  const toast = useToast();
  const { isSubmitting, guard } = useSubmitGuard();

  const loadClients = useCallback(() => {
    const list = getData('clients') || [];
    setClients(list);
  }, []);

  useEffect(() => {
    loadClients();
    const onDataChange = (e) => {
      if (!e.detail?.key || e.detail.key === 'clients') loadClients();
    };
    window.addEventListener('vertex-data-change', onDataChange);
    return () => window.removeEventListener('vertex-data-change', onDataChange);
  }, [loadClients]);

  const closeModal = () => {
    setIsModalOpen(false);
    setIsDirty(false);
    setFormData({ name: '', email: '', company: '' });
  };

  const { requestClose, discardModalProps } = useDiscardGuard({
    isDirty,
    onClose: closeModal,
  });

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleCreateClient = guard((e) => {
    e.preventDefault();
    const saved = addDataItem('clients', {
      name: formData.name,
      email: formData.email || null,
      company: formData.company || null,
      status: 'Active',
    });
    logActivity('note', `Added new client: ${saved.name}`, formData.company || saved.name);
    closeModal();
    loadClients();
    toast.success('Client created', saved.name);
  });

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="clients-page">
      <div className="page-header">
        <div className="title-group">
          <h1 className="page-title">
            Clients <span className="count-badge">{clients.length}</span>
          </h1>
        </div>

        <div className="actions-group">
          <Input
            placeholder="Search clients..."
            icon={<Search size={16} />}
            className="search-input"
            value={searchQuery}
            onChange={(e) => setParam('q', e.target.value)}
          />
          <Button variant="secondary" className="sort-btn">
            <Filter size={16} /> Sort
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New Client
          </Button>
        </div>
      </div>

      <Card className="clients-table-card p-none">
        <div className="table-responsive">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Status</th>
                <th className="th-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <tr key={client.id} className="client-row cursor-pointer">
                    <td>
                      <div className="client-cell">
                        <Avatar name={client.name} size="md" />
                        <div className="client-info">
                          <Link to={`/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                            <span className="client-name">{client.name}</span>
                          </Link>
                          {client.company && <span className="client-company">{client.company}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="text-secondary">{client.email || '—'}</td>
                    <td>
                      <div className="status-label">
                        <span
                          className={`status-dot ${client.status === 'Active' ? 'dot-green' : 'dot-neutral'}`}
                        ></span>
                        {client.status || 'Active'}
                      </div>
                    </td>
                    <td className="actions-cell">
                      <button type="button" className="icon-btn">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                    {searchQuery ? 'No clients match your search.' : 'No clients found. Start by adding one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={requestClose} title="Add New Client">
        <form onSubmit={handleCreateClient} className="flex flex-col gap-4">
          <Input
            name="name"
            placeholder="Client Name *"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              markDirty();
            }}
            autoFocus
            required
          />
          <Input
            name="company"
            placeholder="Company Name (Optional)"
            value={formData.company}
            onChange={(e) => {
              setFormData({ ...formData, company: e.target.value });
              markDirty();
            }}
          />
          <Input
            name="email"
            type="email"
            placeholder="Email Address (Optional)"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              markDirty();
            }}
          />
          <Button type="submit" className="mt-4" disabled={isSubmitting}>
            Create Client
          </Button>
        </form>
      </Modal>

      <ConfirmModal {...discardModalProps} />
    </div>
  );
}
