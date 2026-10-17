import React from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download } from 'lucide-react';
import './Reports.css';

import { getData } from '../utils/storage';

export function Reports() {
  const clients = getData('clients') || [];
  const projects = getData('projects') || [];
  const invoices = getData('invoices') || [];

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
            <h2 className="massive-number text-accent">${totalValue.toLocaleString()}</h2>
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
