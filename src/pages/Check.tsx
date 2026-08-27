import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from 'react';
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
  useQuery,
} from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { studentService } from '../services/student.service';
import { attendanceService } from '../services/attendance.service';
import { scheduleService } from '../services/schedule.service';
import type { LayoutOutletContext } from '../components/Layout';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import type {
  AttendanceExportMode,
  MergedAttendanceMember,
} from '../services/excel.service';
import { CheckTableSkeleton, TableRowSkeleton } from '../components/Skeleton';
import AttendanceStatusPicker, {
  type AttendanceDisplayStatus,
} from '../components/AttendanceStatusPicker';
import DonutChart from '../components/DonutChart';
import { RollingNumber } from '../components/RollingNumber';
import '../styles/Check.css';
import { SearchIcon, ExcelIcon } from '../components/Icons';
import type {
  AttendanceStatus,
  AttendanceResponse,
  AttendanceType,
  DeviceSubmissionStatus,
  UpdateAttendancesRequest,
} from '../types/api';
import { formatLocalDate, getAdjacentDate } from '../utils/date';
import { useSelectedDate } from '../context/SelectedDateContext';
import { useAttendanceView } from '../context/AttendanceViewContext';

interface Student {
  id: number | null;
  index: number;
  room: string;
  overnight: boolean;
  name: string;
  status: AttendanceDisplayStatus;
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

type DisplayAttendanceStatus = AttendanceDisplayStatus;
type NightAttendanceDisplayStatus = '출석' | '미출석' | '-';
type PhoneSubmissionDisplayStatus = '제출' | '미제출' | '외박' | '-';
type AttendanceScheduleTime = {
  morningEndTime?: string;
  nightStartTime?: string;
  nightEndTime?: string;
};
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

const ATTENDANCE_PERIOD_LABELS: Record<
  AttendanceType,
  {
    title: string;
    description: string;
    complete: string;
    absent: string;
    late: string;
    time: string;
  }
> = {
  MORNING: {
    title: '아침 퇴실',
    description: '등교 전 기숙사 퇴실 현황',
    complete: '퇴실 완료',
    absent: '미퇴실',
    late: '지연 퇴실',
    time: '퇴실 시간',
  },
  NIGHT: {
    title: '저녁 입실',
    description: '저녁 점호 기숙사 입실 현황',
    complete: '입실 완료',
    absent: '미입실',
    late: '지연 입실',
    time: '입실 시간',
  },
};

const toPercent = (value: number, total: number): string =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  sleepover: number;
  nightPresent: number;
  nightAbsent: number;
  nightPending: number;
  phoneSubmitted: number;
  phoneNotSubmitted: number;
  phoneSleepover: number;
  phonePending: number;
}

// 자동 새로고침 간격 (30초)
const REFRESH_INTERVAL = 30 * 1000;

