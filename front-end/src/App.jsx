import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import DuelDetail from './pages/DuelDetail';
import HistoryPage from './pages/HistoryPage';
import SoloPage from './pages/SoloPage';
import SoloSessionDetail from './pages/SoloSessionDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/duel/:id" element={<DuelDetail />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/solo" element={<SoloPage />} />
        <Route path="/solo/:id" element={<SoloSessionDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
