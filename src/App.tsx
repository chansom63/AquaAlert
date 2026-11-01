import type { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CitizenPage from './pages/CitizenPage';
import HomePage from './pages/HomePage';
import './App.css';

const App: FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/user" element={<CitizenPage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
