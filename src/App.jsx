import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import StateDashboard from './pages/StateDashboard';
import MDADirectory from './pages/MDADirectory';
import SectorAnalysis from './pages/SectorAnalysis';
import UploadPage from './pages/UploadPage';
import ComparePage from './pages/ComparePage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLoginPage from './pages/AdminLoginPage';
import BackupPage from './pages/BackupPage';
import SystemLogsPage from './pages/SystemLogsPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/state/kano" replace />} />
          <Route path="state/:stateId" element={<StateDashboard />} />
          <Route path="state/:stateId/mdas" element={<MDADirectory />} />
          <Route path="state/:stateId/sectors" element={<SectorAnalysis />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="compare" element={<ComparePage />} />
        </Route>

        {/* Admin Section */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="logs" element={<SystemLogsPage />} />
          <Route path="backup" element={<BackupPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
