import type { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CitizenPage from './pages/CitizenPage';
import HomePage from './pages/HomePage';
import LabPortalPage from './pages/LabPortalPage';
import UploadReportsPage from './pages/UploadReportsPage';
import { RequireAuth, RequireAdmin, RequireLab } from './components/auth/ProtectedRoute';
import './App.css';

const App: FC = () => (
  <Routes>
    {/* Public Landing & Presentation Page */}
    <Route path="/" element={<HomePage />} />

    {/* Protected Citizen / User Portal - Requires Authenticated User Account */}
    <Route
      path="/user"
      element={
        <RequireAuth>
          <CitizenPage />
        </RequireAuth>
      }
    />

    {/* Protected Municipal Admin Portal - Strictly Restricted to Predefined Administrator */}
    <Route
      path="/admin"
      element={
        <RequireAdmin>
          <AdminPage />
        </RequireAdmin>
      }
    />

    {/* Protected Laboratory Analytical Portal - Restricted to Accredited Lab Personnel & Admins */}
    <Route
      path="/lab"
      element={
        <RequireLab>
          <LabPortalPage />
        </RequireLab>
      }
    />
    <Route
      path="/lab-portal"
      element={
        <RequireLab>
          <LabPortalPage />
        </RequireLab>
      }
    />
    <Route
      path="/lab/login"
      element={
        <RequireLab>
          <LabPortalPage />
        </RequireLab>
      }
    />
    <Route
      path="/lab/upload"
      element={
        <RequireLab>
          <LabPortalPage />
        </RequireLab>
      }
    />

    {/* Protected Upload Document / Evidence View - Accessible to Lab Analysts & Admins */}
    <Route
      path="/upload-document"
      element={
        <RequireLab>
          <UploadReportsPage />
        </RequireLab>
      }
    />
    <Route
      path="/upload-reports"
      element={
        <RequireLab>
          <UploadReportsPage />
        </RequireLab>
      }
    />

    {/* Redirects */}
    <Route path="/upload-report" element={<Navigate to="/lab" replace />} />
    <Route path="/lab-reports" element={<Navigate to="/lab" replace />} />
    <Route path="/admin/upload-document" element={<Navigate to="/upload-document" replace />} />
    <Route path="/admin/upload-reports" element={<Navigate to="/upload-document" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
