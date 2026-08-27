import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { attendanceService } from '../services/attendance.service';
import { announcementService } from '../services/announcement.service';
import { scheduleService } from '../services/schedule.service';
import type {
  AnnouncementResponse,
  AttendanceResponse,
  AttendanceStatus,
  AttendanceType,
} from '../types/api';
import { DashboardSkeleton } from '../components/Skeleton';
import { RollingNumber } from '../components/RollingNumber';
import DonutChart from '../components/DonutChart';
import { useSelectedDate } from '../context/SelectedDateContext';
import { useAttendanceView } from '../context/AttendanceViewContext';
import CheckIcon from '../components/sidebar/svg/check.svg?react';
import NightStudyIcon from '../components/sidebar/svg/night-study.svg?react';
import PhoneSubmissionIcon from '../components/sidebar/svg/phone-submission.svg?react';
import SleepoverIcon from '../components/sidebar/svg/sleepover.svg?react';
import ScheduleIcon from '../components/sidebar/svg/schedule.svg?react';
import NoticeIcon from '../components/sidebar/svg/notice.svg?react';
import SunIcon from '../components/sidebar/svg/sun.svg?react';
import MoonIcon from '../components/sidebar/svg/moon.svg?react';
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

type SidebarIcon = ComponentType<{ className?: string }>;

const PERIOD_REFRESH_INTERVAL = 30 * 1000;

