import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services/schedule.service';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/Schedule.css';
import { CalendarIcon } from '../components/Icons';
import { getKoreanHolidayName } from '../constants/koreanHolidays';
import type { AttendanceScheduleResponse, Gender } from '../types/api';

interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSaturday: boolean;
  isHoliday: boolean;
  isRedDay: boolean;
  holidayName?: string;
  dayOfWeek: number; // 0=일요일, 6=토요일
  maleSchedule?: AttendanceScheduleResponse;
  femaleSchedule?: AttendanceScheduleResponse;
}

type QuickSelectionMode = 'sunday' | 'redDay' | 'schoolWeekdays';

const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;

const getScheduleStartTime = (
  schedule?: AttendanceScheduleResponse,
): string | undefined =>
  schedule?.startTime ?? schedule?.nightStartTime ?? schedule?.morningStartTime;

const getScheduleEndTime = (
  schedule?: AttendanceScheduleResponse,
): string | undefined =>
  schedule?.endTime ?? schedule?.nightEndTime ?? schedule?.morningEndTime;

const splitScheduleTime = (time?: string) => {
  const match = time?.match(TIME_PATTERN);
  if (!match) return null;

  return {
    hour: match[1].padStart(2, '0'),
    minute: match[2],
  };
};

// 시간 포맷 (HH:mm -> HH:mm, 초 제거)
const formatTime = (time?: string) => {
  const parts = splitScheduleTime(time);
  return parts ? `${parts.hour}:${parts.minute}` : '--:--';
};

const formatScheduleRange = (
  schedule?: AttendanceScheduleResponse,
  separator = '~',
) => {
  const startTime = getScheduleStartTime(schedule);
  const endTime = getScheduleEndTime(schedule);

  if (!startTime || !endTime) return '시간 미설정';

  return `${formatTime(startTime)}${separator}${formatTime(endTime)}`;
};

// 기본 시간 상수
const DEFAULT_START_HOUR = '16';
const DEFAULT_START_MINUTE = '00';
const WEEKDAY_END_HOUR = '22';
const WEEKDAY_END_MINUTE = '15';
const SUNDAY_END_HOUR = '21';
const SUNDAY_END_MINUTE = '10';

