import React, { useEffect, useReducer } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download } from 'lucide-react';
import './Reports.css';

import { getData, getCurrency } from '../utils/storage';
import { formatMoney } from '../utils/format';

export function Reports() {
  // Re-render when workspace data or the user profile (currency) changes,
  // so reports reflect edits without a full page reload (AC3.1.3).
  const [, forceRender] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    window.addEventListener('vertex-data-change', forceRender);
    return () => window.removeEventListener('vertex-data-change', forceRender);
  }, []);

  const clients = getData('clients') || [];
  const projects = getData('projects') || [];
  const invoices = getData('invoices') || [];
  const currency = getCurrency();

  const totalValue = projects.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1 className="page-title">Reports & Insight</h1>
        <div className="actions-group">
          <Button variant="secondary"><Download size={16} /> Export Analysis</Button>
        </div>
      </div>

      <div className="reports-grid">
        <Card className="report-card">
          <CardHeader>Pipeline Volume</CardHeader>
          <CardContent className="centered-metric">
            <h2 className="massive-number">{projects.length}</h2>
            <p className="metric-context">Total projects tracked in workspace</p>
          </CardContent>
        </Card>

        <Card className="report-card">
          <CardHeader>Workspace Value</CardHeader>
          <CardContent className="centered-metric">
            <h2 className="massive-number text-accent">{formatMoney(totalValue, currency)}</h2>
            <p className="metric-context">Combined value of all active pursuits</p>
          </CardContent>
        </Card>

        <Card className="report-card">
          <CardHeader>Client Base</CardHeader>
          <CardContent className="centered-metric">
            <h2 className="massive-number">{clients.length}</h2>
            <p className="metric-context">Unique relationships managed</p>
          </CardContent>
        </Card>

        <Card className="report-card">
          <CardHeader>Billable Activity</CardHeader>
          <CardContent className="centered-metric">
            <h2 className="massive-number">{invoices.length}</h2>
            <p className="metric-context">Invoices generated in this cycle</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
