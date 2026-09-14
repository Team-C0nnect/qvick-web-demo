import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAttendances } from '../hooks/useApi';
import { nightStudyService } from '../services/night-study.service';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { SearchIcon } from '../components/Icons';
import DonutChart from '../components/DonutChart';
import { RollingNumber } from '../components/RollingNumber';
import { TableRowSkeleton } from '../components/Skeleton';
import '../styles/Check.css';
import '../styles/NightStudy.css';
import type {
  NightStudyPeriodResponse,
  NightStudyStatus,
  StudentResponse,
} from '../types/api';
import { useSelectedDate } from '../context/SelectedDateContext';
import { useGenderView } from '../context/GenderViewContext';

type NightStudyDisplayStatus = '출석' | '미출석' | '미신청';
type NightStudyGender = '남' | '여' | '-';
type NightStudyPeriodKey = 'period1Status' | 'period2Status';

interface NightStudyStudent {
  id: number | null;
  room: string;
  name: string;
  gender: NightStudyGender;
  studentId: string;
  grade: number;
  phone: string;
  period1Status: NightStudyDisplayStatus;
  period1Room: string;
  period2Status: NightStudyDisplayStatus;
  period2Room: string;
}

interface NightStudyStats {
  total: number;
  present: number;
  absent: number;
  notApplied: number;
}

interface NightStudyFloorStats {
  floor: number;
  male: number;
  female: number;
}

const FLOOR_CHART_COLORS = ['#6d23ed', '#3b82f6', '#14b8a6', '#f59e0b'];

