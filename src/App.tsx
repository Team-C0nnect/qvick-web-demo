import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Check from './pages/Check';
import Notice from './pages/Notice';
import NoticeDetail from './pages/NoticeDetail';
import Schedule from './pages/Schedule';
import Room from './pages/Room';
import Login from './pages/Login';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="check" element={<Check />} />
          <Route path="notice" element={<Notice />} />
          <Route path="notice/:id" element={<NoticeDetail />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="room" element={<Room />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

