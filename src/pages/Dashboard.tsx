import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services/attendance.service';
import { announcementService } from '../services/announcement.service';
import type {
  AnnouncementResponse,
  AttendanceResponse,
  AttendanceStatus,
  AttendanceType,
} from '../types/api';
import { DashboardSkeleton } from '../components/Skeleton';
import { MoonIcon, SunIcon } from '../components/Icons';
import { formatLocalDate } from '../utils/date';
import '../styles/Dashboard.css';

interface AttendanceSummary {
  total: number;
  target: number;
  present: number;
  absent: number;
  late: number;
  sleepover: number;
  attended: number;
  rate: number;
  presentRate: number;
  lateRate: number;
  maleAbsent: number;
  femaleAbsent: number;
}

const PERIOD_CONFIG: Record<
  AttendanceType,
  {
    title: string;
    eyebrow: string;
    rateLabel: string;
    completeLabel: string;
    absentLabel: string;
    lateLabel: string;
  }
> = {
  MORNING: {
    title: '아침 퇴실',
    eyebrow: 'Morning check-out',
    rateLabel: '퇴실 확인률',
    completeLabel: '퇴실 완료',
    absentLabel: '미퇴실',
    lateLabel: '지연 퇴실',
  },
  NIGHT: {
    title: '저녁 입실',
    eyebrow: 'Evening check-in',
    rateLabel: '입실 확인률',
    completeLabel: '입실 완료',
    absentLabel: '미입실',
    lateLabel: '지연 입실',
  },
};

const getAttendanceStatus = (
  attendance: AttendanceResponse,
  attendanceType: AttendanceType,
): AttendanceStatus =>
  attendanceType === 'MORNING'
    ? attendance.morningCheckStatus
    : attendance.nightCheckStatus;

const buildAttendanceSummary = (
  attendances: AttendanceResponse[],
  attendanceType: AttendanceType,
): AttendanceSummary => {
  const summary = attendances.reduce(
    (result, attendance) => {
      const status = getAttendanceStatus(attendance, attendanceType);

      if (status === 'PRESENT') result.present += 1;
      if (status === 'ABSENT') {
        result.absent += 1;
        if (attendance.student.gender === 'MALE') result.maleAbsent += 1;
        if (attendance.student.gender === 'FEMALE') result.femaleAbsent += 1;
      }
      if (status === 'LATE') result.late += 1;
      if (status === 'SLEEPOVER') result.sleepover += 1;

      return result;
    },
    {
      present: 0,
      absent: 0,
      late: 0,
      sleepover: 0,
      maleAbsent: 0,
      femaleAbsent: 0,
    },
  );

  const total = attendances.length;
  const target = Math.max(0, total - summary.sleepover);
  const attended = summary.present + summary.late;
  const rate = target > 0 ? Math.round((attended / target) * 100) : 0;
  const presentRate =
    target > 0 ? Math.min(100, (summary.present / target) * 100) : 0;
  const lateRate =
    target > 0
      ? Math.min(100 - presentRate, (summary.late / target) * 100)
      : 0;

  return {
    ...summary,
    total,
    target,
    attended,
    rate,
    presentRate,
    lateRate,
  };
};