const getStudentNumber = (
  student: Pick<StudentResponse, 'grade' | 'classroom' | 'number'>,
) => `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

const formatPhoneNumber = (phone?: string): string => {
  if (!phone) return '-';

  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

const getNightStudyDisplayStatus = (
  status: NightStudyStatus | null | undefined,
): NightStudyDisplayStatus => {
  if (status === 'ATTENDANCE') return '출석';
  if (status === 'ABSENT') return '미출석';
  return '미신청';
};

const getNightStudyRoomName = (
  period: NightStudyPeriodResponse,
): string => period.room?.name?.trim() || '-';

const getFloorFromRoom = (room: string): number | null => {
  const roomDigits = room.replace(/\D/g, '');
  if (roomDigits.length < 3) return null;

  const floor = Number(roomDigits.slice(0, -2));
  return Number.isInteger(floor) && floor > 0 ? floor : null;
};

const buildFloorStats = (
  students: NightStudyStudent[],
): NightStudyFloorStats[] => {
  const floorStats = new Map<number, Omit<NightStudyFloorStats, 'floor'>>();

  students.forEach((student) => {
    const floor = getFloorFromRoom(student.room);
    if (floor === null) return;

    const stats = floorStats.get(floor) ?? { male: 0, female: 0 };
    if (student.gender === '남') stats.male += 1;
    if (student.gender === '여') stats.female += 1;
    floorStats.set(floor, stats);
  });

  return [...floorStats.entries()]
    .sort(([floorA], [floorB]) => floorA - floorB)
    .map(([floor, stats]) => ({ floor, ...stats }));
};

const getFloorChartColor = (index: number): string =>
  FLOOR_CHART_COLORS[index % FLOOR_CHART_COLORS.length];

const renderNightStudyStatus = (
  status: NightStudyDisplayStatus,
  room: string,
) => {
  const statusClassName =
    status === '출석'
      ? 'status-present'
      : status === '미출석'
        ? 'status-absent'
        : 'status-not-applied';

  return (
    <div className="night-study-period-cell">
      <span className={statusClassName}>{status}</span>
      {room !== '-' && <span className="night-study-period-room">{room}</span>}
    </div>
  );
};

const buildNightStudyStats = (
  students: NightStudyStudent[],
  periodKey: NightStudyPeriodKey,
): NightStudyStats =>
  students.reduce(
    (stats, student) => {
      stats.total += 1;

      if (student[periodKey] === '출석') stats.present += 1;
      if (student[periodKey] === '미출석') stats.absent += 1;
      if (student[periodKey] === '미신청') stats.notApplied += 1;

      return stats;
    },
    { total: 0, present: 0, absent: 0, notApplied: 0 },
  );

const toPercent = (value: number, total: number): string =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';

function NightStudyStatsCard({
  title,
  stats,
}: {
  title: string;
  stats: NightStudyStats;
}) {
  const targetCount = stats.present + stats.absent;
  const attendanceRate =
    targetCount > 0 ? Math.round((stats.present / targetCount) * 100) : 0;

  return (
    <div className="donut-card night-study-donut-card">
      <h3 className="donut-card-title">{title}</h3>
      <div className="donut-card-body">
        <DonutChart
          key={`${title}-${stats.present}-${stats.absent}-${stats.notApplied}-${stats.total}`}
          className="donut-card-chart"
          total={stats.total}
          label={`${title} 상태 비율`}
          segments={[
            { key: 'present', color: '#22c55e', value: stats.present },
            { key: 'absent', color: '#ef4444', value: stats.absent },
            {
              key: 'not-applied',
              color: '#a1a1aa',
              value: stats.notApplied,
            },
          ]}
        >
          <span>출석률</span>
          <strong>
            <RollingNumber value={attendanceRate} />%
          </strong>
        </DonutChart>
        <ul className="donut-legend">
          {[
            { label: '출석', value: stats.present, tone: 'positive' },
            { label: '미출석', value: stats.absent, tone: 'negative' },
            {
              label: '미신청',
              value: stats.notApplied,
              tone: 'not-applied',
            },
          ].map((item) => (
            <li key={item.tone}>
              <span className="legend-label">
                <i className={`legend-dot ${item.tone}`} />
                {item.label}
              </span>
              <span className="legend-value">
                <RollingNumber value={item.value} />명{' '}
                <em>({toPercent(item.value, stats.total)})</em>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function NightStudy() {
  const { selectedDate: currentDate } = useSelectedDate();
  const { genderView } = useGenderView();
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>(
    genderView,
  );
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');

  useEffect(() => {
    setGenderFilter(genderView);
  }, [genderView]);

  const {
    data: applicantsData = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['night-study-applicants', currentDate],
    queryFn: () => nightStudyService.getNightStudyApplicants(currentDate),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: attendancesData } = useAttendances(currentDate);

  const nightStudyStudents = useMemo<NightStudyStudent[]>(() => {
    type StudentInfo = {
      id: number | null;
      room: string;
      gender: StudentResponse['gender'];
      phoneNumber?: string;
    };

    const studentInfoMap = new Map<
      string,
      StudentInfo
    >();

    studentsData?.content.forEach((student) => {
      studentInfoMap.set(getStudentNumber(student), {
        id: student.id,
        room: student.room,
        gender: student.gender,
        phoneNumber: student.phoneNumber,
      });
    });

    attendancesData?.forEach(({ student }) => {
      const studentId = getStudentNumber(student);
      if (studentInfoMap.has(studentId)) return;

      studentInfoMap.set(studentId, {
        id: student.id ?? null,
        room: student.room,
        gender: student.gender,
        phoneNumber: student.phoneNumber,
      });
    });

    return applicantsData.map((applicant) => {
      const studentId = getStudentNumber(applicant);
      const studentInfo = studentInfoMap.get(studentId);

      return {
        id: studentInfo?.id ?? null,
        room: studentInfo?.room ?? '-',
        name: applicant.name,
        gender:
          studentInfo?.gender === 'MALE'
            ? '남'
            : studentInfo?.gender === 'FEMALE'
              ? '여'
              : '-',
        studentId,
        grade: applicant.grade,
        phone: formatPhoneNumber(studentInfo?.phoneNumber),
        period1Status: getNightStudyDisplayStatus(applicant.period1.status),
        period1Room: getNightStudyRoomName(applicant.period1),
        period2Status: getNightStudyDisplayStatus(applicant.period2.status),
        period2Room: getNightStudyRoomName(applicant.period2),
      };
    });
  }, [applicantsData, attendancesData, studentsData]);

  const matchingStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...nightStudyStudents]
      .sort((a, b) => {
        const roomDiff = a.room.localeCompare(b.room, 'ko-KR', {
          numeric: true,
        });
        if (roomDiff !== 0) return roomDiff;
        return a.studentId.localeCompare(b.studentId, 'ko-KR', {
          numeric: true,
        });
      })
      .filter((student) => {
        if (query) {
          const isMatched =
            matchesKoreanNameSearch(student.name, searchQuery) ||
            student.room.toLowerCase().includes(query) ||
            student.studentId.includes(query);

          if (!isMatched) return false;
        }

        if (gradeFilter !== '전체' && student.grade !== gradeFilter) {
          return false;
        }

        return true;
      });
  }, [gradeFilter, nightStudyStudents, searchQuery]);

  const filteredStudents = useMemo(
    () =>
      matchingStudents.filter(
        (student) =>
          genderFilter === '전체' || student.gender === genderFilter,
      ),
    [genderFilter, matchingStudents],
  );

  const period1Stats = buildNightStudyStats(filteredStudents, 'period1Status');
  const period2Stats = buildNightStudyStats(filteredStudents, 'period2Status');
  const floorStats = buildFloorStats(matchingStudents);
  const floorTotal = floorStats.reduce(
    (total, stats) => total + stats.male + stats.female,
    0,
  );
  const floorChartSegments = floorStats.map((stats, index) => ({
    key: `floor-${stats.floor}`,
    color: getFloorChartColor(index),
    value: stats.male + stats.female,
  }));

  return (
    <div className="check-page night-study-page">
      <div className="controls-section">
        <div className="donut-cards night-study-donut-cards">
          <NightStudyStatsCard title="심야자습 1 현황" stats={period1Stats} />
          <NightStudyStatsCard title="심야자습 2 현황" stats={period2Stats} />

          <div className="donut-card night-study-donut-card night-study-floor-card">
            <h3 className="donut-card-title">층별 인원 구성</h3>
            <div className="donut-card-body night-study-floor-card-body">
              <DonutChart
                key={`${floorTotal}-${floorChartSegments.map((segment) => segment.value).join('-')}`}
                className="donut-card-chart"
                total={floorTotal}
                label="층별 인원 비율"
                segments={floorChartSegments}
              >
                <span>전체 인원</span>
                <strong>
                  <RollingNumber value={floorTotal} />명
                </strong>
              </DonutChart>
              <div className="night-study-floor-list">
                {floorStats.length > 0 ? (
                  floorStats.map((stats, index) => (
                    <div className="night-study-floor-row" key={stats.floor}>
                      <strong className="night-study-floor-label">
                        <i
                          className="legend-dot floor"
                          style={{ backgroundColor: getFloorChartColor(index) }}
                        />
                        {stats.floor}층
                      </strong>
                      <span className="night-study-floor-count male">
                        <i className="legend-dot male" />
                        남학생 <b><RollingNumber value={stats.male} />명</b>
                      </span>
                      <span className="night-study-floor-count female">
                        <i className="legend-dot female" />
                        여학생 <b><RollingNumber value={stats.female} />명</b>
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="night-study-floor-empty">층별 인원 정보가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isError && (
        <div className="night-study-message error" role="alert">
          날짜별 심야자습 현황을 불러오지 못했습니다. 다시 시도해주세요.
        </div>
      )}

      <div className="table-panel">
        <div className="table-toolbar">
          <div className="search-box">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="호실 / 이름 / 학번으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-filters">
          <div className="filter-group">
            <label className="filter-label">성별:</label>
            <div className="filter-buttons">
              {(['전체', '남', '여'] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  className={`filter-btn ${genderFilter === gender ? 'active' : ''}`}
                  onClick={() => setGenderFilter(gender)}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">학년:</label>
            <div className="filter-buttons">
              {(['전체', 1, 2, 3] as const).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  className={`filter-btn ${gradeFilter === grade ? 'active' : ''}`}
                  onClick={() => setGradeFilter(grade)}
                >
                  {grade === '전체' ? '전체' : `${grade}학년`}
                </button>
              ))}
            </div>
          </div>

          <div className="night-study-filter-action">
            <button
              type="button"
              className="night-study-sync-button"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <span className="night-study-sync-icon" aria-hidden="true">↻</span>
              <span>{isFetching ? '조회 중...' : '새로고침'}</span>
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="student-table student-table-night-study">
            <thead>
              <tr>
                <th>호실</th>
                <th>이름</th>
                <th>성별</th>
                <th>학번</th>
                <th>심야자습 1</th>
                <th>심야자습 2</th>
                <th>연락처</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={7} />
                ))
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={`${currentDate}-${student.studentId}`}>
                    <td className="room-cell" data-label="호실">
                      {student.room}
                    </td>
                    <td data-label="이름">{student.name}</td>
                    <td data-label="성별">{student.gender}</td>
                    <td data-label="학번">{student.studentId}</td>
                    <td data-label="심야자습 1">
                      {renderNightStudyStatus(
                        student.period1Status,
                        student.period1Room,
                      )}
                    </td>
                    <td data-label="심야자습 2">
                      {renderNightStudyStatus(
                        student.period2Status,
                        student.period2Room,
                      )}
                    </td>
                    <td data-label="연락처">{student.phone}</td>
                  </tr>
                ))
              ) : (
                <tr className="night-study-empty-row">
                  <td colSpan={7} className="night-study-empty-cell">
                    조건에 맞는 학생이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
