import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DonutChart from '../components/DonutChart';
import { attendanceService } from '../services/attendance.service';
import { scheduleService } from '../services/schedule.service';
import { studentService } from '../services/student.service';
import { useSelectedDate } from '../context/SelectedDateContext';
import { getAdjacentDate, formatLocalDate } from '../utils/date';
import { getKoreanHolidayName } from '../constants/koreanHolidays';
import type {
  AttendanceResponse,
  AttendanceScheduleResponse,
  AttendanceStatus,
  StudentResponse,
} from '../types/api';
import '../styles/CheckStudentDetail.css';

type AttendancePeriod = 'MORNING' | 'NIGHT';

interface StudentAttendanceRecord {
  date: string;
  period: AttendancePeriod;
  status: AttendanceStatus;
  checkedAt?: string;
  isNoRecord?: boolean;
}

const formatPhoneNumber = (phoneNumber?: string) => {
  if (!phoneNumber) return '-';

  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phoneNumber;
};

const getStudentNumber = (
  student: Pick<StudentResponse, 'grade' | 'classroom' | 'number'>,
) => `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

const isSameStudent = (
  attendance: AttendanceResponse,
  student: StudentResponse,
) =>
  attendance.student.id === student.id ||
  getStudentNumber(attendance.student) === getStudentNumber(student);

const isAttended = (status: AttendanceStatus) =>
  status === 'PRESENT' || status === 'LATE';

const getPeriodLabel = (period: AttendancePeriod) =>
  period === 'MORNING' ? '아침 퇴실' : '저녁 입실';

const isNonOperatingAttendancePeriod = (
  date: string,
  period: AttendancePeriod,
) => {
  if (getKoreanHolidayName(date)) return true;

  const day = new Date(`${date}T00:00:00`).getDay();
  return period === 'MORNING'
    ? day === 0 || day === 6
    : day === 5 || day === 6;
};

const getPeriodEndTime = (
  schedule: AttendanceScheduleResponse | undefined,
  period: AttendancePeriod,
) =>
  period === 'MORNING' ? schedule?.morningEndTime : schedule?.nightEndTime;

const hasAttendancePeriodEnded = (
  date: string,
  endTime: string | undefined,
  now: Date,
) => {
  const today = formatLocalDate(now);

  if (date < today) return true;
  if (date > today || !endTime) return false;

  const match = endTime.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = Number(match[1]) * 60 + Number(match[2]);

  return currentMinutes > endMinutes;
};

const getStatusLabel = (record: StudentAttendanceRecord) => {
  if (record.isNoRecord) return '기록 없음';

  const { status } = record;
  switch (status) {
    case 'PRESENT':
      return '출석';
    case 'LATE':
      return '지연출석';
    case 'SLEEPOVER':
      return '외박';
    default:
      return '미출석';
  }
};

const formatExactTime = (value?: string) => {
  if (!value) return '기록 없음';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
};

const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${value}T00:00:00`));

