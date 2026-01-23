import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import StateDashboard from './pages/StateDashboard';
import UploadPage from './pages/UploadPage';
import ComparePage from './pages/ComparePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/state/kano" replace />} />
          <Route path="state/:stateId" element={<StateDashboard />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="compare" element={<ComparePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
