import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAttendances } from '../hooks/useApi';
import { studentService } from '../services/student.service';
import { attendanceService } from '../services/attendance.service';
import { scheduleService } from '../services/schedule.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import {
  exportMergedAttendanceToExcel,
  type AttendanceExportMode,
  type MergedAttendanceMember,
} from '../services/excel.service';
import { CheckTableSkeleton } from '../components/Skeleton';
import '../styles/Check.css';
import { SearchIcon, ExcelIcon } from '../components/Icons';
import type {
  AttendanceStatus,
  AttendanceResponse,
  PhoneSubmissionStatus,
  UpdateAttendancesRequest,
} from '../types/api';

interface Student {
  id: number | null;
  index: number;
  room: string;
  overnight: boolean;
  name: string;
  status: '출석' | '미출석' | '외박' | '지연출석';
  gender: '남' | '여';
  studentId: string;
  grade: number;
  classroom: number;
  number: number;
  time: string;
  nightAttendance?: NightAttendanceDisplayStatus;
  phone: string;
  phoneSubmission?: PhoneSubmissionDisplayStatus;
  dormitory: string;
}

type DisplayAttendanceStatus = Student['status'];
type NightAttendanceDisplayStatus = '출석' | '-';
type PhoneSubmissionDisplayStatus = '제출' | '미제출' | '외박' | '-';
type SortKey =
  | 'room'
  | 'name'
  | 'status'
  | 'gender'
  | 'studentId'
  | 'time'
  | 'nightAttendance'
  | 'phoneSubmission';
type SortDirection = 'asc' | 'desc' | null;

// 자동 새로고침 간격 (30초)
const REFRESH_INTERVAL = 30 * 1000;

const STATUS_MAP: Record<DisplayAttendanceStatus, AttendanceStatus> = {
  출석: 'PRESENT',
  미출석: 'ABSENT',
  외박: 'SLEEPOVER',
  지연출석: 'LATE',
};

const getPrimaryAttendanceStatus = (
  attendance: AttendanceResponse,
): AttendanceStatus | undefined =>
  attendance.nightCheckStatus ??
  attendance.status ??
  attendance.morningCheckStatus;

const getPrimaryCheckedAt = (attendance: AttendanceResponse): string | undefined =>
  attendance.nightCheckedAt ?? attendance.checkedAt ?? attendance.morningCheckedAt;

const getNightAttendanceDisplayStatus = (
  status: AttendanceStatus | undefined,
): NightAttendanceDisplayStatus => (status === 'PRESENT' ? '출석' : '-');

const getPhoneSubmissionDisplayStatus = (
  status: PhoneSubmissionStatus | undefined,
  isSleepover: boolean,
): PhoneSubmissionDisplayStatus => {
  switch (status) {
    case 'SUBMITTED':
      return '제출';
    case 'NOT_SUBMITTED':
      return '미제출';
    case 'SLEEPOVER':
      return '외박';
    default:
      return isSleepover ? '외박' : '-';
  }
};

const getPhoneSubmissionClassName = (
  status: PhoneSubmissionDisplayStatus,
): string => {
  switch (status) {
    case '제출':
      return 'submitted';
    case '미제출':
      return 'not-submitted';
    case '외박':
      return 'sleepover';
    default:
      return 'unknown';
  }
};