export default function Schedule() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [activeQuickSelection, setActiveQuickSelection] =
    useState<QuickSelectionMode | null>(null);

  // 로딩 모달 상태
  const [loadingModal, setLoadingModal] = useState<{
    isOpen: boolean;
    title: string;
    current: number;
    total: number;
    action: 'create' | 'delete' | 'update';
  }>({ isOpen: false, title: '', current: 0, total: 0, action: 'create' });

  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '확인',
    onConfirm: () => {},
  });

  // 남기숙사 시간 상태
  const [maleStartHour, setMaleStartHour] = useState(DEFAULT_START_HOUR);
  const [maleStartMinute, setMaleStartMinute] = useState(DEFAULT_START_MINUTE);
  const [maleEndHour, setMaleEndHour] = useState(WEEKDAY_END_HOUR);
  const [maleEndMinute, setMaleEndMinute] = useState(WEEKDAY_END_MINUTE);

  // 여기숙사 시간 상태
  const [femaleStartHour, setFemaleStartHour] = useState(DEFAULT_START_HOUR);
  const [femaleStartMinute, setFemaleStartMinute] =
    useState(DEFAULT_START_MINUTE);
  const [femaleEndHour, setFemaleEndHour] = useState(WEEKDAY_END_HOUR);
  const [femaleEndMinute, setFemaleEndMinute] = useState(WEEKDAY_END_MINUTE);
  const queryClient = useQueryClient();

  // Fetch month schedules
  const {
    data: schedulesData,
    isLoading,
    isError: schedulesError,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ['schedules', 'month', currentYear, currentMonth],
    queryFn: () => scheduleService.getMonthSchedules(currentYear, currentMonth),
  });

  const days = ['일', '월', '화', '수', '목', '금', '토'];

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const result: CalendarDay[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    // Create schedule maps by date and gender
    const maleScheduleMap = new Map<string, AttendanceScheduleResponse>();
    const femaleScheduleMap = new Map<string, AttendanceScheduleResponse>();

    if (schedulesData) {
      schedulesData.forEach((schedule) => {
        const dateStr = schedule.date;
        if (schedule.gender === 'MALE') {
          maleScheduleMap.set(dateStr, schedule);
        } else if (schedule.gender === 'FEMALE') {
          femaleScheduleMap.set(dateStr, schedule);
        }
      });
    }

    // Previous month days
    const prevMonthLastDay = new Date(
      currentYear,
      currentMonth - 1,
      0,
    ).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const fullDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const dayOfWeek = (startDayOfWeek - i - 1 + 7) % 7;
      const holidayName = getKoreanHolidayName(fullDate);
      const isHoliday = !!holidayName;
      const isSaturday = dayOfWeek === 6;

      result.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSaturday,
        isHoliday,
        isRedDay: dayOfWeek === 0 || isHoliday,
        holidayName: holidayName ?? undefined,
        dayOfWeek,
      });
    }

    // Current month days
    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const dayOfWeek = (startDayOfWeek + date - 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = fullDate === todayStr;
      const holidayName = getKoreanHolidayName(fullDate);
      const isHoliday = !!holidayName;
      const isSaturday = dayOfWeek === 6;

      result.push({
        date,
        fullDate,
        isCurrentMonth: true,
        isToday,
        isWeekend,
        isSaturday,
        isHoliday,
        isRedDay: dayOfWeek === 0 || isHoliday,
        holidayName: holidayName ?? undefined,
        dayOfWeek,
        maleSchedule: maleScheduleMap.get(fullDate),
        femaleSchedule: femaleScheduleMap.get(fullDate),
      });
    }

    // Next month days to fill the grid (6 rows)
    const remainingCells = 42 - result.length;
    for (let date = 1; date <= remainingCells; date++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const fullDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const dayOfWeek = result.length % 7;
      const holidayName = getKoreanHolidayName(fullDate);
      const isHoliday = !!holidayName;
      const isSaturday = dayOfWeek === 6;

      result.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSaturday,
        isHoliday,
        isRedDay: dayOfWeek === 0 || isHoliday,
        holidayName: holidayName ?? undefined,
        dayOfWeek,
      });
    }

    return result;
  }, [currentYear, currentMonth, schedulesData, todayStr]);

  // 선택된 첫번째 날짜의 스케줄 데이터
  const selectedDayData = useMemo(() => {
    if (selectedDates.length === 0) return null;
    const firstDate = selectedDates[0];
    return (
      calendarDays.find((d) => d.fullDate === firstDate && d.isCurrentMonth) ||
      null
    );
  }, [selectedDates, calendarDays]);

  const getDefaultTimeByDay = (dayOfWeek?: number, isRedDay = false) => ({
    startHour: DEFAULT_START_HOUR,
    startMinute: DEFAULT_START_MINUTE,
    endHour: isRedDay || dayOfWeek === 0 ? SUNDAY_END_HOUR : WEEKDAY_END_HOUR,
    endMinute:
      isRedDay || dayOfWeek === 0 ? SUNDAY_END_MINUTE : WEEKDAY_END_MINUTE,
  });

  const getDefaultTimeByCalendarDay = (day?: CalendarDay | null) => {
    return getDefaultTimeByDay(day?.dayOfWeek, !!day?.isRedDay);
  };

  const getDefaultTimeForSelection = () => {
    return getDefaultTimeByCalendarDay(selectedDayData);
  };

  const applyDefaultTime = () => {
    const defaults = getDefaultTimeForSelection();
    setMaleStartHour(defaults.startHour);
    setMaleStartMinute(defaults.startMinute);
    setMaleEndHour(defaults.endHour);
    setMaleEndMinute(defaults.endMinute);
    setFemaleStartHour(defaults.startHour);
    setFemaleStartMinute(defaults.startMinute);
    setFemaleEndHour(defaults.endHour);
    setFemaleEndMinute(defaults.endMinute);
  };

  const applyDayScheduleTime = (day: CalendarDay) => {
    const defaults = getDefaultTimeByCalendarDay(day);

    // 기존 스케줄이 있으면 해당 시간으로 설정
    const maleStartTime = splitScheduleTime(
      getScheduleStartTime(day.maleSchedule),
    );
    const maleEndTime = splitScheduleTime(getScheduleEndTime(day.maleSchedule));

    if (maleStartTime && maleEndTime) {
      setMaleStartHour(maleStartTime.hour);
      setMaleStartMinute(maleStartTime.minute);
      setMaleEndHour(maleEndTime.hour);
      setMaleEndMinute(maleEndTime.minute);
    } else {
      resetMaleTime(defaults);
    }

    const femaleStartTime = splitScheduleTime(
      getScheduleStartTime(day.femaleSchedule),
    );
    const femaleEndTime = splitScheduleTime(
      getScheduleEndTime(day.femaleSchedule),
    );

    if (femaleStartTime && femaleEndTime) {
      setFemaleStartHour(femaleStartTime.hour);
      setFemaleStartMinute(femaleStartTime.minute);
      setFemaleEndHour(femaleEndTime.hour);
      setFemaleEndMinute(femaleEndTime.minute);
    } else {
      resetFemaleTime(defaults);
    }
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setActiveQuickSelection(null);

    setSelectedDates((prev) => {
      if (prev.includes(day.fullDate)) {
        return [];
      }

      applyDayScheduleTime(day);
      return [day.fullDate];
    });
  };

  const selectDateGroup = (
    mode: QuickSelectionMode,
    dayMatcher: (day: CalendarDay) => boolean,
  ) => {
    const dates = calendarDays
      .filter((day) => day.isCurrentMonth && dayMatcher(day))
      .map((day) => day.fullDate);

    const nextDateSet = new Set(dates);
    const isSameSelection =
      dates.length > 0 &&
      activeQuickSelection === mode &&
      selectedDates.length === dates.length &&
      selectedDates.every((date) => nextDateSet.has(date));

    if (isSameSelection) {
      setSelectedDates([]);
      setActiveQuickSelection(null);
      return;
    }

    setSelectedDates(dates);
    setActiveQuickSelection(mode);

    const firstDay = calendarDays.find((day) => day.fullDate === dates[0]);
    if (firstDay) {
      const defaults = getDefaultTimeByCalendarDay(firstDay);
      resetMaleTime(defaults);
      resetFemaleTime(defaults);
    }
  };

  const handleSelectSundays = () => {
    selectDateGroup('sunday', (day) => day.dayOfWeek === 0);
  };

  const handleSelectSchoolWeekdays = () => {
    selectDateGroup(
      'schoolWeekdays',
      (day) => day.dayOfWeek >= 1 && day.dayOfWeek <= 4,
    );
  };

  const handleSelectRedDays = () => {
    selectDateGroup('redDay', (day) => day.isRedDay && day.dayOfWeek <= 4);
  };

  // 시간 초기화 함수
  const resetMaleTime = (defaults = getDefaultTimeForSelection()) => {
    setMaleStartHour(defaults.startHour);
    setMaleStartMinute(defaults.startMinute);
    setMaleEndHour(defaults.endHour);
    setMaleEndMinute(defaults.endMinute);
  };

  const resetFemaleTime = (defaults = getDefaultTimeForSelection()) => {
    setFemaleStartHour(defaults.startHour);
    setFemaleStartMinute(defaults.startMinute);
    setFemaleEndHour(defaults.endHour);
    setFemaleEndMinute(defaults.endMinute);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDates([]);
    setActiveQuickSelection(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDates([]);
    setActiveQuickSelection(null);
  };

  const showSelectDateAlert = () => {
    setConfirmModal({
      isOpen: true,
      title: '알림',
      message: '날짜를 선택해주세요.',
      confirmText: '확인',
      onConfirm: () =>
        setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const getGenderTime = (gender: Gender) => {
    const isMALE = gender === 'MALE';
    return {
      startTime: isMALE
        ? `${maleStartHour.padStart(2, '0')}:${maleStartMinute.padStart(2, '0')}`
        : `${femaleStartHour.padStart(2, '0')}:${femaleStartMinute.padStart(2, '0')}`,
      endTime: isMALE
        ? `${maleEndHour.padStart(2, '0')}:${maleEndMinute.padStart(2, '0')}`
        : `${femaleEndHour.padStart(2, '0')}:${femaleEndMinute.padStart(2, '0')}`,
    };
  };

  const hasSchedule = (date: string, gender: Gender) => {
    const day = calendarDays.find((calendarDay) => calendarDay.fullDate === date);
    return gender === 'MALE' ? !!day?.maleSchedule : !!day?.femaleSchedule;
  };

  const handleApplySchedules = async (genders: Gender[]) => {
    if (selectedDates.length === 0) {
      showSelectDateAlert();
      return;
    }

    const total = selectedDates.length * genders.length;
    let completedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let failCount = 0;
    const genderName =
      genders.length > 1
        ? '남/여 기숙사'
        : genders[0] === 'MALE'
          ? '남기숙사'
          : '여기숙사';

    setLoadingModal({
      isOpen: true,
      title: `${genderName} 일정 적용 중...`,
      current: 0,
      total,
      action: 'update',
    });

    const promises = genders.flatMap((gender) => {
      const { startTime, endTime } = getGenderTime(gender);

      return selectedDates.map(async (date) => {
        const shouldUpdate = hasSchedule(date, gender);

        try {
          if (shouldUpdate) {
            await scheduleService.updateSchedule(date, gender, {
              startTime,
              endTime,
            });
            updatedCount++;
          } else {
            await scheduleService.createSchedule({
              date,
              gender,
              startTime,
              endTime,
            });
            createdCount++;
          }
        } catch {
          failCount++;
        } finally {
          completedCount++;
          setLoadingModal((prev) => ({
            ...prev,
            current: completedCount,
          }));
        }
      });
    });

    await Promise.all(promises);
    setLoadingModal((prev) => ({ ...prev, isOpen: false }));

    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    const resultMessage =
      failCount > 0
        ? `${createdCount}개 생성, ${updatedCount}개 수정 완료\n${failCount}개 실패`
        : `${createdCount}개 생성, ${updatedCount}개 수정 완료`;

    setConfirmModal({
      isOpen: true,
      title: '적용 완료',
      message: resultMessage,
      confirmText: '확인',
      onConfirm: () =>
        setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // 선택 날짜 스케줄 삭제
  const handleDeleteSchedules = (gender: Gender) => {
    if (selectedDates.length === 0) {
      showSelectDateAlert();
      return;
    }

    const genderName = gender === 'MALE' ? '남기숙사' : '여기숙사';
    const targetDates = selectedDates.filter((date) => hasSchedule(date, gender));

    if (targetDates.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: '삭제할 일정 없음',
        message: `선택한 날짜에 ${genderName} 일정이 없습니다.`,
        confirmText: '확인',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '삭제 확인',
      message:
        targetDates.length === 1
          ? `${genderName} 스케줄을 삭제하시겠습니까?`
          : `선택한 ${targetDates.length}일의 ${genderName} 스케줄을 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));

        setLoadingModal({
          isOpen: true,
          title: `${genderName} 일정 삭제 중...`,
          current: 0,
          total: targetDates.length,
          action: 'delete',
        });

        let completedCount = 0;
        let failCount = 0;

        await Promise.all(
          targetDates.map(async (date) => {
            try {
              await scheduleService.deleteSchedule(date, gender);
            } catch {
              failCount++;
            } finally {
              completedCount++;
              setLoadingModal((prev) => ({
                ...prev,
                current: completedCount,
              }));
            }
          }),
        );

        setLoadingModal((prev) => ({ ...prev, isOpen: false }));
        queryClient.invalidateQueries({ queryKey: ['schedules'] });

        setConfirmModal({
          isOpen: true,
          title: '삭제 완료',
          message:
            failCount > 0
              ? `${targetDates.length - failCount}개 삭제 완료\n${failCount}개 실패`
              : `${targetDates.length}개 삭제 완료`,
          confirmText: '확인',
          onConfirm: () =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false })),
        });
      },
    });
  };

  const formatTimeInputValue = (hour: string, minute: string) =>
    `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  const formatManualTimeValue = (hour: string, minute: string) => {
    if (!hour && !minute) return '';
    if (hour.length < 2 && !minute) return hour;
    return `${hour}:${minute}`;
  };

  const setTimeValue = (
    time: string,
    setHour: (value: string) => void,
    setMinute: (value: string) => void,
  ) => {
    const [hour, minute] = time.split(':');
    setHour(hour);
    setMinute(minute);
  };

  const handleManualTimeChange = (
    value: string,
    setHour: (value: string) => void,
    setMinute: (value: string) => void,
  ) => {
    const normalized = value.replace(/[^\d:]/g, '').slice(0, 5);
    const [rawHour = '', rawMinute = ''] = normalized.includes(':')
      ? normalized.split(':')
      : [normalized.slice(0, 2), normalized.slice(2, 4)];
    const hour = rawHour.slice(0, 2);
    const minute = rawMinute.slice(0, 2);

    setHour(hour);
    setMinute(minute);
  };

  const normalizeManualTime = (
    hour: string,
    minute: string,
    setHour: (value: string) => void,
    setMinute: (value: string) => void,
  ) => {
    const nextHour = Math.min(23, Math.max(0, Number(hour) || 0));
    const nextMinute = Math.min(59, Math.max(0, Number(minute) || 0));
    setHour(String(nextHour).padStart(2, '0'));
    setMinute(String(nextMinute).padStart(2, '0'));
  };

  const renderTimeControl = (
    label: string,
    hour: string,
    minute: string,
    setHour: (value: string) => void,
    setMinute: (value: string) => void,
  ) => {
    const presets = label.includes('시작') ? ['16:00'] : ['21:10', '22:15'];

    return (
      <div className="time-control" aria-label={label}>
        <input
          className="time-manual-input"
          value={formatManualTimeValue(hour, minute)}
          inputMode="numeric"
          placeholder="HH:MM"
          onChange={(event) =>
            handleManualTimeChange(event.target.value, setHour, setMinute)
          }
          onBlur={() => normalizeManualTime(hour, minute, setHour, setMinute)}
          aria-label={`${label} 직접 입력`}
        />
        <div className="time-preset-row">
          {presets.map((time) => (
            <button
              key={time}
              type="button"
              className={`time-preset-btn ${
                formatTimeInputValue(hour, minute) === time ? 'active' : ''
              }`}
              onClick={() => setTimeValue(time, setHour, setMinute)}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${year}. ${month}. ${day}.`;
  };

  const sundayDates = calendarDays
    .filter((day) => day.isCurrentMonth && day.dayOfWeek === 0)
    .map((day) => day.fullDate);
  const redDayDates = calendarDays
    .filter(
      (day) => day.isCurrentMonth && day.isRedDay && day.dayOfWeek <= 4,
    )
    .map((day) => day.fullDate);
  const schoolWeekdayDates = calendarDays
    .filter(
      (day) =>
        day.isCurrentMonth &&
        !day.isRedDay &&
        day.dayOfWeek >= 1 &&
        day.dayOfWeek <= 4,
    )
    .map((day) => day.fullDate);
  const selectedDateSet = new Set(selectedDates);
  const isSundaySelectionActive =
    activeQuickSelection === 'sunday' &&
    sundayDates.length > 0 &&
    sundayDates.every((date) => selectedDateSet.has(date)) &&
    selectedDates.length === sundayDates.length;
  const isRedDaySelectionActive =
    activeQuickSelection === 'redDay' &&
    redDayDates.length > 0 &&
    redDayDates.every((date) => selectedDateSet.has(date)) &&
    selectedDates.length === redDayDates.length;
  const isSchoolWeekdaySelectionActive =
    activeQuickSelection === 'schoolWeekdays' &&
    schoolWeekdayDates.length > 0 &&
    schoolWeekdayDates.every((date) => selectedDateSet.has(date)) &&
    selectedDates.length === schoolWeekdayDates.length;
  const selectionTitle =
    selectedDates.length === 0
      ? '날짜를 선택해주세요'
      : selectedDates.length === 1
        ? formatDisplayDate(selectedDates[0])
        : `${selectedDates.length}일 선택됨`;
  // 스켈레톤 캘린더 그리드 생성 (42개 셀)
  const renderSkeletonCalendar = () => (
    <div className="calendar-grid">
      {Array.from({ length: 42 }).map((_, i) => (
        <div key={i} className="calendar-cell skeleton-cell">
          <div className="skeleton-date"></div>
          <div className="skeleton-tags">
            <div className="skeleton-tag"></div>
            <div className="skeleton-tag"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="schedule-page">
      <div className="calendar-container">
        {schedulesError && (
          <div className="schedule-error" role="alert">
            <div>
              <strong>일정 정보를 불러오지 못했습니다.</strong>
              <span>페이지는 계속 사용할 수 있으며, 연결을 확인한 뒤 다시 시도해주세요.</span>
            </div>
            <button type="button" onClick={() => refetchSchedules()}>
              다시 시도
            </button>
          </div>
        )}
        <div className="schedule-hero">
          <div className="calendar-title-row">
            <span className="calendar-title-icon-wrap">
              <CalendarIcon className="calendar-title-icon" />
            </span>
            <div>
              <span className="schedule-kicker">Attendance Schedule</span>
              <h2 className="calendar-title">출석 스케줄 관리</h2>
            </div>
          </div>
          <div className="month-selector">
            <button
              className="nav-button prev"
              onClick={handlePrevMonth}
              aria-label="이전 달"
            >
              ←
            </button>
            <span className="month-text">
              {currentYear}년 {currentMonth}월
            </span>
            <button
              className="nav-button next"
              onClick={handleNextMonth}
              aria-label="다음 달"
            >
              →
            </button>
          </div>
        </div>

        <div className="calendar-quick-select">
          <div className="quick-select-copy">
            <span className="quick-select-label">빠른 선택</span>
            <strong>{selectedDates.length}일 선택</strong>
          </div>
          <div className="quick-select-actions">
            <button
              type="button"
              className={`quick-select-btn sunday ${
                isSundaySelectionActive ? 'active' : ''
              }`}
              onClick={handleSelectSundays}
              disabled={isLoading}
              aria-pressed={isSundaySelectionActive}
            >
              일요일 전체
            </button>
            <button
              type="button"
              className={`quick-select-btn red-day ${
                isRedDaySelectionActive ? 'active' : ''
              }`}
              onClick={handleSelectRedDays}
              disabled={isLoading}
              aria-pressed={isRedDaySelectionActive}
            >
              공휴일 전체
            </button>
            <button
              type="button"
              className={`quick-select-btn ${
                isSchoolWeekdaySelectionActive ? 'active' : ''
              }`}
              onClick={handleSelectSchoolWeekdays}
              disabled={isLoading}
              aria-pressed={isSchoolWeekdaySelectionActive}
            >
              월~목 전체
            </button>
          </div>
        </div>

        <div className="calendar">
          <div className="calendar-weekdays">
            {days.map((day, index) => (
              <div
                key={day}
                className={`weekday ${index === 0 ? 'sunday' : ''} ${index === 6 ? 'saturday' : ''}`}
              >
                {day}
              </div>
            ))}
          </div>

          {isLoading ? (
            renderSkeletonCalendar()
          ) : (
            <div className="calendar-grid">
              {calendarDays.map((day, i) => {
                const isSelected = selectedDates.includes(day.fullDate);
                const hasMaleSchedule = !!day.maleSchedule;
                const hasFemaleSchedule = !!day.femaleSchedule;
                const scheduleTooltip = [
                  day.isHoliday && day.holidayName
                    ? `공휴일 ${day.holidayName}`
                    : '',
                  hasMaleSchedule
                    ? `남기숙사 ${formatScheduleRange(day.maleSchedule, ' ~ ')}`
                    : '',
                  hasFemaleSchedule
                    ? `여기숙사 ${formatScheduleRange(day.femaleSchedule, ' ~ ')}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n');

                return (
                  <div
                    key={i}
                    className={`calendar-cell 
                      ${!day.isCurrentMonth ? 'inactive' : ''} 
                      ${day.isToday ? 'today' : ''} 
                      ${isSelected ? 'selected' : ''} 
                      ${day.isWeekend && day.isCurrentMonth ? 'weekend' : ''}
                      ${day.isRedDay ? 'red-day' : ''}
                      ${day.isSaturday && !day.isRedDay ? 'saturday' : ''}
                      ${day.isHoliday ? 'holiday' : ''}
                    `}
                    onClick={() => handleDateClick(day)}
                    data-schedule-tooltip={scheduleTooltip || undefined}
                    aria-label={`${day.fullDate} ${isSelected ? '선택됨' : ''} ${scheduleTooltip}`}
                  >
                    <div className="calendar-cell-top">
                      <span
                        className={`date-number ${day.isToday ? 'today-number' : ''}`}
                      >
                        {day.date}
                      </span>
                      {day.isCurrentMonth &&
                        (hasMaleSchedule || hasFemaleSchedule) && (
                          <div className="schedule-dots">
                            {hasMaleSchedule && (
                              <span className="schedule-dot male"></span>
                            )}
                            {hasFemaleSchedule && (
                              <span className="schedule-dot female"></span>
                            )}
                          </div>
                        )}
                    </div>
                    {day.isHoliday && day.holidayName && (
                      <span className="holiday-label">{day.holidayName}</span>
                    )}
                    {day.isCurrentMonth && (
                      <>
                        <div className="schedule-indicators">
                          {hasMaleSchedule && (
                            <div className="schedule-tag male">
                              <span>남</span>
                              <span className="schedule-tag-time">
                                {formatScheduleRange(day.maleSchedule)}
                              </span>
                            </div>
                          )}
                          {hasFemaleSchedule && (
                            <div className="schedule-tag female">
                              <span>여</span>
                              <span className="schedule-tag-time">
                                {formatScheduleRange(day.femaleSchedule)}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="scheduler-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Schedule editor</span>
            <h3 className="scheduler-title">{selectionTitle}</h3>
          </div>
          <button
            className="selection-tool-btn"
            onClick={() => {
              setSelectedDates([]);
              setActiveQuickSelection(null);
            }}
            disabled={selectedDates.length === 0}
          >
            선택 해제
          </button>
        </div>

        {selectedDates.length > 0 ? (
          <div className="schedule-workbench">
            <div className="workbench-heading">
              <div>
                <span className="quick-apply-label">시간 설정</span>
                <p>남/여 기숙사 시간을 한 화면에서 조정합니다.</p>
              </div>
              <button
                className="ghost-reset-btn"
                onClick={() => {
                  applyDefaultTime();
                }}
                type="button"
              >
                기본값
              </button>
            </div>

            <div className="time-table">
              <div className="time-table-head">
                <span>기숙사</span>
                <span>시작</span>
                <span>종료</span>
                <span>작업</span>
              </div>

              <div className="time-table-row male">
                <div className="dormitory-cell">
                  <span className="gender-badge male">남기숙사</span>
                  {selectedDates.length === 1 &&
                    selectedDayData?.maleSchedule && (
                      <small>
                        현재 {formatScheduleRange(
                          selectedDayData.maleSchedule,
                          '-',
                        )}
                      </small>
                    )}
                </div>
                <div className="time-range-cell">
                  {renderTimeControl(
                    '남기숙사 시작 시간',
                    maleStartHour,
                    maleStartMinute,
                    setMaleStartHour,
                    setMaleStartMinute,
                  )}
                  <span className="time-range-mark">~</span>
                  {renderTimeControl(
                    '남기숙사 종료 시간',
                    maleEndHour,
                    maleEndMinute,
                    setMaleEndHour,
                    setMaleEndMinute,
                  )}
                </div>
                <div className="row-actions">
                  <button
                    className="row-apply-btn"
                    onClick={() => handleApplySchedules(['MALE'])}
                    disabled={loadingModal.isOpen}
                  >
                    적용
                  </button>
                  <button
                    className="row-delete-btn"
                    onClick={() => handleDeleteSchedules('MALE')}
                    disabled={loadingModal.isOpen}
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="time-table-row female">
                <div className="dormitory-cell">
                  <span className="gender-badge female">여기숙사</span>
                  {selectedDates.length === 1 &&
                    selectedDayData?.femaleSchedule && (
                      <small>
                        현재{' '}
                        {formatScheduleRange(
                          selectedDayData.femaleSchedule,
                          '-',
                        )}
                      </small>
                    )}
                </div>
                <div className="time-range-cell">
                  {renderTimeControl(
                    '여기숙사 시작 시간',
                    femaleStartHour,
                    femaleStartMinute,
                    setFemaleStartHour,
                    setFemaleStartMinute,
                  )}
                  <span className="time-range-mark">~</span>
                  {renderTimeControl(
                    '여기숙사 종료 시간',
                    femaleEndHour,
                    femaleEndMinute,
                    setFemaleEndHour,
                    setFemaleEndMinute,
                  )}
                </div>
                <div className="row-actions">
                  <button
                    className="row-apply-btn"
                    onClick={() => handleApplySchedules(['FEMALE'])}
                    disabled={loadingModal.isOpen}
                  >
                    적용
                  </button>
                  <button
                    className="row-delete-btn"
                    onClick={() => handleDeleteSchedules('FEMALE')}
                    disabled={loadingModal.isOpen}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-selection">
            <p>날짜를 선택해주세요.</p>
            <p className="hint">
              날짜를 클릭하면 남/여 시간을 설정할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 로딩 모달 */}
      {loadingModal.isOpen && (
        <div className="loading-modal-overlay">
          <div className="loading-modal">
            <div className="loading-modal-spinner"></div>
            <h3 className="loading-modal-title">{loadingModal.title}</h3>
            <div className="loading-modal-progress">
              <div
                className="loading-modal-progress-bar"
                style={{
                  width: `${(loadingModal.current / loadingModal.total) * 100}%`,
                }}
              ></div>
            </div>
            <p className="loading-modal-text">
              {loadingModal.current} / {loadingModal.total} (
              {Math.round((loadingModal.current / loadingModal.total) * 100)}%)
            </p>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