export default function CheckStudentDetail() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { selectedDate } = useSelectedDate();
  const [now, setNow] = useState(() => new Date());
  const studentId = Number(userId);
  const isValidStudentId = Number.isInteger(studentId) && studentId > 0;
  const historyDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        getAdjacentDate(selectedDate, -index),
      ),
    [selectedDate],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    data: student,
    isLoading: isStudentLoading,
    isError: isStudentError,
  } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getStudent(studentId),
    enabled: isValidStudentId,
  });

  const {
    data: attendanceHistory,
    isLoading: isAttendanceLoading,
    isError: isAttendanceError,
  } = useQuery({
    queryKey: ['student-attendance-history', studentId, selectedDate],
    queryFn: () =>
      Promise.all(
        historyDates.map((date) => attendanceService.getAttendances(date)),
      ),
    enabled: Boolean(student),
  });

  const { data: attendanceSchedules } = useQuery({
    queryKey: [
      'student-attendance-history-schedules',
      student?.gender,
      historyDates[historyDates.length - 1],
      historyDates[0],
    ],
    queryFn: () =>
      scheduleService.getSchedules(
        historyDates[historyDates.length - 1],
        historyDates[0],
        student!.gender,
      ),
    enabled: Boolean(student),
  });

  const attendanceScheduleMap = useMemo(
    () =>
      new Map(
        attendanceSchedules?.map((schedule) => [schedule.date, schedule]),
      ),
    [attendanceSchedules],
  );

  const attendanceRecords = useMemo<StudentAttendanceRecord[]>(() => {
    if (!student || !attendanceHistory) return [];

    return historyDates.flatMap((date, index) => {
      const attendance = attendanceHistory[index]?.find((item) =>
        isSameStudent(item, student),
      );
      if (!attendance) return [];

      const records: StudentAttendanceRecord[] = [
        {
          date,
          period: 'MORNING',
          status: attendance.morningCheckStatus,
          checkedAt: attendance.morningCheckedAt,
        },
        {
          date,
          period: 'NIGHT',
          status: attendance.nightCheckStatus,
          checkedAt: attendance.nightCheckedAt,
        },
      ];

      return records.flatMap((record) => {
        const hasCheckedRecord = Boolean(record.checkedAt);
        const hasRecordedStatus = record.status !== 'ABSENT';

        // 주말·공휴일에는 기본 생성된 미출석 행을 숨기고 실제 체크 기록만 남긴다.
        if (isNonOperatingAttendancePeriod(record.date, record.period)) {
          return hasCheckedRecord ? [record] : [];
        }

        if (hasCheckedRecord || hasRecordedStatus) return [record];

        const endTime = getPeriodEndTime(
          attendanceScheduleMap.get(record.date),
          record.period,
        );
        if (!hasAttendancePeriodEnded(record.date, endTime, now)) return [];

        return [{ ...record, isNoRecord: true }];
      });
    });
  }, [attendanceHistory, attendanceScheduleMap, historyDates, now, student]);

  const attendanceSummary = useMemo(() => {
    const targetRecords = attendanceRecords.filter(
      (record) => record.status !== 'SLEEPOVER',
    );
    const attended = targetRecords.filter((record) => isAttended(record.status));
    const rate =
      targetRecords.length > 0
        ? Math.round((attended.length / targetRecords.length) * 100)
        : 0;

    return {
      total: targetRecords.length,
      attended: attended.length,
      absent: Math.max(0, targetRecords.length - attended.length),
      late: attended.filter((record) => record.status === 'LATE').length,
      rate,
    };
  }, [attendanceRecords]);

  const latestAttendance = useMemo(
    () =>
      [...attendanceRecords]
        .filter((record) => isAttended(record.status) && record.checkedAt)
        .sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''))[0],
    [attendanceRecords],
  );

  if (isStudentLoading || (student && isAttendanceLoading)) {
    return (
      <div className="check-student-detail loading">
        학생 출석 정보를 불러오는 중입니다.
      </div>
    );
  }

  if (!isValidStudentId || isStudentError || !student) {
    return (
      <div className="check-student-detail empty">
        <p>학생 정보를 찾을 수 없습니다.</p>
        <button type="button" onClick={() => navigate('/check')}>
          인원 확인으로 돌아가기
        </button>
      </div>
    );
  }

  const studentNumber = getStudentNumber(student);
  const gender = student.gender === 'MALE' ? '남학생' : '여학생';

  return (
    <main className="check-student-detail">
      <button
        type="button"
        className="check-student-back-button"
        onClick={() => navigate('/check')}
      >
        ← 인원 확인으로 돌아가기
      </button>

      <section
        className="student-dashboard-hero"
        aria-label={`${student.name} 학생 정보`}
      >
        <div className="student-dashboard-identity">
          <span className="student-dashboard-kicker">STUDENT DASHBOARD</span>
          <h1>{student.name}</h1>
          <p>
            {studentNumber} · {gender} · {student.room}호
          </p>
        </div>
        <div className="student-dashboard-latest">
          <span>가장 최근 출석</span>
          <strong>
            {latestAttendance
              ? getPeriodLabel(latestAttendance.period)
              : '기록 없음'}
          </strong>
          <em>
            {latestAttendance
              ? formatExactTime(latestAttendance.checkedAt)
              : '최근 7일 이력 기준'}
          </em>
        </div>
      </section>

      <section className="student-dashboard-grid" aria-label="최근 출석 요약">
        <article className="student-dashboard-card attendance-rate-card">
          <div className="student-dashboard-card-heading">
            <div>
              <span>최근 7일</span>
              <h2>출석률</h2>
            </div>
            <small>{attendanceSummary.total}회 점호 기준</small>
          </div>
          <div className="student-attendance-rate-content">
            <DonutChart
              className="student-attendance-donut"
              total={attendanceSummary.total}
              label="최근 7일 출석률"
              segments={[
                {
                  key: 'attended',
                  color: '#6d23ed',
                  value: attendanceSummary.attended,
                },
                {
                  key: 'absent',
                  color: '#e4e4e7',
                  value: attendanceSummary.absent,
                },
              ]}
            >
              <span>출석률</span>
              <strong>{attendanceSummary.rate}%</strong>
            </DonutChart>
            <dl className="student-attendance-summary">
              <div>
                <dt>출석</dt>
                <dd>{attendanceSummary.attended}회</dd>
              </div>
              <div>
                <dt>지연출석</dt>
                <dd>{attendanceSummary.late}회</dd>
              </div>
              <div>
                <dt>미출석</dt>
                <dd>{attendanceSummary.absent}회</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="student-dashboard-card student-profile-card">
          <div className="student-dashboard-card-heading">
            <div>
              <span>학생 정보</span>
              <h2>기본 프로필</h2>
            </div>
          </div>
          <dl className="student-profile-summary">
            <div>
              <dt>학급</dt>
              <dd>
                {student.grade}학년 {student.classroom}반 {student.number}번
              </dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd>{formatPhoneNumber(student.phoneNumber)}</dd>
            </div>
            <div>
              <dt>자치위원</dt>
              <dd>{student.isCouncil ? '설정됨' : '미설정'}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="student-dashboard-card attendance-history-card">
        <div className="student-dashboard-card-heading">
          <div>
            <span>{formatDateLabel(historyDates[0])} 기준</span>
            <h2>최근 출석 기록</h2>
          </div>
          <small>초 단위 시각 제공</small>
        </div>

        {isAttendanceError ? (
          <p className="student-history-message">
            출석 기록을 불러오지 못했습니다.
          </p>
        ) : attendanceRecords.length === 0 ? (
          <p className="student-history-message">
            최근 7일 출석 기록이 없습니다.
          </p>
        ) : (
          <div className="student-attendance-history">
            {attendanceRecords.map((record) => (
              <article
                key={`${record.date}-${record.period}`}
                className="student-attendance-record"
              >
                <time dateTime={record.date}>{formatDateLabel(record.date)}</time>
                <span className="student-attendance-period">
                  {getPeriodLabel(record.period)}
                </span>
                <strong
                  className={`attendance-record-status ${
                    record.isNoRecord ? 'no-record' : record.status.toLowerCase()
                  }`}
                >
                  {getStatusLabel(record)}
                </strong>
                <span className="student-attendance-time">
                  {record.isNoRecord ? '-' : formatExactTime(record.checkedAt)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
