import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Send, Download, AlertCircle, Trash2 } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { getLocalUser, getData, addDataItem, updateDataItem, getContext, logActivity } from '../utils/storage';
import { formatMoney } from '../utils/format';
import { createLineItem, normalizeLineItems, lineItemAmount, invoiceTotal, invoiceItemCount, round2 } from '../utils/invoice';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Input } from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useSubmitGuard } from '../hooks/useSubmitGuard';
import { useQueryParams } from '../hooks/useQueryParams';
import './Invoices.css';
import './Clients.css';

export function Invoices() {
  const { getParam, setParam } = useQueryParams();
  const [isModalOpen, setIsModalOpen] = useState(() => Boolean(getParam('client')));
  const { username } = getContext();
  const user = getLocalUser(username);
  const currency = user.currency || 'USD';

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState(() => getData('clients') || []);
  const [projects, setProjects] = useState([]);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState(() => getParam('client') || '');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [lineItems, setLineItems] = useState(() => [createLineItem()]);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const net15 = new Date(Date.now() + 15 * 86400000);
    return net15.toISOString().split('T')[0];
  });
  const [formError, setFormError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [invoicePendingPayment, setInvoicePendingPayment] = useState(null);
  const toast = useToast();
  const { isSubmitting, guard } = useSubmitGuard();

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
    return invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + invoiceTotal(i), 0);
  }, [invoices]);

  const totalOverdue = useMemo(() => {
    return invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + invoiceTotal(i), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + invoiceTotal(i), 0);
  }, [invoices]);

  // Live total of the invoice currently being drafted
  const draftTotal = useMemo(
    () => round2(lineItems.reduce((sum, it) => sum + lineItemAmount(it), 0)),
    [lineItems]
  );

  // ── Line item editing ──────────────────────────────────────────────────
  const addLineItem = () => {
    setLineItems(prev => [...prev, createLineItem()]);
    markDirty();
  };

  const updateLineItem = (id, patch) => {
    setLineItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
    markDirty();
  };

  const removeLineItem = (id) => {
    setLineItems(prev => (prev.length > 1 ? prev.filter(it => it.id !== id) : prev));
    markDirty();
  };

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
    setFormError('');
    setIsDirty(false);
    setLineItems([createLineItem()]);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsDirty(false);
    setFormError('');
    if (getParam('client')) {
      setParam('client', '');
    }
  };

  const { requestClose, discardModalProps } = useDiscardGuard({
    isDirty,
    onClose: closeModal,
  });

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleCreate = guard((e) => {
    e.preventDefault();

    const clientObj = clients.find(c => c.id === selectedClientId);
    if (!clientObj) {
      setFormError('Please select a valid client.');
      return;
    }

    const projectObj = projects.find(p => p.id === selectedProjectId);
    const invoiceId = generateNextInvoiceId();

    // Validate line items before anything is written
    const items = normalizeLineItems(lineItems);
    const total = round2(items.reduce((sum, it) => sum + it.amount, 0));

    if (items.length === 0) {
      setFormError('Add at least one line item with a description and an amount.');
      return;
    }
    if (total <= 0) {
      setFormError('Invoice total must be greater than zero.');
      return;
    }
    if (items.some(it => !it.description)) {
      setFormError('Every line item needs a description.');
      return;
    }

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
      amount: total,
      line_items: items,
      currency_code: currency,
      issued: formattedIssued,
      due: formattedDue,
      status: 'Pending',
      statusColor: 'amber',
      createdAt: new Date().toISOString()
    };

    const saved = addDataItem('invoices', newInvoice);
    logActivity('note', `Generated invoice: ${saved.id} for ${saved.client}`, clientObj.company || clientObj.name);

    setInvoices(prev => [saved, ...prev]);
    closeModal();
    toast.success('Invoice created', `${saved.id} · ${formatMoney(invoiceTotal(saved), saved.currency_code || currency)}`);
  });

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
      toast.success('Invoice marked as paid', `${updated.id} · ${formatMoney(invoiceTotal(updated), updated.currency_code || currency)}`);
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

      <Modal isOpen={isModalOpen} onClose={requestClose} title="Generate New Invoice">
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
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
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

            <div>
              <label className="text-xs text-secondary font-medium block mb-1">Associated Project (Optional)</label>
              <select
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  markDirty();
                }}
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
              <div className="line-items-head">
                <span className="text-xs text-secondary font-medium">Line Items *</span>
                <button type="button" className="line-items-add" onClick={addLineItem}>
                  <Plus size={14} /> Add item
                </button>
              </div>

              <div className="line-items-editor">
                {lineItems.map((item, idx) => (
                  <div className="line-item" key={item.id}>
                    <div className="line-item-top">
                      <Input
                        name={`li-desc-${idx}`}
                        aria-label={`Line item ${idx + 1} description`}
                        placeholder="e.g. Brand identity design — Phase 1"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                      />
                      <button
                        type="button"
                        className="line-item-remove"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        aria-label={`Remove line item ${idx + 1}`}
                        title={lineItems.length === 1 ? 'An invoice needs at least one line item' : 'Remove line item'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="line-item-bottom">
                      <div className="li-field li-qty">
                        <label className="li-label" htmlFor={`li-qty-${idx}`}>Qty</label>
                        <Input
                          id={`li-qty-${idx}`}
                          name={`li-qty-${idx}`}
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, { quantity: e.target.value })}
                        />
                      </div>

                      <div className="li-field li-rate">
                        <label className="li-label" htmlFor={`li-rate-${idx}`}>Rate ({currency})</label>
                        <Input
                          id={`li-rate-${idx}`}
                          name={`li-rate-${idx}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => updateLineItem(item.id, { rate: e.target.value })}
                        />
                      </div>

                      <div className="li-field li-amount">
                        <span className="li-label">Amount</span>
                        <span className="li-amount-value">{formatMoney(lineItemAmount(item), currency)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="line-items-total">
                <span>Total</span>
                <span className="line-items-total-value">{formatMoney(draftTotal, currency)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Issue Date</label>
                <Input
                  name="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    setIssueDate(e.target.value);
                    markDirty();
                  }}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-secondary font-medium block mb-1">Due Date</label>
                <Input
                  name="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    markDirty();
                  }}
                  required
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-danger" style={{ margin: 0 }}>{formError}</p>
            )}

            <Button type="submit" className="mt-2" disabled={isSubmitting}>
              Publish Invoice
            </Button>
          </form>
        )}
      </Modal>

      <ConfirmModal {...discardModalProps} />

      <ConfirmModal
        isOpen={invoicePendingPayment !== null}
        title="Mark invoice as paid?"
        message={
          invoicePendingPayment
            ? `This records ${invoicePendingPayment.id} (${invoicePendingPayment.client}) as paid and stamps the payment date. This cannot be undone.`
            : ''
        }
        confirmLabel="Mark as paid"
        onConfirm={() => {
          if (invoicePendingPayment) handleMarkAsPaid(invoicePendingPayment.id);
          setInvoicePendingPayment(null);
        }}
        onCancel={() => setInvoicePendingPayment(null)}
      />

      <Card noPadding className="table-responsive">
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
                  <td className="font-mono font-semibold">
                    {formatMoney(invoiceTotal(inv), inv.currency_code || currency)}
                    {invoiceItemCount(inv) > 1 && (
                      <span className="item-count">{invoiceItemCount(inv)} items</span>
                    )}
                  </td>
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
                          onClick={() => setInvoicePendingPayment(inv)}
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
