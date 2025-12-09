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
import PatchNote from './pages/PatchNote';
import PatchNoteAdmin from './pages/PatchNoteAdmin';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        {/* 공개 패치노트 페이지 (로그인 불필요) */}
        <Route path="/patchnote" element={<PatchNote />} />
        <Route path="/patchnote/:id" element={<PatchNote />} />
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
          {/* Admin 전용 패치노트 관리 페이지 */}
          <Route path="admin/patchnote" element={<PatchNoteAdmin />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

