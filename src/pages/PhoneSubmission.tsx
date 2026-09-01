import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deviceSubmissionService } from '../services/device-submission.service';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { SearchIcon } from '../components/Icons';
import DonutChart from '../components/DonutChart';
import { RollingNumber } from '../components/RollingNumber';
import { TableRowSkeleton } from '../components/Skeleton';
import AttendanceStatusPicker from '../components/AttendanceStatusPicker';
import '../styles/Check.css';
import '../styles/PhoneSubmission.css';
import type { DeviceSubmission, DeviceSubmissionStatus, Gender } from '../types/api';
import { useSelectedDate } from '../context/SelectedDateContext';

type DeviceSubmissionDisplayStatus = '제출' | '미제출' | '외박';
type GenderLabel = '남' | '여' | '-';

interface DeviceSubmissionStudent {
  id: number | null;
  room: string;
  name: string;
  gender: GenderLabel;
  studentId: string;
  grade: number;
  phone: string;
  status: DeviceSubmissionStatus;
  displayStatus: DeviceSubmissionDisplayStatus;
  checkedAt: string;
  phoneBoxId: number;
  phoneBoxName: string;
}

const getStudentNumber = (
  student: Pick<DeviceSubmission['student'], 'grade' | 'classroom' | 'number'>,
) => `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

// 성별을 알 수 없으면 '여'로 흘려보내지 않고 '-'로 표시한다.
// (제출 현황 응답의 student.gender 는 MALE/FEMALE 외의 값이 올 수 있음)
const getGenderLabel = (gender?: Gender | 'ALL' | null): GenderLabel => {
  if (gender === 'MALE') return '남';
  if (gender === 'FEMALE') return '여';
  return '-';
};

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

const formatCheckedAt = (checkedAt?: string): string => {
  if (!checkedAt) return '-';

  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) return checkedAt;

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getDeviceSubmissionDisplayStatus = (
  status: DeviceSubmissionStatus,
): DeviceSubmissionDisplayStatus => {
  switch (status) {
    case 'SUBMITTED':
      return '제출';
    case 'NOT_SUBMITTED':
      return '미제출';
    case 'SLEEPOVER':
      return '외박';
  }
};

const toPercent = (value: number, total: number): string =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';

export default function PhoneSubmission() {
  const queryClient = useQueryClient();
  const { selectedDate: currentDate } = useSelectedDate();
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>('남');
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['device-submissions', currentDate],
    queryFn: () =>
      deviceSubmissionService.getDeviceSubmissions({ date: currentDate }),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      studentId,
      status,
    }: {
      studentId: number;
      status: DeviceSubmissionStatus;
    }) =>
      deviceSubmissionService.updateDeviceSubmissions({
        date: currentDate,
        submissions: [{ studentId, status }],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['device-submissions', currentDate],
      });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  const deviceSubmissionStudents = useMemo<DeviceSubmissionStudent[]>(() => {
    const studentInfoMap = new Map<
      string,
      { id: number; phoneNumber?: string; gender: Gender }
    >();

    studentsData?.content.forEach((student) => {
      studentInfoMap.set(getStudentNumber(student), {
        id: student.id,
        phoneNumber: student.phoneNumber,
        gender: student.gender,
      });
    });

    // 응답이 제출함별로 중첩되어 오므로 테이블용으로 평탄화한다.
    return (submissionsData?.phoneBoxes ?? []).flatMap((phoneBox) =>
      phoneBox.submissions.map((submission) => {
        const student = submission.student;
        const studentId = getStudentNumber(student);
        const studentInfo = studentInfoMap.get(studentId);
        const displayStatus = getDeviceSubmissionDisplayStatus(submission.status);

        return {
          id: student.id ?? studentInfo?.id ?? null,
          room: student.room,
          name: student.name,
          gender: getGenderLabel(studentInfo?.gender ?? student.gender),
          studentId,
          grade: student.grade,
          phone: formatPhoneNumber(studentInfo?.phoneNumber),
          status: submission.status,
          displayStatus,
          checkedAt: formatCheckedAt(submission.checkedAt),
          phoneBoxId: phoneBox.id,
          phoneBoxName: phoneBox.name,
        };
      }),
    );
  }, [studentsData, submissionsData]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...deviceSubmissionStudents]
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

        // 성별 불명('-')은 필터로 걸러내지 않는다. 누락되면 확인 자체가 불가능해지므로.
        if (
          genderFilter !== '전체' &&
          student.gender !== '-' &&
          student.gender !== genderFilter
        ) {
          return false;
        }

        if (gradeFilter !== '전체' && student.grade !== gradeFilter) {
          return false;
        }

        return true;
      });
  }, [genderFilter, gradeFilter, deviceSubmissionStudents, searchQuery]);

  const stats = filteredStudents.reduce(
    (acc, student) => {
      acc.total += 1;
      if (student.status === 'SUBMITTED') acc.submitted += 1;
      if (student.status === 'NOT_SUBMITTED') acc.notSubmitted += 1;
      if (student.status === 'SLEEPOVER') acc.sleepover += 1;
      return acc;
    },
    { total: 0, submitted: 0, notSubmitted: 0, sleepover: 0 },
  );

  const submissionTargetCount = stats.submitted + stats.notSubmitted;
  const submissionRate =
    submissionTargetCount > 0
      ? Math.round((stats.submitted / submissionTargetCount) * 100)
      : 0;
  const genderStats = deviceSubmissionStudents.reduce(
    (acc, student) => {
      if (student.gender === '남') acc.male += 1;
      else if (student.gender === '여') acc.female += 1;
      else acc.unknown += 1;
      return acc;
    },
    { male: 0, female: 0, unknown: 0 },
  );
  const genderTotal =
    genderStats.male + genderStats.female + genderStats.unknown;

  const handleStatusChange = (
    student: DeviceSubmissionStudent,
    status: DeviceSubmissionStatus,
  ) => {
    if (!student.id) {
      alert('학생 ID를 찾을 수 없습니다.');
      return;
    }

    updateMutation.mutate({ studentId: student.id, status });
  };

  return (
    <div className="check-page phone-submission-page">
      <div className="controls-section">
        <div className="donut-cards phone-submission-donut-cards">
          <div className="donut-card phone-submission-donut-card">
            <h3 className="donut-card-title">휴대폰 제출 현황</h3>
            <div className="donut-card-body">
              <DonutChart
                key={`${stats.submitted}-${stats.notSubmitted}-${stats.sleepover}-${stats.total}`}
                className="donut-card-chart"
                total={stats.total}
                label="휴대폰 제출 상태 비율"
                segments={[
                  { key: 'submitted', color: '#22c55e', value: stats.submitted },
                  {
                    key: 'not-submitted',
                    color: '#ef4444',
                    value: stats.notSubmitted,
                  },
                  { key: 'sleepover', color: '#8b5cf6', value: stats.sleepover },
                ]}
              >
                <span>제출률</span>
                <strong>
                  <RollingNumber value={submissionRate} />%
                </strong>
              </DonutChart>
              <ul className="donut-legend">
                {[
                  { label: '제출', value: stats.submitted, tone: 'positive' },
                  {
                    label: '미제출',
                    value: stats.notSubmitted,
                    tone: 'negative',
                  },
                  { label: '외박', value: stats.sleepover, tone: 'sleepover' },
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

          <div className="donut-card phone-submission-donut-card">
            <h3 className="donut-card-title">성별 인원 구성</h3>
            <div className="donut-card-body">
              <DonutChart
                key={`${genderStats.male}-${genderStats.female}-${genderStats.unknown}`}
                className="donut-card-chart"
                total={genderTotal}
                label="휴대폰 제출 대상 성별 인원 비율"
                segments={[
                  { key: 'male', color: '#3b82f6', value: genderStats.male },
                  {
                    key: 'female',
                    color: '#ec4899',
                    value: genderStats.female,
                  },
                  {
                    key: 'unknown',
                    color: '#a1a1aa',
                    value: genderStats.unknown,
                  },
                ]}
              >
                <span>전체 인원</span>
                <strong>
                  <RollingNumber value={genderTotal} />명
                </strong>
              </DonutChart>
              <ul className="donut-legend">
                {[
                  { label: '남학생', value: genderStats.male, tone: 'male' },
                  { label: '여학생', value: genderStats.female, tone: 'female' },
                  {
                    label: '성별 미확인',
                    value: genderStats.unknown,
                    tone: 'unknown',
                  },
                ].map((item) => (
                  <li key={item.tone}>
                    <span className="legend-label">
                      <i className={`legend-dot ${item.tone}`} />
                      {item.label}
                    </span>
                    <span className="legend-value">
                      <RollingNumber value={item.value} />명{' '}
                      <em>({toPercent(item.value, genderTotal)})</em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {updateMutation.isError && (
        <div className="phone-submission-message error">
          휴대폰 제출 상태 수정에 실패했습니다. 다시 시도해주세요.
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
        </div>

        <div className="table-container">
          <table className="student-table student-table-phone-submission">
          <thead>
            <tr>
              <th>호실</th>
              <th>이름</th>
              <th>성별</th>
              <th>학번</th>
              <th>휴대폰 제출</th>
              <th>확인 시간</th>
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
                <tr key={`${currentDate}-${student.phoneBoxId}-${student.studentId}`}>
                  <td className="room-cell" data-label="호실">
                    {student.room}
                  </td>
                  <td data-label="이름">{student.name}</td>
                  <td data-label="성별">{student.gender}</td>
                  <td data-label="학번">{student.studentId}</td>
                  <td data-label="휴대폰 제출">
                    {student.status === 'SLEEPOVER' ? (
                      <span className="status-sleepover">외박</span>
                    ) : (
                      <AttendanceStatusPicker
                        value={
                          student.status === 'SUBMITTED' ? '출석' : '미출석'
                        }
                        completeLabel="제출"
                        lateLabel=""
                        absentLabel="미제출"
                        studentName={student.name}
                        showLateOption={false}
                        showSleepoverOption={false}
                        menuTitle="휴대폰 제출 상태 변경"
                        onChange={(status) =>
                          handleStatusChange(
                            student,
                            status === '출석' ? 'SUBMITTED' : 'NOT_SUBMITTED',
                          )
                        }
                        disabled={updateMutation.isPending}
                      />
                    )}
                  </td>
                  <td data-label="제출 시간">{student.checkedAt}</td>
                  <td data-label="연락처">{student.phone}</td>
                </tr>
              ))
            ) : (
              <tr className="phone-submission-empty-row">
                <td colSpan={7} className="phone-submission-empty-cell">
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
