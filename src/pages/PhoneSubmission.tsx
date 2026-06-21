import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { phoneSubmissionService } from '../services/phone-submission.service';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { SearchIcon } from '../components/Icons';
import '../styles/Check.css';
import '../styles/Sleepover.css';
import type { PhoneSubmissionResponse, PhoneSubmissionStatus } from '../types/api';

type PhoneSubmissionDisplayStatus = '제출' | '미제출' | '외박';

interface PhoneSubmissionStudent {
  id: number | null;
  room: string;
  name: string;
  gender: '남' | '여';
  studentId: string;
  grade: number;
  phone: string;
  status: PhoneSubmissionStatus;
  displayStatus: PhoneSubmissionDisplayStatus;
  checkedAt: string;
}

const getStudentNumber = (
  student: Pick<PhoneSubmissionResponse['student'], 'grade' | 'classroom' | 'number'>,
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

const formatCheckedAt = (checkedAt?: string): string => {
  if (!checkedAt) return '-';

  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) return checkedAt;

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getPhoneSubmissionDisplayStatus = (
  status: PhoneSubmissionStatus,
): PhoneSubmissionDisplayStatus => {
  switch (status) {
    case 'SUBMITTED':
      return '제출';
    case 'NOT_SUBMITTED':
      return '미제출';
    case 'SLEEPOVER':
      return '외박';
  }
};

const getPhoneSubmissionStatusClassName = (
  status: PhoneSubmissionDisplayStatus,
): string => {
  switch (status) {
    case '제출':
      return 'status-present';
    case '미제출':
      return 'status-absent';
    case '외박':
      return 'status-sleepover';
  }
};

export default function PhoneSubmission() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>('남');
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['phone-submissions', currentDate],
    queryFn: () => phoneSubmissionService.getPhoneSubmissions(currentDate),
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
      status: PhoneSubmissionStatus;
    }) =>
      phoneSubmissionService.updatePhoneSubmissions({
        date: currentDate,
        submissions: [{ studentId, status }],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['phone-submissions', currentDate],
      });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  const phoneSubmissionStudents = useMemo<PhoneSubmissionStudent[]>(() => {
    const studentInfoMap = new Map<string, { id: number; phoneNumber?: string }>();

    studentsData?.content.forEach((student) => {
      studentInfoMap.set(getStudentNumber(student), {
        id: student.id,
        phoneNumber: student.phoneNumber,
      });
    });

    return (submissionsData ?? []).map((submission) => {
      const student = submission.student;
      const studentId = getStudentNumber(student);
      const studentInfo = studentInfoMap.get(studentId);
      const displayStatus = getPhoneSubmissionDisplayStatus(submission.status);

      return {
        id: studentInfo?.id ?? student.id ?? null,
        room: student.room,
        name: student.name,
        gender: student.gender === 'MALE' ? '남' : '여',
        studentId,
        grade: student.grade,
        phone: formatPhoneNumber(studentInfo?.phoneNumber),
        status: submission.status,
        displayStatus,
        checkedAt: formatCheckedAt(submission.checkedAt),
      };
    });
  }, [studentsData, submissionsData]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...phoneSubmissionStudents]
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
  }, [genderFilter, gradeFilter, phoneSubmissionStudents, searchQuery]);

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

  const handleStatusChange = (
    student: PhoneSubmissionStudent,
    status: PhoneSubmissionStatus,
  ) => {
    if (!student.id) {
      alert('학생 ID를 찾을 수 없습니다.');
      return;
    }

    updateMutation.mutate({ studentId: student.id, status });
  };

  return (
    <div className="check-page sleepover-page">
      <div className="controls-section">
        <div className="controls-left">
          <div className="date-picker">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
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
          <div className="stat-box attendance">
            제출 : <span className="positive">{stats.submitted}</span>명
          </div>
          <div className="stat-box phone-submission">
            미제출 :{' '}
            <span className="phone-submission-count">{stats.notSubmitted}</span>
            명
          </div>
          <div className="stat-box sleepover">
            외박 : <span className="sleepover-count">{stats.sleepover}</span>명
          </div>
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

      {updateMutation.isError && (
        <div className="sleepover-message error">
          휴대폰 제출 상태 수정에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

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
              <tr>
                <td colSpan={7} className="sleepover-empty-cell">
                  휴대폰 제출 현황을 불러오는 중입니다.
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
                  <td data-label="휴대폰 제출">
                    {student.status === 'SLEEPOVER' ? (
                      <span className="status-sleepover">외박</span>
                    ) : (
                      <select
                        value={student.status}
                        onChange={(e) =>
                          handleStatusChange(
                            student,
                            e.target.value as PhoneSubmissionStatus,
                          )
                        }
                        disabled={updateMutation.isPending}
                        className={`phone-submission-select ${getPhoneSubmissionStatusClassName(
                          student.displayStatus,
                        )}`}
                      >
                        <option value="SUBMITTED">제출</option>
                        <option value="NOT_SUBMITTED">미제출</option>
                      </select>
                    )}
                  </td>
                  <td data-label="제출 시간">{student.checkedAt}</td>
                  <td data-label="연락처">{student.phone}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="sleepover-empty-cell">
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
