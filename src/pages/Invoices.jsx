import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Send, Download, AlertCircle } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { getLocalUser, getData, addDataItem, updateDataItem, getContext, logActivity } from '../utils/storage';
import { formatMoney } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import './Invoices.css';
import './Clients.css';

export function Invoices() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { username } = getContext();
  const user = getLocalUser(username);
  const currency = user.currency || 'USD';

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const net15 = new Date(Date.now() + 15 * 86400000);
    return net15.toISOString().split('T')[0];
  });

  const loadAllData = useCallback(() => {
    const invList = getData('invoices') || [];
    const clientList = getData('clients') || [];
    const projList = getData('projects') || [];
    setInvoices(invList);
    setClients(clientList);
    setProjects(projList);

    if (clientList.length > 0 && !selectedClientId) {
      setSelectedClientId(clientList[0].id);
    }
  }, [selectedClientId]);

  useEffect(() => {
    loadAllData();
    const handleDataChange = (e) => {
      const key = e.detail?.key;
      if (!key || ['invoices', 'clients', 'projects', 'user'].includes(key)) {
        loadAllData();
      }
    };
    window.addEventListener('vertex-data-change', handleDataChange);
    return () => window.removeEventListener('vertex-data-change', handleDataChange);
  }, [loadAllData]);

  // Filter projects available for the currently selected client
  const availableProjects = useMemo(() => {
    if (!selectedClientId) return [];
    const client = clients.find(c => c.id === selectedClientId);
    return projects.filter(p => 
      p.client_id === selectedClientId ||
      (client && (p.client === client.name || p.client === client.company))
    );
  }, [selectedClientId, clients, projects]);

  // Keep selected project in sync with client selection
  useEffect(() => {
    if (availableProjects.length > 0) {
      setSelectedProjectId(availableProjects[0].id);
    } else {
      setSelectedProjectId('');
    }
  }, [availableProjects]);

  // Metrics
  const totalOutstanding = useMemo(() => {
    return invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [invoices]);

  const totalOverdue = useMemo(() => {
    return invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [invoices]);

  // Generate Next Invoice ID
  const generateNextInvoiceId = () => {
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;
    let highestSeq = 0;

    invoices.forEach(inv => {
      if (inv.id && typeof inv.id === 'string' && inv.id.startsWith(prefix)) {
        const seqPart = parseInt(inv.id.replace(prefix, ''), 10);
        if (!isNaN(seqPart) && seqPart > highestSeq) {
          highestSeq = seqPart;
        }
      }
    });

    const nextSeq = highestSeq + 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  };

  const handleOpenModal = () => {
    if (clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
    setAmount('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleCreate = (e) => {
    e.preventDefault();

    const clientObj = clients.find(c => c.id === selectedClientId);
    if (!clientObj) {
      alert('Please select a valid client.');
      return;
    }

    const projectObj = projects.find(p => p.id === selectedProjectId);
    const invoiceId = generateNextInvoiceId();

    const formattedIssued = new Date(issueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const formattedDue = new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const newInvoice = {
      id: invoiceId,
      client_id: clientObj.id,
      client: clientObj.company ? `${clientObj.name} (${clientObj.company})` : clientObj.name,
      project_id: projectObj ? projectObj.id : null,
      project: projectObj ? (projectObj.name || projectObj.title) : 'General Retainer / Consulting',
      amount: parseFloat(amount) || 0,
      issued: formattedIssued,
      due: formattedDue,
      status: 'Pending',
      statusColor: 'amber',
      createdAt: new Date().toISOString()
    };

    const saved = addDataItem('invoices', newInvoice);
    logActivity('note', `Generated invoice: ${saved.id} for ${saved.client}`, clientObj.company || clientObj.name);

    setInvoices(prev => [saved, ...prev]);
    setIsModalOpen(false);
  };

  const handleDownload = (invoice) => {
    generateInvoicePDF(invoice, user);
  };

  const handleMarkAsPaid = (invoiceId) => {
    const updated = updateDataItem('invoices', invoiceId, { 
      status: 'Paid', 
      statusColor: 'green',
      paidAt: new Date().toISOString() 
    });
    if (updated) {
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updated : inv));
      logActivity('note', `Invoice ${updated.id} marked as Paid`, updated.client);
    }
  };

  return (
    <div className="invoices-page">
      <div className="page-header">
        <h1 className="page-title">
          Invoices <span className="count-badge">{invoices.length}</span>
        </h1>
        <div className="invoice-stats">
          <div className="stats-item">
            Total Outstanding: <span className="bold-value">{formatMoney(totalOutstanding, currency)}</span>
          </div>
          <div className="stats-item text-danger">
            Overdue: <span className="bold-value text-danger">{formatMoney(totalOverdue, currency)}</span>
          </div>
          <div className="stats-item">
            Paid: <span className="bold-value text-success">{formatMoney(totalPaid, currency)}</span>
          </div>
        </div>
        <Button variant="primary" onClick={handleOpenModal}>
          <Plus size={16} /> New Invoice
        </Button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate New Invoice">
        {clients.length === 0 ? (
          <div className="flex flex-col gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-500">
            <p className="m-0 text-sm">
              <strong>No clients found!</strong> You must add a client before creating an invoice.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Client *</label>
              <select
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Associated Project (Optional)</label>
              <select
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">General Retainer / Advisory (No Project)</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title}
                  </option>
                ))}
              </select>
              {availableProjects.length === 0 && (
                <p className="text-xs text-secondary mt-1">
                  No projects linked to this client yet. Invoice will be recorded as general retainer.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Invoice Amount ($) *</label>
              <Input
                name="amount"
                placeholder="e.g. 5000"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Issue Date</label>
                <Input
                  name="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Due Date</label>
                <Input
                  name="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="mt-2">
              Publish Invoice
            </Button>
          </form>
        )}
      </Modal>

      <Card className="p-none table-responsive">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Status</th>
              <th className="th-actions"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <tr key={inv.id} className={`client-row ${inv.status === 'Overdue' ? 'row-overdue' : ''}`}>
                  <td className="font-mono font-medium">{inv.id}</td>
                  <td className="font-medium">{inv.client}</td>
                  <td className="text-secondary">{inv.project || 'General Service'}</td>
                  <td className="font-mono font-semibold">{formatMoney(Number(inv.amount) || 0, currency)}</td>
                  <td className="text-secondary">{inv.issued}</td>
                  <td className={inv.status === 'Overdue' ? 'text-danger font-medium' : 'text-secondary'}>
                    {inv.due}
                  </td>
                  <td>
                    <Badge variant={inv.status === 'Paid' ? 'green' : inv.status === 'Overdue' ? 'danger' : 'amber'}>
                      {inv.status || 'Pending'}
                    </Badge>
                  </td>
                  <td className="actions-cell">
                    <div className="flex gap-xs items-center justify-end">
                      {inv.status !== 'Paid' && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleMarkAsPaid(inv.id)}
                          title="Mark as Paid"
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(inv)} title="Download PDF">
                        <Download size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  No invoices found. Generate your first invoice to see it here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
