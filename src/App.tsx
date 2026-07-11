import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Check = lazy(() => import('./pages/Check'));
const NightStudy = lazy(() => import('./pages/NightStudy'));
const PhoneSubmission = lazy(() => import('./pages/PhoneSubmission'));
const Sleepover = lazy(() => import('./pages/Sleepover'));
const Notice = lazy(() => import('./pages/Notice'));
const NoticeDetail = lazy(() => import('./pages/NoticeDetail'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Room = lazy(() => import('./pages/Room'));
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const Login = lazy(() => import('./pages/Login'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const PublicPatchNote = lazy(() => import('./pages/PublicPatchNote'));
const TeacherPatchNote = lazy(() => import('./pages/TeacherPatchNote'));
const PatchNoteAdmin = lazy(() => import('./pages/PatchNoteAdmin'));
const InquiryForm = lazy(() => import('./pages/InquiryForm'));
const InquiryAdmin = lazy(() => import('./pages/InquiryAdmin'));
const Council = lazy(() => import('./pages/Council'));
const TemporaryLogin = lazy(() => import('./pages/TemporaryLogin'));
const TemporaryScan = lazy(() => import('./pages/TemporaryScan'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div role="status">페이지를 불러오는 중...</div>}>
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
      </Suspense>
    </Router>
  );
}

export default App;
