import type { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CitizenPage from './pages/CitizenPage';
import HomePage from './pages/HomePage';
import UploadReportsPage from './pages/UploadReportsPage';
import { RequireAuth, RequireAdmin } from './components/auth/ProtectedRoute';
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

    {/* Protected Upload Document / Evidence View - Strictly Restricted to Predefined Administrator */}
    <Route
      path="/upload-document"
      element={
        <RequireAdmin>
          <UploadReportsPage />
        </RequireAdmin>
      }
    />
    <Route
      path="/upload-reports"
      element={
        <RequireAdmin>
          <UploadReportsPage />
        </RequireAdmin>
      }
    />

    {/* Redirects */}
    <Route path="/upload-report" element={<Navigate to="/upload-document" replace />} />
    <Route path="/lab-reports" element={<Navigate to="/upload-document" replace />} />
    <Route path="/admin/upload-document" element={<Navigate to="/upload-document" replace />} />
    <Route path="/admin/upload-reports" element={<Navigate to="/upload-document" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