const getPhoneSubmissionSymbol = (
  status: PhoneSubmissionDisplayStatus,
): string => {
  switch (status) {
    case '제출':
      return 'O';
    case '미제출':
      return 'X';
    default:
      return status;
  }
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

const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMinutesFromTime = (time: string | undefined): number | null => {
  if (!time || time === '-') return null;

  // H:MM, HH:MM, HH:MM:SS 형식 모두 허용
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

// 스케줄 기반 지연출석 판별 (endTime 초과)
const isLateAttendance = (
  checkedTime: string,
  endTime: string | undefined,
): boolean => {
  const checkedMinutes = getMinutesFromTime(checkedTime);
  const endMinutes = getMinutesFromTime(endTime);

  if (checkedMinutes === null || endMinutes === null) return false;

  return checkedMinutes > endMinutes;
};

const hasAttendanceWindowEnded = (
  attendanceDate: string,
  endTime: string | undefined,
): boolean => {
  const today = getLocalDateString();

  if (attendanceDate < today) return true;
  if (attendanceDate > today) return false;

  return isLateAttendance(getCurrentTimeString(), endTime);
};

export default function Check() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [sortKey, setSortKey] = useState<SortKey | null>('room');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isExporting, setIsExporting] = useState(false);
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'남' | '여' | null>(
    null,
  );
  const excelMenuRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!showExcelMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        excelMenuRef.current &&
        !excelMenuRef.current.contains(e.target as Node)
      ) {
        setShowExcelMenu(false);
        setSelectedGender(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExcelMenu]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<
    '전체' | '출석' | '미출석' | '외박' | '지연출석'
  >('전체');
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>('남');

  const queryClient = useQueryClient();

  // 신버전 출석 데이터 (자동 새로고침)
  const { data: attendancesData, isLoading: attendancesLoading } =
    useAttendances(currentDate);

  // 학생 목록 (ID 매핑용)
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  // 출석 스케줄 (남/여 기숙사)
  const { data: maleSchedule } = useQuery({
    queryKey: ['schedule', currentDate, 'MALE'],
    queryFn: () => scheduleService.getScheduleByDate(currentDate, 'MALE'),
  });

  const { data: femaleSchedule } = useQuery({
    queryKey: ['schedule', currentDate, 'FEMALE'],
    queryFn: () => scheduleService.getScheduleByDate(currentDate, 'FEMALE'),
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [scheduleCache, setScheduleCache] = useState<
    Map<
      string,
      {
        maleSchedule?: { endTime: string };
        femaleSchedule?: { endTime: string };
      }
    >
  >(new Map());

  // 외박 상태 업데이트 mutation
  const updateAttendancesMutation = useMutation({
    mutationFn: (data: UpdateAttendancesRequest) =>
      attendanceService.updateAttendances(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  // 자동 새로고침 설정
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [queryClient]);

  // 기존 서버 엑셀 export (주석처리)
  // const exportMutation = useMutation({
  //   mutationFn: () => attendanceService.exportAttendances(currentDate),
  //   onSuccess: (blob) => {
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = `출석부_${currentDate}.xlsx`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     window.URL.revokeObjectURL(url);
  //   },
  // });

  // 출석 상태 변경 핸들러
  const handleStatusChange = useCallback(
    (
      student: Student,
      newDisplayStatus: '출석' | '미출석' | '외박' | '지연출석',
    ) => {
      if (!student.id) {
        console.error('학생 ID를 찾을 수 없습니다.');
        return;
      }

      const dateSchedules = scheduleCache.get(currentDate);
      const endTime =
        student.gender === '남'
          ? (dateSchedules?.maleSchedule?.endTime ?? maleSchedule?.endTime)
          : (dateSchedules?.femaleSchedule?.endTime ??
            femaleSchedule?.endTime);
      const effectiveDisplayStatus: DisplayAttendanceStatus =
        newDisplayStatus === '출석' &&
        hasAttendanceWindowEnded(currentDate, endTime)
          ? '지연출석'
          : newDisplayStatus;

      updateAttendancesMutation.mutate({
        date: currentDate,
        attendances: [
          { studentId: student.id, status: STATUS_MAP[effectiveDisplayStatus] },
        ],
      });

      // 로컬 상태 즉시 업데이트
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === student.studentId
            ? {
                ...s,
                overnight: effectiveDisplayStatus === '외박',
                status: effectiveDisplayStatus,
              }
            : s,
        ),
      );
    },
    [
      currentDate,
      femaleSchedule?.endTime,
      maleSchedule?.endTime,
      scheduleCache,
      updateAttendancesMutation,
    ],
  );

  // 엑셀 내보내기 (성별, 출력 유형 선택)
  const handleExportExcel = useCallback(
    (gender: '남' | '여' | null, exportMode: AttendanceExportMode = 'all') => {
      setIsExporting(true);
      setShowExcelMenu(false);
      setSelectedGender(null);

      try {
        let exportStudents = students;

        // 성별 필터링
        if (gender) {
          exportStudents = exportStudents.filter((s) => s.gender === gender);
        }

        if (exportMode === 'absent') {
          exportStudents = exportStudents.filter((s) => s.status === '미출석');
        } else if (exportMode === 'sleepover') {
          exportStudents = exportStudents.filter((s) => s.status === '외박');
        }

        const mergedData: MergedAttendanceMember[] = exportStudents.map(
          (s) => ({
            room: s.room,
            stdId: s.studentId,
            name: s.name,
            checked: s.status === '출석' || s.status === '지연출석',
            checkedDate: s.time !== '-' ? s.time : '',
            isSleepover: s.overnight,
            isLate: s.status === '지연출석',
          }),
        );

        exportMergedAttendanceToExcel(mergedData, gender, exportMode);
      } catch (error) {
        console.error('엑셀 내보내기 실패:', error);
        alert('엑셀 내보내기에 실패했습니다.');
      } finally {
        setIsExporting(false);
      }
    },
    [students],
  );

  // 출석 데이터의 각 날짜별 스케줄을 로드
  useEffect(() => {
    if (!attendancesData || attendancesData.length === 0) return;

    // 고유한 날짜들 추출
    const uniqueDates = [
      ...new Set(attendancesData.map((att) => att.date)),
    ];

    // 이미 로드된 날짜는 스킵
    const datesToLoad = uniqueDates.filter((date) => !scheduleCache.has(date));

    if (datesToLoad.length === 0) return;

    // 각 날짜별 스케줄 로드 (Promise.all 사용)
    Promise.all(
      datesToLoad.flatMap((date) => [
        scheduleService
          .getScheduleByDate(date, 'MALE')
          .then((schedule) => {
            return { date, gender: 'MALE', schedule };
          })
          .catch((err) => {
            console.error(`[Schedule Error] ${date} MALE:`, err);
            return { date, gender: 'MALE', schedule: undefined };
          }),
        scheduleService
          .getScheduleByDate(date, 'FEMALE')
          .then((schedule) => {
            return { date, gender: 'FEMALE', schedule };
          })
          .catch((err) => {
            console.error(`[Schedule Error] ${date} FEMALE:`, err);
            return { date, gender: 'FEMALE', schedule: undefined };
          }),
      ]),
    ).then((results) => {
      const newCache = new Map(scheduleCache);

      results.forEach((result) => {
        if (!newCache.has(result.date)) {
          newCache.set(result.date, {});
        }
        const dateSchedules = newCache.get(result.date)!;
        if (result.gender === 'MALE') {
          dateSchedules.maleSchedule = result.schedule;
        } else {
          dateSchedules.femaleSchedule = result.schedule;
        }
      });

      setScheduleCache(newCache);
    });
  }, [attendancesData, scheduleCache]);

  // 신버전 출석 데이터 매핑
  useEffect(() => {
    // 학번 → 학생 목록 정보 매핑
    const studentInfoMap = new Map<
      string,
      { id: number; phoneNumber?: string }
    >();
    if (studentsData?.content) {
      studentsData.content.forEach((s) => {
        const studentIdStr = `${s.grade}${s.classroom}${String(s.number).padStart(2, '0')}`;
        studentInfoMap.set(studentIdStr, {
          id: s.id,
          phoneNumber: s.phoneNumber,
        });
      });
    }

    const mappedStudents: Student[] = [];

    if (attendancesData) {
      attendancesData.forEach((att, index) => {
        const student = att.student;
        const studentIdStr = `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;
        const studentInfo = studentInfoMap.get(studentIdStr);
        const actualId = studentInfo?.id ?? student.id ?? null;
        const attendanceStatus = getPrimaryAttendanceStatus(att);
        const checkedAt = getPrimaryCheckedAt(att);

        const isOvernight = attendanceStatus === 'SLEEPOVER';
        const isPresent = attendanceStatus === 'PRESENT';
        const isLate = attendanceStatus === 'LATE';

        let checkedTime = '-';
        if (checkedAt) {
          const date = new Date(checkedAt);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          checkedTime = `${hours}:${minutes}`;
        }

        // 출석 기록의 실제 날짜(att.date)를 기준으로 스케줄 조회
        const dateSchedules = scheduleCache.get(att.date);
        const canUseCurrentScheduleFallback = att.date === currentDate;
        let endTime: string | undefined;
        if (student.gender === 'MALE') {
          endTime =
            dateSchedules?.maleSchedule?.endTime ??
            (canUseCurrentScheduleFallback ? maleSchedule?.endTime : undefined);
        } else {
          endTime =
            dateSchedules?.femaleSchedule?.endTime ??
            (canUseCurrentScheduleFallback
              ? femaleSchedule?.endTime
              : undefined);
        }

        const isCheckedAttendance = isPresent || isLate || Boolean(checkedAt);
        const isLateBySchedule = isLateAttendance(checkedTime, endTime);

        let displayStatus: '출석' | '미출석' | '외박' | '지연출석' = '미출석';
        if (isOvernight) {
          displayStatus = '외박';
        } else if (isCheckedAttendance) {
          // 서버가 LATE를 주지 않아도 checkedAt이 있으면 스케줄 종료 시간 기준으로 지연출석 판별
          if (isLate || isLateBySchedule) {
            displayStatus = '지연출석';
          } else {
            displayStatus = '출석';
          }
        }

        mappedStudents.push({
          id: actualId,
          index,
          room: student.room,
          overnight: isOvernight,
          name: student.name,
          status: displayStatus,
          gender: student.gender === 'MALE' ? '남' : '여',
          studentId: studentIdStr,
          grade: student.grade,
          classroom: student.classroom,
          number: student.number,
          time: checkedTime,
          nightAttendance: getNightAttendanceDisplayStatus(
            att.nightCheckStatus,
          ),
          phone: formatPhoneNumber(
            studentInfo?.phoneNumber ?? student.phoneNumber,
          ),
          phoneSubmission: getPhoneSubmissionDisplayStatus(
            att.phoneSubmissionStatus,
            isOvernight,
          ),
          dormitory: student.room.startsWith('2') ? '여기숙사' : '남기숙사',
        });
      });
    }

    setStudents(mappedStudents);
  }, [
    attendancesData,
    studentsData,
    scheduleCache,
    currentDate,
    maleSchedule,
    femaleSchedule,
  ]);

  // Sort function
  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        direction = 'desc';
      } else if (sortDirection === 'desc') {
        direction = null;
        setSortKey(null);
        setSortDirection(null);
        return;
      }
    }

    setSortKey(key);
    setSortDirection(direction);
  };

  // Get sorted students
  const getSortedStudents = () => {
    if (!sortKey || !sortDirection) {
      return students;
    }

    return [...students].sort((a, b) => {
      let aValue: string | number = a[sortKey] ?? '-';
      let bValue: string | number = b[sortKey] ?? '-';

      // Handle time sorting
      if (sortKey === 'time') {
        if (aValue === '-') return 1;
        if (bValue === '-') return -1;
      }

      // Handle room number sorting
      if (sortKey === 'room') {
        const aNum = parseInt(aValue.replace(/\D/g, '')) || 0;
        const bNum = parseInt(bValue.replace(/\D/g, '')) || 0;
        aValue = aNum;
        bValue = bNum;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedStudents = getSortedStudents();

  // Apply filters
  const getFilteredStudents = () => {
    return sortedStudents.filter((student) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (
          !matchesKoreanNameSearch(student.name, searchQuery) &&
          !student.room.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter (출석, 미출석, 외박)
      if (statusFilter !== '전체' && student.status !== statusFilter) {
        return false;
      }

      // Grade filter
      if (gradeFilter !== '전체' && student.grade !== gradeFilter) {
        return false;
      }

      // Gender filter
      if (genderFilter !== '전체' && student.gender !== genderFilter) {
        return false;
      }

      return true;
    });
  };

  const filteredStudents = getFilteredStudents();

  // 기존 handleExportExcel은 위에서 useCallback으로 정의됨

  const stats = {
    total: filteredStudents.length,
    present: filteredStudents.filter((s) => s.status === '출석').length,
    absent: filteredStudents.filter((s) => s.status === '미출석').length,
    late: filteredStudents.filter((s) => s.status === '지연출석').length,
    sleepover: filteredStudents.filter((s) => s.status === '외박').length,
    phoneNotSubmitted: filteredStudents.filter(
      (s) => s.phoneSubmission === '미제출',
    ).length,
  };

  if (attendancesLoading) {
    return (
      <div className="check-page">
        <CheckTableSkeleton />
      </div>
    );
  }
  return (
    <div className="check-page">
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
              placeholder="호실 / 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-box">전체 : {stats.total}명</div>
          <div className="stat-box attendance">
            출석 : <span className="positive">{stats.present}</span>명
          </div>
          <div className="stat-box absence">
            미출석 : <span className="negative">{stats.absent}</span>명
          </div>
          <div className="stat-box late">
            지연출석 : <span className="warning">{stats.late}</span>명
          </div>
          <div className="stat-box sleepover">
            외박 : <span className="sleepover-count">{stats.sleepover}</span>명
          </div>
          <div className="stat-box phone-submission">
            휴대폰 미제출 :{' '}
            <span className="phone-submission-count">
              {stats.phoneNotSubmitted}
            </span>
            명
          </div>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label className="filter-label">출석 상태:</label>
          <div className="filter-buttons">
            <button
              type="button"
              className={`filter-btn ${statusFilter === '전체' ? 'active' : ''}`}
              onClick={() => setStatusFilter('전체')}
            >
              전체
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === '출석' ? 'active' : ''}`}
              onClick={() => setStatusFilter('출석')}
            >
              출석
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === '미출석' ? 'active' : ''}`}
              onClick={() => setStatusFilter('미출석')}
            >
              미출석
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === '지연출석' ? 'active' : ''}`}
              onClick={() => setStatusFilter('지연출석')}
            >
              지연출석
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === '외박' ? 'active' : ''}`}
              onClick={() => setStatusFilter('외박')}
            >
              외박
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">성별:</label>
          <div className="filter-buttons">
            <button
              type="button"
              className={`filter-btn ${genderFilter === '전체' ? 'active' : ''}`}
              onClick={() => setGenderFilter('전체')}
            >
              전체
            </button>
            <button
              type="button"
              className={`filter-btn ${genderFilter === '남' ? 'active' : ''}`}
              onClick={() => setGenderFilter('남')}
            >
              남
            </button>
            <button
              type="button"
              className={`filter-btn ${genderFilter === '여' ? 'active' : ''}`}
              onClick={() => setGenderFilter('여')}
            >
              여
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">학년:</label>
          <div className="filter-buttons">
            <button
              type="button"
              className={`filter-btn ${gradeFilter === '전체' ? 'active' : ''}`}
              onClick={() => setGradeFilter('전체')}
            >
              전체
            </button>
            <button
              type="button"
              className={`filter-btn ${gradeFilter === 1 ? 'active' : ''}`}
              onClick={() => setGradeFilter(1)}
            >
              1학년
            </button>
            <button
              type="button"
              className={`filter-btn ${gradeFilter === 2 ? 'active' : ''}`}
              onClick={() => setGradeFilter(2)}
            >
              2학년
            </button>
            <button
              type="button"
              className={`filter-btn ${gradeFilter === 3 ? 'active' : ''}`}
              onClick={() => setGradeFilter(3)}
            >
              3학년
            </button>
          </div>
        </div>

        <div className="filter-actions">
          <div className="excel-dropdown" ref={excelMenuRef}>
            <button
              className="excel-button"
              onClick={() => setShowExcelMenu(!showExcelMenu)}
              disabled={isExporting}
            >
              <ExcelIcon className="excel-icon" />
              {isExporting ? '다운로드 중...' : 'Excel'}
              <span className="excel-caret">▾</span>
            </button>
            {showExcelMenu && (
              <div className="excel-menu">
                {selectedGender === null ? (
                  <>
                    <button
                      className="excel-menu-item"
                      onClick={() => setSelectedGender('남')}
                    >
                      남학생
                    </button>
                    <button
                      className="excel-menu-item"
                      onClick={() => setSelectedGender('여')}
                    >
                      여학생
                    </button>
                  </>
                ) : (
                  <>
                    <div className="excel-menu-header">
                      <span>{selectedGender === '남' ? '남학생' : '여학생'}</span>
                      <button
                        type="button"
                        className="excel-menu-header-action"
                        onClick={() => setSelectedGender(null)}
                      >
                        변경
                      </button>
                    </div>
                    <button
                      className="excel-menu-item"
                      onClick={() => handleExportExcel(selectedGender, 'all')}
                    >
                      <span className="excel-menu-item-title">전체 명단</span>
                      <span className="excel-menu-item-desc">
                        출석부 전체 양식 다운로드
                      </span>
                    </button>
                    <button
                      className="excel-menu-item absent-only"
                      onClick={() => handleExportExcel(selectedGender, 'absent')}
                    >
                      <span className="excel-menu-item-title">
                        미출석 명단
                      </span>
                      <span className="excel-menu-item-desc">
                        A4 체크리스트 다운로드
                      </span>
                    </button>
                    <button
                      className="excel-menu-item sleepover-only"
                      onClick={() =>
                        handleExportExcel(selectedGender, 'sleepover')
                      }
                    >
                      <span className="excel-menu-item-title">
                        외박자 명단
                      </span>
                      <span className="excel-menu-item-desc">
                        외박자 A4 명단 다운로드
                      </span>
                    </button>
                    <button
                      className="excel-menu-item back-button"
                      onClick={() => setSelectedGender(null)}
                    >
                      ← 뒤로가기
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="student-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('room')} className="sortable">
                호실
                {sortKey === 'room' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('name')} className="sortable">
                이름
                {sortKey === 'name' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                상태
                {sortKey === 'status' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('gender')} className="sortable">
                성별
                {sortKey === 'gender' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('studentId')} className="sortable">
                학번
                {sortKey === 'studentId' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('time')} className="sortable">
                출석 시간
                {sortKey === 'time' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th
                onClick={() => handleSort('nightAttendance')}
                className="sortable"
              >
                심자 출석
                {sortKey === 'nightAttendance' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th
                onClick={() => handleSort('phoneSubmission')}
                className="sortable"
              >
                휴대폰 제출
                {sortKey === 'phoneSubmission' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th>연락처</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, index) => {
              const nightAttendance = student.nightAttendance ?? '-';
              const phoneSubmission = student.phoneSubmission ?? '-';

              return (
                <tr key={index}>
                  <td className="room-cell" data-label="호실">{student.room}</td>
                  <td data-label="이름">{student.name}</td>
                  <td data-label="상태">
                    {student.status === '외박' ? (
                      <span className="status-sleepover">외박</span>
                    ) : (
                      <select
                        value={student.status}
                        onChange={(e) =>
                          handleStatusChange(
                            student,
                            e.target.value as
                              | '출석'
                              | '미출석'
                              | '외박'
                              | '지연출석',
                          )
                        }
                        disabled={updateAttendancesMutation.isPending}
                        className={`status-select ${
                          student.status === '출석'
                            ? 'status-present'
                            : student.status === '지연출석'
                              ? 'status-late'
                              : 'status-absent'
                        }`}
                      >
                        <option value="출석">출석</option>
                        <option value="지연출석">지연출석</option>
                        <option value="미출석">미출석</option>
                      </select>
                    )}
                  </td>
                  <td data-label="성별">{student.gender}</td>
                  <td data-label="학번">{student.studentId}</td>
                  <td data-label="출석 시간">{student.time}</td>
                  <td data-label="심자 출석">
                    {nightAttendance === '출석' ? (
                      <span className="status-present">{nightAttendance}</span>
                    ) : (
                      nightAttendance
                    )}
                  </td>
                  <td data-label="휴대폰 제출">
                    <span
                      className={`phone-submission-badge ${getPhoneSubmissionClassName(
                        phoneSubmission,
                      )}`}
                      aria-label={`휴대폰 ${phoneSubmission}`}
                    >
                      {getPhoneSubmissionSymbol(phoneSubmission)}
                    </span>
                  </td>
                  <td data-label="연락처">{student.phone}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
