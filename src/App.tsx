import type { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CitizenPage from './pages/CitizenPage';
import HomePage from './pages/HomePage';
import UploadReportsPage from './pages/UploadReportsPage';
import './App.css';

const App: FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/user" element={<CitizenPage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/upload-document" element={<UploadReportsPage />} />
    <Route path="/upload-reports" element={<UploadReportsPage />} />
    <Route path="/upload-report" element={<Navigate to="/upload-document" replace />} />
    <Route path="/lab-reports" element={<Navigate to="/upload-document" replace />} />
    <Route path="/admin/upload-document" element={<Navigate to="/upload-document" replace />} />
    <Route path="/admin/upload-reports" element={<Navigate to="/upload-document" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