export default function Dashboard() {
  const today = formatLocalDate();
  const navigate = useNavigate();
  const currentAttendanceType: AttendanceType =
    new Date().getHours() < 12 ? 'MORNING' : 'NIGHT';

  const { data: attendancesData, isLoading: attendancesLoading } = useQuery({
    queryKey: ['attendances', today],
    queryFn: () => attendanceService.getAttendances(today),
  });

  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements', 'dashboard'],
    queryFn: () => announcementService.getAnnouncements({ page: 0, size: 6 }),
  });

  const isLoading = attendancesLoading || announcementsLoading;
  const attendances = attendancesData ?? [];
  const summaries: Record<AttendanceType, AttendanceSummary> = {
    MORNING: buildAttendanceSummary(attendances, 'MORNING'),
    NIGHT: buildAttendanceSummary(attendances, 'NIGHT'),
  };
  const announcements: AnnouncementResponse[] =
    announcementsData?.content ?? [];

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
      time: `${period} ${displayHours}:${minutes}`,
    };
  };

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

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
        <section className="dashboard-hero dashboard-period-hero">
          <div className="hero-copy">
            <span className="hero-kicker">{todayLabel}</span>
            <h1>오늘의 기숙사 출결</h1>
            <p>아침 퇴실과 저녁 입실 현황을 시간대별로 확인하세요.</p>
          </div>

          <div className="hero-period-visual" aria-hidden="true">
            <span className="hero-period-orb morning">
              <SunIcon />
            </span>
            <span className="hero-period-line" />
            <span className="hero-period-orb night">
              <MoonIcon />
            </span>
          </div>
        </section>

        <section className="period-overview-grid" aria-label="오늘의 시간대별 출결">
          {(['MORNING', 'NIGHT'] as AttendanceType[]).map((attendanceType) => {
            const config = PERIOD_CONFIG[attendanceType];
            const summary = summaries[attendanceType];
            const isCurrent = currentAttendanceType === attendanceType;

            return (
              <article
                className={`period-overview-card ${attendanceType.toLowerCase()} ${
                  isCurrent ? 'current' : ''
                }`}
                key={attendanceType}
              >
                <div className="period-card-heading">
                  <span className="period-card-icon">
                    {attendanceType === 'MORNING' ? <SunIcon /> : <MoonIcon />}
                  </span>
                  <div>
                    <span>{config.eyebrow}</span>
                    <h2>{config.title}</h2>
                  </div>
                  {isCurrent && <em>현재 시간대</em>}
                </div>

                <div className="period-card-rate">
                  <div>
                    <span>{config.rateLabel}</span>
                    <strong>{summary.rate}%</strong>
                  </div>
                  <span>
                    {summary.attended}/{summary.target}명
                  </span>
                </div>

                <div
                  className="period-progress"
                  aria-label={`${config.rateLabel} ${summary.rate}%`}
                >
                  <span
                    className="period-progress-complete"
                    style={{ width: `${summary.presentRate}%` }}
                  />
                  <span
                    className="period-progress-late"
                    style={{ width: `${summary.lateRate}%` }}
                  />
                </div>

                <div className="period-card-metrics">
                  <div>
                    <span>{config.completeLabel}</span>
                    <strong>{summary.present}명</strong>
                  </div>
                  <div className="attention">
                    <span>{config.absentLabel}</span>
                    <strong>{summary.absent}명</strong>
                  </div>
                  <div className="late">
                    <span>{config.lateLabel}</span>
                    <strong>{summary.late}명</strong>
                  </div>
                  <div>
                    <span>외박</span>
                    <strong>{summary.sleepover}명</strong>
                  </div>
                </div>

                <div className="period-card-footer">
                  <span>
                    남 {config.absentLabel} {summary.maleAbsent}명 · 여{' '}
                    {config.absentLabel} {summary.femaleAbsent}명
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/check')}
                  >
                    인원 확인
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="dashboard-grid">
          <div className="insight-panel attendance-attention-panel">
            <div className="section-heading">
              <span>Needs attention</span>
              <h2>확인 필요 인원</h2>
            </div>

            <div className="detail-list">
              {(['MORNING', 'NIGHT'] as AttendanceType[]).map((attendanceType) => {
                const config = PERIOD_CONFIG[attendanceType];
                const summary = summaries[attendanceType];
                return (
                  <div className="detail-row period-detail-row" key={attendanceType}>
                    <span className={`detail-period-icon ${attendanceType.toLowerCase()}`}>
                      {attendanceType === 'MORNING' ? <SunIcon /> : <MoonIcon />}
                    </span>
                    <span className="detail-label">
                      <strong>{config.title}</strong>
                      {config.absentLabel} + {config.lateLabel}
                    </span>
                    <span className="detail-value">
                      {summary.absent + summary.late}명
                    </span>
                  </div>
                );
              })}
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
                      <span className="notice-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
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
