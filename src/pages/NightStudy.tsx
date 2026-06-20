import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAttendances } from '../hooks/useApi';
import { attendanceService } from '../services/attendance.service';
import { nightStudyService } from '../services/night-study.service';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { SearchIcon } from '../components/Icons';
import '../styles/Check.css';
import '../styles/Sleepover.css';
import type { AttendanceResponse } from '../types/api';

type NightStudyDisplayStatus = '출석' | '미출석' | '-';
type NightStudyAttendanceValue = boolean | null | undefined;

interface NightStudyStudent {
  id: number | null;
  room: string;
  name: string;
  gender: '남' | '여';
  studentId: string;
  grade: number;
  phone: string;
  nightStudyAttendance: NightStudyAttendanceValue;
}

const getStudentNumber = (
  student: Pick<AttendanceResponse['student'], 'grade' | 'classroom' | 'number'>,
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

const formatFetchedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}.${day} ${hours}:${minutes}`;
};

const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildSyncMessage = (
  result: Awaited<ReturnType<typeof nightStudyService.syncNightStudies>>,
  attendances: AttendanceResponse[],
): string => {
  const summary = attendances.reduce(
    (acc, attendance) => {
      acc.total += 1;

      if (attendance.nightStudyAttendance === true) {
        acc.present += 1;
      } else if (attendance.nightStudyAttendance === false) {
        acc.absent += 1;
      } else {
        acc.notApplied += 1;
      }

      return acc;
    },
    { total: 0, present: 0, absent: 0, notApplied: 0 },
  );
  const targetCount = summary.present + summary.absent;

  return `외부 동기화 완료: 총 인원 ${targetCount}명, 출석 ${summary.present}명, 미출석 ${summary.absent}명, 미신청 ${summary.notApplied}명 (${formatFetchedAt(result.fetchedAt)})`;
};

const getNightStudyDisplayStatus = (
  status: boolean | null | undefined,
): NightStudyDisplayStatus => {
  if (status === true) return '출석';
  if (status === false) return '미출석';
  return '-';
};

const renderNightStudyStatus = (status: NightStudyAttendanceValue) => {
  const displayStatus = getNightStudyDisplayStatus(status);

  if (displayStatus === '출석') {
    return <span className="status-present">{displayStatus}</span>;
  }
  if (displayStatus === '미출석') {
    return <span className="status-absent">{displayStatus}</span>;
  }
  return displayStatus;
};

export default function NightStudy() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(getLocalDateString);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>(
    '전체',
  );
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');
  const [syncMessage, setSyncMessage] = useState('');

  const { data: attendancesData, isLoading } = useAttendances(currentDate);

  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: () => nightStudyService.syncNightStudies(currentDate),
    onSuccess: async (result) => {
      const refreshedAttendances = await queryClient.fetchQuery({
        queryKey: ['attendances', currentDate],
        queryFn: () => attendanceService.getAttendances(currentDate),
        staleTime: 0,
      });
      setSyncMessage(buildSyncMessage(result, refreshedAttendances));
    },
  });

  const nightStudyStudents = useMemo<NightStudyStudent[]>(() => {
    const studentInfoMap = new Map<string, { id: number; phoneNumber?: string }>();

    studentsData?.content.forEach((student) => {
      studentInfoMap.set(getStudentNumber(student), {
        id: student.id,
        phoneNumber: student.phoneNumber,
      });
    });

    return (attendancesData ?? []).map((attendance) => {
      const student = attendance.student;
      const studentId = getStudentNumber(student);
      const studentInfo = studentInfoMap.get(studentId);

      return {
        id: studentInfo?.id ?? student.id ?? null,
        room: student.room,
        name: student.name,
        gender: student.gender === 'MALE' ? '남' : '여',
        studentId,
        grade: student.grade,
        phone: formatPhoneNumber(studentInfo?.phoneNumber ?? student.phoneNumber),
        nightStudyAttendance: getNightStudyDisplayStatus(attendance.nightStudyAttendance),
      };
    });
  }, [attendancesData, studentsData]);

  const filteredStudents = useMemo(() => {
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

        if (genderFilter !== '전체' && student.gender !== genderFilter) {
          return false;
        }

        if (gradeFilter !== '전체' && student.grade !== gradeFilter) {
          return false;
        }

        return true;
      });
  }, [genderFilter, gradeFilter, nightStudyStudents, searchQuery]);

  const stats = filteredStudents.reduce(
    (acc, student) => {
      acc.total += 1;
      if (student.nightStudyAttendance === true) acc.present += 1;
      if (student.nightStudyAttendance === false) acc.absent += 1;
      if (student.nightStudyAttendance == null) acc.notApplied += 1;
      return acc;
    },
    { total: 0, present: 0, absent: 0, notApplied: 0 },
  );

  const targetCount = stats.present + stats.absent;

  return (
    <div className="check-page sleepover-page">
      <div className="controls-section">
        <div className="controls-left">
          <div className="date-picker">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                setCurrentDate(e.target.value);
                setSyncMessage('');
              }}
            />
          </div>
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

        <div className="stats-section">
          <div className="stat-box">전체 : {stats.total}명</div>
          <div className="stat-box">대상 : {targetCount}명</div>
          <div className="stat-box attendance">
            심야자습 출석 : <span className="positive">{stats.present}</span>명
          </div>
          <div className="stat-box absence">
            심야자습 미출석 : <span className="negative">{stats.absent}</span>명
          </div>
          <div className="stat-box">
            미신청 : <span>{stats.notApplied}</span>명
          </div>
          <button
            type="button"
            className="sleepover-secondary-button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? '동기화 중...' : '외부 동기화'}
          </button>
        </div>
      </div>

      <div className="filter-section">
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

      {(syncMessage || syncMutation.isError) && (
        <div
          className={`sleepover-message ${syncMutation.isError ? 'error' : ''}`}
        >
          {syncMutation.isError
            ? '심야자습 동기화에 실패했습니다. 다시 시도해주세요.'
            : syncMessage}
        </div>
      )}

      <div className="table-container">
        <table className="student-table student-table-focused">
          <thead>
            <tr>
              <th>호실</th>
              <th>이름</th>
              <th>성별</th>
              <th>학번</th>
              <th>심야자습 출석</th>
              <th>연락처</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="sleepover-empty-cell">
                  심야자습 현황을 불러오는 중입니다.
                </td>
              </tr>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={`${currentDate}-${student.studentId}`}>
                  <td className="room-cell" data-label="호실">
                    {student.room}
                  </td>
                  <td data-label="이름">{student.name}</td>
                  <td data-label="성별">{student.gender}</td>
                  <td data-label="학번">{student.studentId}</td>
                  <td data-label="심야자습 출석">
                    {renderNightStudyStatus(student.nightStudyAttendance)}
                  </td>
                  <td data-label="연락처">{student.phone}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="sleepover-empty-cell">
                  조건에 맞는 학생이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
