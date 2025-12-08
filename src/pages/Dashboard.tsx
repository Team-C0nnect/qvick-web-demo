import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../services/student.service';
import { attendanceService } from '../services/attendance.service';
import { announcementService } from '../services/announcement.service';
import { DashboardSkeleton } from '../components/Skeleton';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0];

  // Fetch dashboard data
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
  });

  const { data: attendancesData, isLoading: attendancesLoading } = useQuery({
    queryKey: ['attendances', today],
    queryFn: () => attendanceService.getAttendances(today),
  });

  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements', 'unread'],
    queryFn: () => announcementService.getAnnouncements({ page: 0, size: 100 }),
  });

  const isLoading = studentsLoading || attendancesLoading || announcementsLoading;

  const totalStudents = studentsData?.totalElements || 0;
  const presentCount = attendancesData?.filter((a) => a.status === 'PRESENT').length || 0;
  const absentCount = attendancesData?.filter((a) => a.status === 'ABSENT').length || 0;
  const unreadAnnouncements = announcementsData?.totalElements || 0;

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="welcome-section">
        <h1 className="dashboard-title">대시보드</h1>
        <p className="dashboard-subtitle">Qvick 기숙사 관리 시스템에 오신 것을 환영합니다</p>
      </div>

      <div className="quick-links">
        <Link to="/check" className="quick-link-card">
          <div className="card-icon check"></div>
          <h3 className="card-title">인원 확인</h3>
          <p className="card-description">학생 출석 현황을 확인하고 관리합니다</p>
        </Link>

        <Link to="/notice" className="quick-link-card">
          <div className="card-icon notice"></div>
          <h3 className="card-title">공지사항</h3>
          <p className="card-description">기숙사 공지사항을 작성하고 확인합니다</p>
        </Link>

        <Link to="/schedule" className="quick-link-card">
          <div className="card-icon schedule"></div>
          <h3 className="card-title">일정 관리</h3>
          <p className="card-description">기숙사 일정을 등록하고 관리합니다</p>
        </Link>

        <Link to="/room" className="quick-link-card">
          <div className="card-icon room"></div>
          <h3 className="card-title">방 관리</h3>
          <p className="card-description">기숙사 방을 등록하고 관리합니다</p>
        </Link>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <h4 className="stat-label">오늘 출석</h4>
          <p className="stat-value positive">{presentCount}명</p>
        </div>
        <div className="stat-card">
          <h4 className="stat-label">미출석</h4>
          <p className="stat-value negative">{absentCount}명</p>
        </div>
        <div className="stat-card">
          <h4 className="stat-label">전체 학생</h4>
          <p className="stat-value">{totalStudents}명</p>
        </div>
        <div className="stat-card">
          <h4 className="stat-label">전체 공지</h4>
          <p className="stat-value">{unreadAnnouncements}개</p>
        </div>
      </div>
    </div>
  );
}
