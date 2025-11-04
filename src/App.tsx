import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Check from './pages/Check';
import Notice from './pages/Notice';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
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
          <Route path="schedule" element={<Schedule />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