const getTimeBasedAttendanceType = (
  schedules: Array<AttendanceScheduleTime | undefined>,
  now = new Date(),
): AttendanceType => {
  const nightStartMinutes = schedules
    .map((schedule) => getMinutesFromTime(schedule?.nightStartTime))
    .filter((minutes): minutes is number => minutes !== null);

  if (nightStartMinutes.length === 0) {
    return now.getHours() < 12 ? 'MORNING' : 'NIGHT';
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= Math.min(...nightStartMinutes) ? 'NIGHT' : 'MORNING';
};

const STATUS_MAP: Record<DisplayAttendanceStatus, AttendanceStatus> = {
  출석: 'PRESENT',
  미출석: 'ABSENT',
  외박: 'SLEEPOVER',
  지연출석: 'LATE',
};

const getAttendanceStatus = (
  attendance: AttendanceResponse,
  attendanceType: AttendanceType,
): AttendanceStatus =>
  attendanceType === 'MORNING'
    ? attendance.morningCheckStatus
    : attendance.nightCheckStatus;

const getCheckedAt = (
  attendance: AttendanceResponse,
  attendanceType: AttendanceType,
): string | undefined =>
  attendanceType === 'MORNING'
    ? attendance.morningCheckedAt
    : attendance.nightCheckedAt;

const getNightAttendanceDisplayStatus = (
  status: boolean | null | undefined,
): NightAttendanceDisplayStatus => {
  if (status === true) return '출석';
  if (status === false) return '미출석';
  return '-';
};

const getPhoneSubmissionDisplayStatus = (
  status: DeviceSubmissionStatus | undefined,
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

const getScheduleEndTime = (
  schedule: AttendanceScheduleTime | undefined,
  attendanceType: AttendanceType,
): string | undefined =>
  attendanceType === 'MORNING'
    ? schedule?.morningEndTime
    : schedule?.nightEndTime;

const hasAttendanceWindowEnded = (
  attendanceDate: string,
  endTime: string | undefined,
): boolean => {
  const today = formatLocalDate();

  if (attendanceDate < today) return true;
  if (attendanceDate > today) return false;

  return isLateAttendance(getCurrentTimeString(), endTime);
};

export default function Check() {
  const { setHeaderActions } = useOutletContext<LayoutOutletContext>();
  const { selectedDate: currentDate, setSelectedDate: setCurrentDate } =
    useSelectedDate();
  const {
    attendanceView: attendanceType,
    isManual: isPeriodManuallySelected,
    setAttendanceView: setAttendanceType,
    syncAttendanceView,
    resetToAuto,
  } = useAttendanceView();
  const [searchQuery, setSearchQuery] = useState('');
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

  // 신버전 출석 데이터 (자동 새로고침, 날짜 변경 시 이전 데이터 유지)
  const {
    data: attendancesData,
    isLoading: attendancesLoading,
    isPlaceholderData: attendancesStale,
  } = useQuery({
    queryKey: ['attendances', currentDate],
    queryFn: () => attendanceService.getAttendances(currentDate),
    placeholderData: keepPreviousData,
  });

  // 학생 목록 (ID 매핑용)
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  // 출석 스케줄 (남/여 기숙사)
  const { data: maleSchedule, isLoading: isMaleScheduleLoading } = useQuery({
    queryKey: ['schedule', currentDate, 'MALE'],
    queryFn: () => scheduleService.getScheduleByDate(currentDate, 'MALE'),
    retry: false,
  });

  const { data: femaleSchedule, isLoading: isFemaleScheduleLoading } = useQuery({
    queryKey: ['schedule', currentDate, 'FEMALE'],
    queryFn: () => scheduleService.getScheduleByDate(currentDate, 'FEMALE'),
    retry: false,
  });

  const isAutoAttendanceTypeResolving =
    !isPeriodManuallySelected &&
    (isMaleScheduleLoading || isFemaleScheduleLoading);

  useLayoutEffect(() => {
    if (isPeriodManuallySelected || isAutoAttendanceTypeResolving) return;

    const updateAttendanceType = () => {
      syncAttendanceView(
        getTimeBasedAttendanceType([maleSchedule, femaleSchedule]),
      );
    };

    updateAttendanceType();
    const interval = window.setInterval(
      updateAttendanceType,
      REFRESH_INTERVAL,
    );

    return () => window.clearInterval(interval);
  }, [
    femaleSchedule,
    isAutoAttendanceTypeResolving,
    isPeriodManuallySelected,
    maleSchedule,
    syncAttendanceView,
  ]);

  const handlePreviousAttendancePeriod = useCallback(() => {
    if (attendanceType === 'NIGHT') {
      setAttendanceType('MORNING');
      return;
    }

    setCurrentDate(getAdjacentDate(currentDate, -1));
    setAttendanceType('NIGHT');
  }, [attendanceType, currentDate, setCurrentDate, setAttendanceType]);

  const handleNextAttendancePeriod = useCallback(() => {
    if (attendanceType === 'MORNING') {
      setAttendanceType('NIGHT');
      return;
    }

    setCurrentDate(getAdjacentDate(currentDate, 1));
    setAttendanceType('MORNING');
  }, [attendanceType, currentDate, setCurrentDate, setAttendanceType]);

  const isViewingCurrentAttendancePeriod =
    !isAutoAttendanceTypeResolving &&
    currentDate === formatLocalDate() &&
    attendanceType === getTimeBasedAttendanceType([maleSchedule, femaleSchedule]);

  useEffect(() => {
    if (isAutoAttendanceTypeResolving) return;

    if (isPeriodManuallySelected && isViewingCurrentAttendancePeriod) {
      resetToAuto();
    }
  }, [
    isAutoAttendanceTypeResolving,
    isPeriodManuallySelected,
    isViewingCurrentAttendancePeriod,
    resetToAuto,
  ]);

  useLayoutEffect(() => {
    if (isAutoAttendanceTypeResolving) {
      setHeaderActions(null);
      return;
    }

    setHeaderActions(
      <div className="header-attendance-period-controls check-period-controls">
        <span
          className={`header-attendance-period-summary check-period-summary ${
            isViewingCurrentAttendancePeriod ? 'is-current' : ''
          }`}
        >
          <span className="header-attendance-period-date">
            {isViewingCurrentAttendancePeriod ? '현재' : currentDate}
          </span>
          <span>{ATTENDANCE_PERIOD_LABELS[attendanceType].title}</span>
        </span>
        <div
          className="header-attendance-period-navigation check-period-navigation"
          aria-label="점호 회차 이동"
        >
          <button
            type="button"
            className="header-attendance-period-button check-period-button"
            onClick={handlePreviousAttendancePeriod}
          >
            ← 이전 점호
          </button>
          <button
            type="button"
            className="header-attendance-period-button check-period-button"
            onClick={handleNextAttendancePeriod}
          >
            다음 점호 →
          </button>
        </div>
      </div>,
    );
  }, [
    attendanceType,
    currentDate,
    handleNextAttendancePeriod,
    handlePreviousAttendancePeriod,
    isAutoAttendanceTypeResolving,
    isViewingCurrentAttendancePeriod,
    setHeaderActions,
  ]);

  useEffect(
    () => () => {
      setHeaderActions(null);
    },
    [setHeaderActions],
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [scheduleCache, setScheduleCache] = useState<
    Map<
      string,
      {
        maleSchedule?: AttendanceScheduleTime;
        femaleSchedule?: AttendanceScheduleTime;
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
      newDisplayStatus: AttendanceDisplayStatus,
      sleepoverReason?: string,
    ) => {
      if (!student.id) {
        console.error('학생 ID를 찾을 수 없습니다.');
        return;
      }

      const dateSchedules = scheduleCache.get(currentDate);
      const endTime =
        student.gender === '남'
          ? (getScheduleEndTime(dateSchedules?.maleSchedule, attendanceType) ??
            getScheduleEndTime(maleSchedule, attendanceType))
          : (getScheduleEndTime(
              dateSchedules?.femaleSchedule,
              attendanceType,
            ) ?? getScheduleEndTime(femaleSchedule, attendanceType));
      const effectiveDisplayStatus: DisplayAttendanceStatus =
        newDisplayStatus === '출석' &&
        hasAttendanceWindowEnded(currentDate, endTime)
          ? '지연출석'
          : newDisplayStatus;

      updateAttendancesMutation.mutate({
        date: currentDate,
        attendances: [
          {
            studentId: student.id,
            status: STATUS_MAP[effectiveDisplayStatus],
            attendanceType,
            sleepoverReason:
              effectiveDisplayStatus === '외박' ? sleepoverReason : null,
          },
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
      attendanceType,
      femaleSchedule,
      maleSchedule,
      scheduleCache,
      updateAttendancesMutation,
    ],
  );

  // 엑셀 내보내기 (성별, 출력 유형 선택)
  const handleExportExcel = useCallback(
    async (gender: '남' | '여' | null, exportMode: AttendanceExportMode = 'all') => {
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

        const { exportMergedAttendanceToExcel } = await import(
          '../services/excel.service'
        );
        exportMergedAttendanceToExcel(
          mergedData,
          gender,
          exportMode,
          attendanceType,
          currentDate,
        );
      } catch (error) {
        console.error('엑셀 내보내기 실패:', error);
        alert('엑셀 내보내기에 실패했습니다.');
      } finally {
        setIsExporting(false);
      }
    },
    [attendanceType, currentDate, students],
  );

  // 출석 데이터의 각 날짜별 스케줄을 로드
  useEffect(() => {
    if (!attendancesData || attendancesData.length === 0) return;

    // 고유한 날짜들 추출
    const uniqueDates = [
      ...new Set(attendancesData.map((att) => att.date)),
    ];

    // 이미 로드된 날짜는 스킵
    const datesToLoad = uniqueDates.filter(
      (date) => date !== currentDate && !scheduleCache.has(date),
    );

    if (datesToLoad.length === 0) return;

    // 각 날짜별 스케줄 로드 (Promise.all 사용)
    Promise.all(
      datesToLoad.flatMap((date) => [
        scheduleService
          .getScheduleByDate(date, 'MALE')
          .then((schedule) => {
            return { date, gender: 'MALE', schedule };
          })
          .catch(() => {
            return { date, gender: 'MALE', schedule: undefined };
          }),
        scheduleService
          .getScheduleByDate(date, 'FEMALE')
          .then((schedule) => {
            return { date, gender: 'FEMALE', schedule };
          })
          .catch(() => {
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
  }, [attendancesData, currentDate, scheduleCache]);

  // 신버전 출석 데이터 매핑 (페인트 전에 반영해야 예전 데이터 깜빡임이 없음)
  useLayoutEffect(() => {
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
        const attendanceStatus = getAttendanceStatus(att, attendanceType);
        const checkedAt = getCheckedAt(att, attendanceType);

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
            getScheduleEndTime(dateSchedules?.maleSchedule, attendanceType) ??
            (canUseCurrentScheduleFallback
              ? getScheduleEndTime(maleSchedule, attendanceType)
              : undefined);
        } else {
          endTime =
            getScheduleEndTime(
              dateSchedules?.femaleSchedule,
              attendanceType,
            ) ??
            (canUseCurrentScheduleFallback
              ? getScheduleEndTime(femaleSchedule, attendanceType)
              : undefined);
        }

        const isCheckedAttendance = isPresent || isLate;
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
            att.nightStudyAttendance,
          ),
          phone: formatPhoneNumber(
            studentInfo?.phoneNumber ?? student.phoneNumber,
          ),
          phoneSubmission: getPhoneSubmissionDisplayStatus(
            att.deviceSubmissionStatus,
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
    attendanceType,
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
          !student.room.toLowerCase().includes(query) &&
          !student.studentId.includes(query)
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

  const stats = filteredStudents.reduce<AttendanceStats>(
    (acc, student) => {
      acc.total += 1;

      switch (student.status) {
        case '출석':
          acc.present += 1;
          break;
        case '미출석':
          acc.absent += 1;
          break;
        case '지연출석':
          acc.late += 1;
          break;
        case '외박':
          acc.sleepover += 1;
          break;
      }

      switch (student.nightAttendance ?? '-') {
        case '출석':
          acc.nightPresent += 1;
          break;
        case '미출석':
          acc.nightAbsent += 1;
          break;
        case '-':
          acc.nightPending += 1;
          break;
      }

      switch (student.phoneSubmission ?? '-') {
        case '제출':
          acc.phoneSubmitted += 1;
          break;
        case '미제출':
          acc.phoneNotSubmitted += 1;
          break;
        case '외박':
          acc.phoneSleepover += 1;
          break;
        case '-':
          acc.phonePending += 1;
          break;
      }

      return acc;
    },
    {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      sleepover: 0,
      nightPresent: 0,
      nightAbsent: 0,
      nightPending: 0,
      phoneSubmitted: 0,
      phoneNotSubmitted: 0,
      phoneSleepover: 0,
      phonePending: 0,
    },
  );

  const renderSortableHeader = (key: SortKey, label: string) => (
    <th onClick={() => handleSort(key)} className="sortable">
      {label}
      {sortKey === key && (
        <span className="sort-indicator">
          {sortDirection === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );

  const renderNightAttendance = (
    nightAttendance: NightAttendanceDisplayStatus,
  ) => {
    if (nightAttendance === '출석') {
      return <span className="status-present">{nightAttendance}</span>;
    }
    if (nightAttendance === '미출석') {
      return <span className="status-absent">{nightAttendance}</span>;
    }
    return nightAttendance;
  };

  const renderPhoneSubmission = (
    phoneSubmission: PhoneSubmissionDisplayStatus,
  ) => (
    <span
      className={`phone-submission-badge ${getPhoneSubmissionClassName(
        phoneSubmission,
      )}`}
      aria-label={`휴대폰 ${phoneSubmission}`}
    >
      {getPhoneSubmissionSymbol(phoneSubmission)}
    </span>
  );

  const periodLabels = ATTENDANCE_PERIOD_LABELS[attendanceType];
  const nightAttendanceTotal = stats.nightPresent + stats.nightAbsent;
  const phoneSubmissionTotal = stats.phoneSubmitted + stats.phoneNotSubmitted;
  const nightAttendanceRate =
    nightAttendanceTotal > 0
      ? Math.round((stats.nightPresent / nightAttendanceTotal) * 100)
      : 0;
  const phoneSubmissionRate =
    phoneSubmissionTotal > 0
      ? Math.round((stats.phoneSubmitted / phoneSubmissionTotal) * 100)
      : 0;

  if (attendancesLoading || isAutoAttendanceTypeResolving) {
    return (
      <div className="check-page">
        <CheckTableSkeleton
          nightCard={
            !isAutoAttendanceTypeResolving && attendanceType === 'NIGHT'
          }
        />
      </div>
    );
  }
  return (
    <div className="check-page">
      <div className="controls-section">
        <div className="donut-cards">
          <div className="donut-card">
            <h3 className="donut-card-title">{periodLabels.title} 상태 분포</h3>
            <div className="donut-card-body">
              <DonutChart
                key={`${stats.present}-${stats.absent}-${stats.late}-${stats.sleepover}-${stats.total}`}
                className="donut-card-chart"
                total={stats.total}
                label={`${periodLabels.title} 상태 비율`}
                segments={[
                  { key: 'present', color: '#22c55e', value: stats.present },
                  { key: 'absent', color: '#ef4444', value: stats.absent },
                  { key: 'late', color: '#f59e0b', value: stats.late },
                  {
                    key: 'sleepover',
                    color: '#8b5cf6',
                    value: stats.sleepover,
                  },
                ]}
              >
                <span>전체</span>
                <strong>
                  <RollingNumber value={stats.total} />명
                </strong>
              </DonutChart>
              <ul className="donut-legend">
                {[
                  {
                    label: periodLabels.complete,
                    value: stats.present,
                    tone: 'positive',
                  },
                  {
                    label: periodLabels.absent,
                    value: stats.absent,
                    tone: 'negative',
                  },
                  {
                    label: periodLabels.late,
                    value: stats.late,
                    tone: 'warning',
                  },
                  {
                    label: '외박',
                    value: stats.sleepover,
                    tone: 'sleepover',
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

          {attendanceType === 'NIGHT' && (
            <div className="donut-card">
              <h3 className="donut-card-title">심야자습 출석 현황</h3>
              <div className="donut-card-body">
                <DonutChart
                  key={`${stats.nightPresent}-${stats.nightAbsent}`}
                  className="donut-card-chart"
                  total={stats.nightPresent + stats.nightAbsent}
                  label="심야자습 출석 비율"
                  segments={[
                    {
                      key: 'present',
                      color: '#22c55e',
                      value: stats.nightPresent,
                    },
                    {
                      key: 'absent',
                      color: '#ef4444',
                      value: stats.nightAbsent,
                    },
                  ]}
                >
                  <strong>
                    <RollingNumber value={nightAttendanceRate} />%
                  </strong>
                </DonutChart>
                <ul className="donut-legend">
                  <li>
                    <span className="legend-label">
                      <i className="legend-dot positive" />
                      출석
                    </span>
                    <span className="legend-value">
                      <RollingNumber value={stats.nightPresent} />명{' '}
                      <em>
                        (
                        {toPercent(
                          stats.nightPresent,
                          stats.nightPresent + stats.nightAbsent,
                        )}
                        )
                      </em>
                    </span>
                  </li>
                  <li>
                    <span className="legend-label">
                      <i className="legend-dot negative" />
                      미출석
                    </span>
                    <span className="legend-value">
                      <RollingNumber value={stats.nightAbsent} />명{' '}
                      <em>
                        (
                        {toPercent(
                          stats.nightAbsent,
                          stats.nightPresent + stats.nightAbsent,
                        )}
                        )
                      </em>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="donut-card">
            <h3 className="donut-card-title">휴대폰 제출 현황</h3>
            <div className="donut-card-body">
              <DonutChart
                key={`${stats.phoneSubmitted}-${stats.phoneNotSubmitted}`}
                className="donut-card-chart"
                total={stats.phoneSubmitted + stats.phoneNotSubmitted}
                label="휴대폰 제출 비율"
                segments={[
                  {
                    key: 'submitted',
                    color: '#22c55e',
                    value: stats.phoneSubmitted,
                  },
                  {
                    key: 'not-submitted',
                    color: '#ef4444',
                    value: stats.phoneNotSubmitted,
                  },
                ]}
              >
                <strong>
                  <RollingNumber value={phoneSubmissionRate} />%
                </strong>
              </DonutChart>
              <ul className="donut-legend">
                <li>
                  <span className="legend-label">
                    <i className="legend-dot positive" />
                    제출 완료
                  </span>
                  <span className="legend-value">
                    <RollingNumber value={stats.phoneSubmitted} />명{' '}
                    <em>
                      (
                      {toPercent(
                        stats.phoneSubmitted,
                        stats.phoneSubmitted + stats.phoneNotSubmitted,
                      )}
                      )
                    </em>
                  </span>
                </li>
                <li>
                  <span className="legend-label">
                    <i className="legend-dot negative" />
                    미제출
                  </span>
                  <span className="legend-value">
                    <RollingNumber value={stats.phoneNotSubmitted} />명{' '}
                    <em>
                      (
                      {toPercent(
                        stats.phoneNotSubmitted,
                        stats.phoneSubmitted + stats.phoneNotSubmitted,
                      )}
                      )
                    </em>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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
          <label className="filter-label">{periodLabels.title} 상태:</label>
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
              {periodLabels.complete}
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === '미출석' ? 'active' : ''}`}
              onClick={() => setStatusFilter('미출석')}
            >
              {periodLabels.absent}
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === '지연출석' ? 'active' : ''}`}
              onClick={() => setStatusFilter('지연출석')}
            >
              {periodLabels.late}
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
                        {periodLabels.title} 전체 양식 다운로드
                      </span>
                    </button>
                    <button
                      className="excel-menu-item absent-only"
                      onClick={() => handleExportExcel(selectedGender, 'absent')}
                    >
                      <span className="excel-menu-item-title">
                        {periodLabels.absent} 명단
                      </span>
                      <span className="excel-menu-item-desc">
                        {periodLabels.title} A4 체크리스트
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
        <table
          className={`student-table ${
            attendanceType === 'MORNING' ? 'student-table-attendance-only' : ''
          }`}
        >
          <thead>
            <tr>
              {renderSortableHeader('room', '호실')}
              {renderSortableHeader('name', '이름')}
              {renderSortableHeader('status', `${periodLabels.title} 상태`)}
              {renderSortableHeader('gender', '성별')}
              {renderSortableHeader('studentId', '학번')}
              {renderSortableHeader('time', periodLabels.time)}
              {attendanceType === 'NIGHT' &&
                renderSortableHeader('nightAttendance', '심자 출석')}
              {attendanceType === 'NIGHT' &&
                renderSortableHeader('phoneSubmission', '휴대폰 제출')}
              <th>연락처</th>
            </tr>
          </thead>
          <tbody>
            {attendancesStale
              ? Array.from({
                  length: Math.max(filteredStudents.length, 8),
                }).map((_, row) => (
                  <TableRowSkeleton
                    key={row}
                    columns={attendanceType === 'NIGHT' ? 9 : 7}
                  />
                ))
              : filteredStudents.map((student, index) => {
              const nightAttendance = student.nightAttendance ?? '-';
              const phoneSubmission = student.phoneSubmission ?? '-';

              return (
                <tr key={index}>
                  <td className="room-cell" data-label="호실">{student.room}</td>
                  <td data-label="이름">{student.name}</td>
                  <td data-label={`${periodLabels.title} 상태`}>
                    <AttendanceStatusPicker
                      value={student.status}
                      completeLabel={periodLabels.complete}
                      lateLabel={periodLabels.late}
                      absentLabel={periodLabels.absent}
                      studentName={student.name}
                      onChange={(status, sleepoverReason) =>
                        handleStatusChange(
                          student,
                          status,
                          sleepoverReason,
                        )
                      }
                      disabled={updateAttendancesMutation.isPending}
                    />
                  </td>
                  <td data-label="성별">{student.gender}</td>
                  <td data-label="학번">{student.studentId}</td>
                  <td data-label={periodLabels.time}>{student.time}</td>
                  {attendanceType === 'NIGHT' && (
                    <td data-label="심자 출석">
                      {renderNightAttendance(nightAttendance)}
                    </td>
                  )}
                  {attendanceType === 'NIGHT' && (
                    <td data-label="휴대폰 제출">
                      {renderPhoneSubmission(phoneSubmission)}
                    </td>
                  )}
                  <td data-label="연락처">{student.phone}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
