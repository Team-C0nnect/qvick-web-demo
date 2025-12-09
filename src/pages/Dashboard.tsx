import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services/attendance.service';
import { announcementService } from '../services/announcement.service';
import type { AnnouncementResponse } from '../types/api';
import { DashboardSkeleton } from '../components/Skeleton';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const navigate = useNavigate();

  // Fetch dashboard data
  const { data: attendancesData, isLoading: attendancesLoading } = useQuery({
    queryKey: ['attendances', today],
    queryFn: () => attendanceService.getAttendances(today),
  });

  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements', 'dashboard'],
    queryFn: () => announcementService.getAnnouncements({ page: 0, size: 6 }),
  });

  const isLoading = attendancesLoading || announcementsLoading;

  // 출석 현황 계산
  const presentCount = attendancesData?.filter((a) => a.status === 'PRESENT').length || 0;
  const absentCount = attendancesData?.filter((a) => a.status === 'ABSENT').length || 0;

  // 남/여 기숙사 미출석 계산
  const maleAbsent = attendancesData?.filter((a) => a.status === 'ABSENT' && a.student.gender === 'MALE').length || 0;
  const femaleAbsent = attendancesData?.filter((a) => a.status === 'ABSENT' && a.student.gender === 'FEMALE').length || 0;

  // 오늘 외박 인원 (SLEEPOVER 상태)
  const todaySleepover = attendancesData?.filter((a) => a.status === 'SLEEPOVER').length || 0;

  // 공지사항 목록
  const announcements: AnnouncementResponse[] = announcementsData?.content || [];

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours;
    return {
      date: `${year}.${month}.${day}.`,
      time: `${period} ${displayHours}:${minutes}`
    };
  };

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        {/* 출결 현황 섹션 */}
        <div className="attendance-section">
          <h2 className="section-title">출결 현황</h2>
          
          {/* 출석/미출석 카드 */}
          <div className="attendance-cards">
            <div className="attendance-card">
              <p className="attendance-label">출석 인원</p>
              <p className="attendance-value">{presentCount}명</p>
            </div>
            <div className="attendance-card">
              <p className="attendance-label">미출석 인원</p>
              <p className="attendance-value">{absentCount}명</p>
            </div>
          </div>

          {/* 상세 현황 */}
          <div className="attendance-details">
            <div className="detail-row">
              <span className="detail-label">남기숙사 미출석</span>
              <span className="detail-value">{maleAbsent}명</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">여기숙사 미출석</span>
              <span className="detail-value">{femaleAbsent}명</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">금일 외박 인원</span>
              <span className="detail-value">{todaySleepover}명</span>
            </div>
          </div>
        </div>

        {/* 공지사항 섹션 */}
        <div className="notice-section">
          <h2 className="section-title">등록된 공지사항</h2>
          
          <button 
            className="notice-register-btn"
            onClick={() => navigate('/notice')}
          >
            공지 등록하기
          </button>

          <div className="notice-list">
            {announcements.length === 0 ? (
              <div className="notice-empty">
                <p>등록된 공지사항이 없습니다.</p>
              </div>
            ) : (
              announcements.map((notice) => {
                const { date, time } = formatDate(notice.createdAt);
                return (
                  <div 
                    key={notice.id} 
                    className="notice-item"
                    onClick={() => navigate(`/notice/${notice.id}`)}
                  >
                    <span className="notice-title">{notice.title}</span>
                    <span className="notice-date">{date}</span>
                    <span className="notice-time">{time}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
