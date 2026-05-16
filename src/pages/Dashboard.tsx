import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
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
  const totalCount = attendancesData?.length || 0;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // 남/여 기숙사 미출석 계산
  const maleAbsent = attendancesData?.filter((a) => a.status === 'ABSENT' && a.student.gender === 'MALE').length || 0;
  const femaleAbsent = attendancesData?.filter((a) => a.status === 'ABSENT' && a.student.gender === 'FEMALE').length || 0;

  // 오늘 외박 인원 (SLEEPOVER 상태)
  const todaySleepover = attendancesData?.filter((a) => a.status === 'SLEEPOVER').length || 0;
  const lateCount = attendancesData?.filter((a) => a.status === 'LATE').length || 0;

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

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const metricCards = [
    { label: '출석', value: presentCount, tone: 'present' },
    { label: '미출석', value: absentCount, tone: 'absent' },
    { label: '지연', value: lateCount, tone: 'late' },
    { label: '외박', value: todaySleepover, tone: 'sleepover' },
  ];

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
        <section className="dashboard-hero">
          <div className="hero-copy">
            <span className="hero-kicker">{todayLabel}</span>
            <h1>오늘의 기숙사</h1>
            <p>오늘 점호 흐름을 빠르게 정리했어요.</p>
          </div>

          <div className="hero-attendance-card">
            <div className="hero-card-top">
              <span>출석률</span>
              <strong>{attendanceRate}%</strong>
            </div>
            <div className="attendance-ring" style={{ '--rate': `${attendanceRate}%` } as CSSProperties}>
              <div className="ring-inner">
                <span>{presentCount}</span>
                <small>/{totalCount || 0}명</small>
              </div>
            </div>
            <button className="hero-action" onClick={() => navigate('/check')}>
              인원 확인
            </button>
          </div>
        </section>

        <section className="metrics-strip">
          {metricCards.map((metric) => (
            <div className={`metric-card ${metric.tone}`} key={metric.label}>
              <span className="metric-label">{metric.label}</span>
              <strong>{metric.value}명</strong>
              <div className="metric-bar">
                <span
                  style={{
                    width: `${totalCount > 0 ? Math.min(100, Math.round((metric.value / totalCount) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="dashboard-grid">
          <div className="insight-panel">
            <div className="section-heading">
              <span>Details</span>
              <h2>출결 세부 현황</h2>
            </div>

            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-label">남기숙사 미출석</span>
                <span className="detail-value">{maleAbsent}명</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">여기숙사 미출석</span>
                <span className="detail-value">{femaleAbsent}명</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">확인 필요 인원</span>
                <span className="detail-value">{absentCount + lateCount}명</span>
              </div>
            </div>
          </div>

          <div className="notice-section">
            <div className="section-heading notice-heading">
              <div>
                <span>Announcements</span>
                <h2>최근 공지사항</h2>
              </div>
              <button
                className="notice-register-btn"
                onClick={() => navigate('/notice')}
              >
                공지 등록
              </button>
            </div>

            <div className="notice-list">
              {announcements.length === 0 ? (
                <div className="notice-empty">
                  <p>등록된 공지사항이 없습니다.</p>
                </div>
              ) : (
                announcements.map((notice, index) => {
                  const { date, time } = formatDate(notice.createdAt);
                  return (
                    <button
                      key={notice.id}
                      className="notice-item"
                      onClick={() => navigate(`/notice/${notice.id}`)}
                    >
                      <span className="notice-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="notice-title">{notice.title}</span>
                      <span className="notice-meta">
                        <span>{date}</span>
                        <span>{time}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
