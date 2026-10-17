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
import { Login } from './pages/Login';

// ── Auth Guard ───────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isSetupComplete, authToken } = useAppStore();

  if (!isSetupComplete) {
    return <Navigate to="/setup" replace />;
  }

  if (!authToken) {
    return <Navigate to="/login" replace />;
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
  const { isSetupComplete, authToken } = useAppStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Root Redirect Logic */}
        <Route path="/" element={
          !isSetupComplete ? <Navigate to="/setup" replace /> :
          !authToken ? <Navigate to="/login" replace /> :
          <Navigate to="/dashboard" replace />
        } />
        
        {/* Initial Setup Flow */}
        <Route path="/setup" element={
          isSetupComplete ? <Navigate to="/" replace /> : <InitialSetup />
        } />

        {/* Master Key Login */}
        <Route path="/login" element={
          !isSetupComplete ? <Navigate to="/setup" replace /> :
          authToken ? <Navigate to="/dashboard" replace /> : <Login />
        } />
        
        {/* Main Application Routes */}
        <Route path="/*" element={<CRMShell />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
