import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Check from './pages/Check';
import NightStudy from './pages/NightStudy';
import PhoneSubmission from './pages/PhoneSubmission';
import Sleepover from './pages/Sleepover';
import Notice from './pages/Notice';
import NoticeDetail from './pages/NoticeDetail';
import Schedule from './pages/Schedule';
import Room from './pages/Room';
import StudentManagement from './pages/StudentManagement';
import Login from './pages/Login';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PublicPatchNote from './pages/PublicPatchNote';
import TeacherPatchNote from './pages/TeacherPatchNote';
import PatchNoteAdmin from './pages/PatchNoteAdmin';
import InquiryForm from './pages/InquiryForm';
import InquiryAdmin from './pages/InquiryAdmin';
import Council from './pages/Council';
import TemporaryLogin from './pages/TemporaryLogin';
import TemporaryScan from './pages/TemporaryScan';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        {/* 공개 패치노트 페이지 (로그인 불필요) - 외부 링크 공유용 */}
        <Route path="/patchnote/public" element={<PublicPatchNote />} />
        <Route path="/patchnote/public/:id" element={<PublicPatchNote />} />
        {/* 문의 폼 페이지 (로그인 불필요) */}
        <Route path="/inquiry" element={<InquiryForm />} />
        {/* 임시 모바일 출석 페이지 (로그인 불필요) */}
        <Route path="/temporary/login" element={<TemporaryLogin />} />
        <Route path="/temporary/scan" element={<TemporaryScan />} />
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
          <Route path="night-study" element={<NightStudy />} />
          <Route path="phone-submissions" element={<PhoneSubmission />} />
          <Route path="sleepovers" element={<Sleepover />} />
          <Route path="notice" element={<Notice />} />
          <Route path="notice/:id" element={<NoticeDetail />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="room" element={<Room />} />
          <Route path="council" element={<Council />} />
          {/* Teacher 전용 패치노트 페이지 */}
          <Route path="teacher-patchnote" element={<TeacherPatchNote />} />
          <Route
            path="teacher-patchnote/:id"
            element={<TeacherPatchNote />}
          />
          {/* Admin 전용 페이지 */}
          <Route path="admin/council" element={<Council />} />
          <Route path="admin/patchnote" element={<PatchNoteAdmin />} />
          <Route path="admin/inquiry" element={<InquiryAdmin />} />
          <Route
            path="admin/account-management"
            element={<StudentManagement />}
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
