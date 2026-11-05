import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Projects } from './pages/Projects';
import { Pipeline } from './pages/Pipeline';
import { Tasks } from './pages/Tasks';
import { Invoices } from './pages/Invoices';
import { Reports } from './pages/Reports';
import { ClientDetail } from './pages/ClientDetail';
import { ProjectDetail } from './pages/ProjectDetail';
import { Settings } from './pages/Settings';
import { InitialSetup } from './pages/InitialSetup';

// ── Setup Guard ──────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isSetupComplete } = useAppStore();

  if (!isSetupComplete) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

// ── Shared CRM Shell ─────────────────────────────────────────────────────────

function CRMShell() {
  return (
    <Routes>
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────

function App() {
  const { isSetupComplete } = useAppStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={<Navigate to={isSetupComplete ? '/dashboard' : '/setup'} replace />}
        />

        {/* Local setup flow */}
        <Route
          path="/setup"
          element={isSetupComplete ? <Navigate to="/dashboard" replace /> : <InitialSetup />}
        />

        {/* Legacy auth route — the local demo has no login gate */}
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* Main application routes */}
        <Route path="/*" element={<CRMShell />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