const getMinutesFromTime = (time?: string) => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const getTimeBasedAttendanceType = (
  nightStartTimes: Array<string | undefined>,
  now = new Date(),
): AttendanceType => {
  const startMinutes = nightStartTimes
    .map(getMinutesFromTime)
    .filter((minutes): minutes is number => minutes !== null);

  if (startMinutes.length === 0) {
    return now.getHours() < 12 ? 'MORNING' : 'NIGHT';
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= Math.min(...startMinutes) ? 'NIGHT' : 'MORNING';
};

const PERIOD_CONFIG: Record<
  AttendanceType,
  {
    title: string;
    rateLabel: string;
    completeLabel: string;
    absentLabel: string;
    lateLabel: string;
    closedLabel: string;
  }
> = {
  MORNING: {
    title: '아침 퇴실',
    rateLabel: '퇴실 확인률',
    completeLabel: '퇴실 완료',
    absentLabel: '미퇴실',
    lateLabel: '지연 퇴실',
    closedLabel: '이 날은 아침 퇴실 점호가 없어요',
  },
  NIGHT: {
    title: '저녁 입실',
    rateLabel: '입실 확인률',
    completeLabel: '입실 완료',
    absentLabel: '미입실',
    lateLabel: '지연 입실',
    closedLabel: '이 날은 저녁 입실 점호가 없어요',
  },
};

const CLOSED_PERIODS_BY_DAY: Record<number, AttendanceType[]> = {
  0: ['MORNING'],
  5: ['NIGHT'],
  6: ['MORNING', 'NIGHT'],
};

const isClosedPeriod = (dateStr: string, type: AttendanceType) =>
  (
    CLOSED_PERIODS_BY_DAY[new Date(`${dateStr}T00:00:00`).getDay()] ?? []
  ).includes(type);

const getAttendanceStatus = (
  attendance: AttendanceResponse,
  attendanceType: AttendanceType,
): AttendanceStatus =>
  attendanceType === 'MORNING'
    ? attendance.morningCheckStatus
    : attendance.nightCheckStatus;

const toPercent = (value: number, total: number): string =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';

const DONUT_SEGMENTS = [
  { key: 'present', color: '#22c55e' },
  { key: 'absent', color: '#ef4444' },
  { key: 'late', color: '#f59e0b' },
  { key: 'sleepover', color: '#8b5cf6' },
] as const;

function PeriodDonut({ summary }: { summary: AttendanceSummary }) {
  const total = summary.total;

  return (
    <div className="period-donut">
      <DonutChart
        total={total}
        label="출결 현황 비율"
        segments={DONUT_SEGMENTS.map(({ key, color }) => ({
          key,
          color,
          value: summary[key],
        }))}
      >
        <span>전체</span>
        <strong>
          <RollingNumber value={total} />명
        </strong>
      </DonutChart>
    </div>
  );
}

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

const QUICK_LINKS: {
  to: string;
  Icon: SidebarIcon;
  title: string;
  description: string;
}[] = [
  {
    to: '/check',
    Icon: CheckIcon,
    title: '인원 확인',
    description: '아침 퇴실과 저녁 입실 현황을 확인하세요.',
  },
  {
    to: '/night-study',
    Icon: NightStudyIcon,
    title: '심야자습 확인',
    description: '심야자습 출석 현황을 확인하세요.',
  },
  {
    to: '/phone-submissions',
    Icon: PhoneSubmissionIcon,
    title: '휴대폰 제출 확인',
    description: '휴대폰 제출 상태를 확인하세요.',
  },
  {
    to: '/sleepovers',
    Icon: SleepoverIcon,
    title: '외박 확인',
    description: '외박 신청 현황을 확인하세요.',
  },
  {
    to: '/schedule',
    Icon: ScheduleIcon,
    title: '일정 관리',
    description: '기숙사 일정을 등록하고 관리하세요.',
  },
  {
    to: '/notice',
    Icon: NoticeIcon,
    title: '공지사항',
    description: '공지사항을 등록하고 관리하세요.',
  },
];

const ATTENDANCE_TYPES: AttendanceType[] = ['MORNING', 'NIGHT'];

export default function Dashboard() {
  const { selectedDate: today } = useSelectedDate();
  const navigate = useNavigate();
  const { isManual, syncAttendanceView } = useAttendanceView();

  const {
    data: attendancesData,
    isLoading: attendancesLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['attendances', today],
    queryFn: () => attendanceService.getAttendances(today),
    placeholderData: keepPreviousData,
  });

  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements', 'dashboard'],
    queryFn: () => announcementService.getAnnouncements({ page: 0, size: 6 }),
  });

  const { data: maleSchedule } = useQuery({
    queryKey: ['schedule', today, 'MALE'],
    queryFn: () => scheduleService.getScheduleByDate(today, 'MALE'),
    retry: false,
  });

  const { data: femaleSchedule } = useQuery({
    queryKey: ['schedule', today, 'FEMALE'],
    queryFn: () => scheduleService.getScheduleByDate(today, 'FEMALE'),
    retry: false,
  });

  useEffect(() => {
    if (isManual) return;

    const updateAttendanceType = () => {
      syncAttendanceView(
        getTimeBasedAttendanceType([
          maleSchedule?.nightStartTime,
          femaleSchedule?.nightStartTime,
        ]),
      );
    };

    updateAttendanceType();
    const interval = window.setInterval(
      updateAttendanceType,
      PERIOD_REFRESH_INTERVAL,
    );

    return () => window.clearInterval(interval);
  }, [
    femaleSchedule?.nightStartTime,
    isManual,
    maleSchedule?.nightStartTime,
    syncAttendanceView,
  ]);

  const isLoading = attendancesLoading || announcementsLoading;
  const attendances = attendancesData ?? [];
  const summaries = {
    MORNING: buildAttendanceSummary(attendances, 'MORNING'),
    NIGHT: buildAttendanceSummary(attendances, 'NIGHT'),
  } satisfies Record<AttendanceType, AttendanceSummary>;
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

  const selectedDateLabel = new Date(`${today}T00:00:00`).toLocaleDateString(
    'ko-KR',
    {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    },
  );

  const [dateHeading, setDateHeading] = useState({
    date: today,
    label: selectedDateLabel,
  });

  useEffect(() => {
    if (dateHeading.date === today || isPlaceholderData) return;
    setDateHeading({ date: today, label: selectedDateLabel });
  }, [dateHeading.date, isPlaceholderData, selectedDateLabel, today]);

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
        <header className="dashboard-header">
          <h1>대시보드</h1>
          <p>기숙사 출결 현황과 공지사항을 한눈에 확인하세요.</p>
        </header>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <h2 key={dateHeading.label} className="dashboard-date-heading">
              {dateHeading.label} 출결
            </h2>
            <button
              type="button"
              className="dashboard-link"
              onClick={() => navigate('/check')}
            >
              인원 확인
              <span className="dashboard-link-chevron">›</span>
            </button>
          </div>

          <div className="period-cards-grid">
            {ATTENDANCE_TYPES.map((type) => {
              const summary = summaries[type];
              const config = PERIOD_CONFIG[type];
              const closed = isClosedPeriod(today, type);

              return (
                <article
                  key={type}
                  className={`period-card ${type.toLowerCase()}`}
                >
                  <div className="period-card-heading">
                    <span className="period-card-label">{config.title}</span>
                  </div>

                  {closed ? (
                    <div className="period-card-closed">
                      {type === 'MORNING' ? <SunIcon /> : <MoonIcon />}
                      <p>{config.closedLabel}</p>
                    </div>
                  ) : (
                    <div className="period-card-body">
                      <PeriodDonut
                        key={`${type}-${summary.present}-${summary.absent}-${summary.late}-${summary.sleepover}-${summary.total}`}
                        summary={summary}
                      />
                      <ul className="period-legend">
                        {[
                          {
                            label: config.completeLabel,
                            value: summary.present,
                            tone: 'present',
                          },
                          {
                            label: config.absentLabel,
                            value: summary.absent,
                            tone: 'absent',
                          },
                          {
                            label: config.lateLabel,
                            value: summary.late,
                            tone: 'late',
                          },
                          {
                            label: '외박',
                            value: summary.sleepover,
                            tone: 'sleepover',
                          },
                        ].map((item) => (
                          <li key={item.label}>
                            <span className="legend-label">
                              <i className={`legend-dot ${item.tone}`} />
                              {item.label}
                            </span>
                            <span className="legend-value">
                              <RollingNumber value={item.value} />명{' '}
                              <em>({toPercent(item.value, summary.total)})</em>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <h2>바로가기</h2>
          </div>

          <div className="quick-links-grid">
            {QUICK_LINKS.map(({ to, Icon, title, description }) => (
              <button
                key={to}
                type="button"
                className="quick-link-card"
                onClick={() => navigate(to)}
              >
                <span className="quick-link-icon">
                  <Icon />
                </span>
                <span className="quick-link-text">
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>
                <span className="quick-link-chevron">›</span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <h2>최근 공지사항</h2>
            <button
              type="button"
              className="dashboard-link"
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
        </section>
      </div>
    </div>
  );
}
