import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { scheduleService } from '../services/schedule.service';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/Schedule.css';
import {
  CalendarIcon,
  MoonIcon,
  PencilIcon,
  SunIcon,
  TrashIcon,
} from '../components/Icons';
import { getKoreanHolidayName } from '../constants/koreanHolidays';
import type {
  AttendanceScheduleResponse,
  Gender,
} from '../types/api';
import { formatLocalDate } from '../utils/date';

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

type QuickSelectionMode = 'all' | 'sunday' | 'redDay' | 'schoolWeekdays';
type EditorTarget = Gender | 'ALL';

interface CompleteScheduleTime {
  morningStartTime: string;
  morningEndTime: string;
  nightStartTime: string;
  nightEndTime: string;
}

const getScheduleRequestError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    const status = error.response?.status;
    const message = data?.message || data?.error || error.message;
    return status ? `${status} ${message}` : message;
  }

  return error instanceof Error ? error.message : '알 수 없는 오류';
};

const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;

const getScheduleStartTime = (
  schedule?: AttendanceScheduleResponse,
): string | undefined => schedule?.nightStartTime;

const getScheduleEndTime = (
  schedule?: AttendanceScheduleResponse,
): string | undefined => schedule?.nightEndTime;

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

const formatMorningScheduleRange = (
  schedule?: AttendanceScheduleResponse,
  separator = '~',
) => {
  if (!schedule?.morningStartTime || !schedule.morningEndTime) {
    return '미설정';
  }

  return `${formatTime(schedule.morningStartTime)}${separator}${formatTime(schedule.morningEndTime)}`;
};

// 기본 시간 상수
const MORNING_START_HOUR = '06';
const MORNING_START_MINUTE = '50';
const MORNING_END_HOUR = '08';
const MORNING_END_MINUTE = '05';
const DEFAULT_START_HOUR = '16';
const DEFAULT_START_MINUTE = '00';
const WEEKDAY_END_HOUR = '21';
const WEEKDAY_END_MINUTE = '10';
const SUNDAY_END_HOUR = '21';
const SUNDAY_END_MINUTE = '10';

const DEFAULT_COMPLETE_SCHEDULE: CompleteScheduleTime = {
  morningStartTime: '06:50',
  morningEndTime: '08:05',
  nightStartTime: '16:00',
  nightEndTime: '21:10',
};

const SCHEDULE_APPLY_CONCURRENCY = 4;

export default function Schedule() {
  const today = new Date();
  const todayStr = formatLocalDate(today);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [activeEditorTarget, setActiveEditorTarget] =
    useState<EditorTarget>('ALL');
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

  // 남기숙사 아침 퇴실 시간 상태
  const [maleMorningStartHour, setMaleMorningStartHour] =
    useState(MORNING_START_HOUR);
  const [maleMorningStartMinute, setMaleMorningStartMinute] =
    useState(MORNING_START_MINUTE);
  const [maleMorningEndHour, setMaleMorningEndHour] =
    useState(MORNING_END_HOUR);
  const [maleMorningEndMinute, setMaleMorningEndMinute] =
    useState(MORNING_END_MINUTE);

  // 남기숙사 저녁 입실 시간 상태
  const [maleStartHour, setMaleStartHour] = useState(DEFAULT_START_HOUR);
  const [maleStartMinute, setMaleStartMinute] = useState(DEFAULT_START_MINUTE);
  const [maleEndHour, setMaleEndHour] = useState(WEEKDAY_END_HOUR);
  const [maleEndMinute, setMaleEndMinute] = useState(WEEKDAY_END_MINUTE);

  // 여기숙사 아침 퇴실 시간 상태
  const [femaleMorningStartHour, setFemaleMorningStartHour] =
    useState(MORNING_START_HOUR);
  const [femaleMorningStartMinute, setFemaleMorningStartMinute] =
    useState(MORNING_START_MINUTE);
  const [femaleMorningEndHour, setFemaleMorningEndHour] =
    useState(MORNING_END_HOUR);
  const [femaleMorningEndMinute, setFemaleMorningEndMinute] =
    useState(MORNING_END_MINUTE);

  // 여기숙사 저녁 입실 시간 상태
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
    setMaleMorningStartHour(MORNING_START_HOUR);
    setMaleMorningStartMinute(MORNING_START_MINUTE);
    setMaleMorningEndHour(MORNING_END_HOUR);
    setMaleMorningEndMinute(MORNING_END_MINUTE);
    setMaleStartHour(defaults.startHour);
    setMaleStartMinute(defaults.startMinute);
    setMaleEndHour(defaults.endHour);
    setMaleEndMinute(defaults.endMinute);
    setFemaleMorningStartHour(MORNING_START_HOUR);
    setFemaleMorningStartMinute(MORNING_START_MINUTE);
    setFemaleMorningEndHour(MORNING_END_HOUR);
    setFemaleMorningEndMinute(MORNING_END_MINUTE);
    setFemaleStartHour(defaults.startHour);
    setFemaleStartMinute(defaults.startMinute);
    setFemaleEndHour(defaults.endHour);
    setFemaleEndMinute(defaults.endMinute);
  };

  const applyDayScheduleTime = (day: CalendarDay) => {
    const defaults = getDefaultTimeByCalendarDay(day);

    const maleMorningStartTime = splitScheduleTime(
      day.maleSchedule?.morningStartTime,
    );
    const maleMorningEndTime = splitScheduleTime(
      day.maleSchedule?.morningEndTime,
    );

    if (maleMorningStartTime && maleMorningEndTime) {
      setMaleMorningStartHour(maleMorningStartTime.hour);
      setMaleMorningStartMinute(maleMorningStartTime.minute);
      setMaleMorningEndHour(maleMorningEndTime.hour);
      setMaleMorningEndMinute(maleMorningEndTime.minute);
    } else {
      setMaleMorningStartHour(MORNING_START_HOUR);
      setMaleMorningStartMinute(MORNING_START_MINUTE);
      setMaleMorningEndHour(MORNING_END_HOUR);
      setMaleMorningEndMinute(MORNING_END_MINUTE);
    }

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
      setMaleStartHour(defaults.startHour);
      setMaleStartMinute(defaults.startMinute);
      setMaleEndHour(defaults.endHour);
      setMaleEndMinute(defaults.endMinute);
    }

    const femaleMorningStartTime = splitScheduleTime(
      day.femaleSchedule?.morningStartTime,
    );
    const femaleMorningEndTime = splitScheduleTime(
      day.femaleSchedule?.morningEndTime,
    );

    if (femaleMorningStartTime && femaleMorningEndTime) {
      setFemaleMorningStartHour(femaleMorningStartTime.hour);
      setFemaleMorningStartMinute(femaleMorningStartTime.minute);
      setFemaleMorningEndHour(femaleMorningEndTime.hour);
      setFemaleMorningEndMinute(femaleMorningEndTime.minute);
    } else {
      setFemaleMorningStartHour(MORNING_START_HOUR);
      setFemaleMorningStartMinute(MORNING_START_MINUTE);
      setFemaleMorningEndHour(MORNING_END_HOUR);
      setFemaleMorningEndMinute(MORNING_END_MINUTE);
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
      setFemaleStartHour(defaults.startHour);
      setFemaleStartMinute(defaults.startMinute);
      setFemaleEndHour(defaults.endHour);
      setFemaleEndMinute(defaults.endMinute);
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
      setActiveEditorTarget(
        day.maleSchedule && !day.femaleSchedule
          ? 'MALE'
          : day.femaleSchedule && !day.maleSchedule
            ? 'FEMALE'
            : 'ALL',
      );
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
    setActiveEditorTarget('ALL');

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

  const handleSelectAll = () => {
    selectDateGroup('all', () => true);
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
    setMaleMorningStartHour(MORNING_START_HOUR);
    setMaleMorningStartMinute(MORNING_START_MINUTE);
    setMaleMorningEndHour(MORNING_END_HOUR);
    setMaleMorningEndMinute(MORNING_END_MINUTE);
    setMaleStartHour(defaults.startHour);
    setMaleStartMinute(defaults.startMinute);
    setMaleEndHour(defaults.endHour);
    setMaleEndMinute(defaults.endMinute);
  };

  const resetFemaleTime = (defaults = getDefaultTimeForSelection()) => {
    setFemaleMorningStartHour(MORNING_START_HOUR);
    setFemaleMorningStartMinute(MORNING_START_MINUTE);
    setFemaleMorningEndHour(MORNING_END_HOUR);
    setFemaleMorningEndMinute(MORNING_END_MINUTE);
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

  const getCompleteGenderTime = (gender: Gender) => {
    const isMALE = gender === 'MALE';
    return {
      morningStartTime: isMALE
        ? `${maleMorningStartHour.padStart(2, '0')}:${maleMorningStartMinute.padStart(2, '0')}`
        : `${femaleMorningStartHour.padStart(2, '0')}:${femaleMorningStartMinute.padStart(2, '0')}`,
      morningEndTime: isMALE
        ? `${maleMorningEndHour.padStart(2, '0')}:${maleMorningEndMinute.padStart(2, '0')}`
        : `${femaleMorningEndHour.padStart(2, '0')}:${femaleMorningEndMinute.padStart(2, '0')}`,
      nightStartTime: isMALE
        ? `${maleStartHour.padStart(2, '0')}:${maleStartMinute.padStart(2, '0')}`
        : `${femaleStartHour.padStart(2, '0')}:${femaleStartMinute.padStart(2, '0')}`,
      nightEndTime: isMALE
        ? `${maleEndHour.padStart(2, '0')}:${maleEndMinute.padStart(2, '0')}`
        : `${femaleEndHour.padStart(2, '0')}:${femaleEndMinute.padStart(2, '0')}`,
    };
  };

  const getSchedule = (date: string, gender: Gender) => {
    const day = calendarDays.find((calendarDay) => calendarDay.fullDate === date);
    return gender === 'MALE' ? day?.maleSchedule : day?.femaleSchedule;
  };

  const hasSchedule = (date: string, gender: Gender) =>
    !!getSchedule(date, gender);

  const handleApplyCompleteSchedule = async (
    target = activeEditorTarget,
    override?: CompleteScheduleTime,
  ) => {
    if (selectedDates.length === 0) {
      showSelectDateAlert();
      return;
    }

    const genders: Gender[] =
      target === 'ALL' ? ['MALE', 'FEMALE'] : [target];
    const sourceGender: Gender = target === 'FEMALE' ? 'FEMALE' : 'MALE';
    const completeTime = override ?? getCompleteGenderTime(sourceGender);
    const total = selectedDates.length * genders.length;
    let completedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let failCount = 0;
    let firstErrorMessage = '';
    const targetName =
      target === 'ALL'
        ? '남/여 기숙사'
        : target === 'MALE'
          ? '남기숙사'
          : '여기숙사';

    setLoadingModal({
      isOpen: true,
      title: `${targetName} 일정 적용 중...`,
      current: 0,
      total,
      action: 'update',
    });

    const tasks = genders.flatMap((gender) =>
      selectedDates.map((date) => async () => {
        const existingSchedule = getSchedule(date, gender);
        const calendarDay = calendarDays.find(
          (day) => day.fullDate === date,
        );
        const isWeekend =
          calendarDay?.dayOfWeek === 0 || calendarDay?.dayOfWeek === 6;
        const scheduleTime = isWeekend
          ? {
              nightStartTime: completeTime.nightStartTime,
              nightEndTime: completeTime.nightEndTime,
            }
          : completeTime;

        try {
          if (existingSchedule) {
            await scheduleService.updateSchedule(date, gender, scheduleTime);
            updatedCount++;
          } else {
            await scheduleService.createSchedule({
              date,
              gender,
              ...scheduleTime,
            });
            createdCount++;
          }
        } catch (error) {
          failCount++;
          if (!firstErrorMessage) {
            firstErrorMessage = getScheduleRequestError(error);
          }
        } finally {
          completedCount++;
          setLoadingModal((prev) => ({
            ...prev,
            current: completedCount,
          }));
        }
      }),
    );

    let nextTaskIndex = 0;
    const runWorker = async () => {
      while (nextTaskIndex < tasks.length) {
        const task = tasks[nextTaskIndex++];
        await task();
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(SCHEDULE_APPLY_CONCURRENCY, tasks.length) },
        runWorker,
      ),
    );
    setLoadingModal((prev) => ({ ...prev, isOpen: false }));

    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    const resultMessage =
      failCount > 0
        ? `${createdCount}개 생성, ${updatedCount}개 수정 완료\n${failCount}개 실패\n${firstErrorMessage}`
        : `${createdCount}개 생성, ${updatedCount}개 수정 완료`;

    setConfirmModal({
      isOpen: true,
      title: '일정 적용 완료',
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

  const setTimeValue = (
    time: string,
    setHour: (value: string) => void,
    setMinute: (value: string) => void,
  ) => {
    const [hour, minute] = time.split(':');
    setHour(hour);
    setMinute(minute);
  };

  const renderCompactTimeInput = (
    label: string,
    hour: string,
    minute: string,
    setHour: (value: string) => void,
    setMinute: (value: string) => void,
    disabled = false,
  ) => (
    <label className="compact-time-field">
      <span>{label}</span>
      <input
        type="time"
        value={formatTimeInputValue(hour, minute)}
        onChange={(event) =>
          setTimeValue(event.target.value, setHour, setMinute)
        }
        aria-label={label}
        disabled={disabled}
      />
    </label>
  );

  const sundayDates = calendarDays
    .filter((day) => day.isCurrentMonth && day.dayOfWeek === 0)
    .map((day) => day.fullDate);
  const allDates = calendarDays
    .filter((day) => day.isCurrentMonth)
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
  const isAllSelectionActive =
    activeQuickSelection === 'all' &&
    allDates.length > 0 &&
    allDates.every((date) => selectedDateSet.has(date)) &&
    selectedDates.length === allDates.length;
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
        ? new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          }).format(new Date(`${selectedDates[0]}T00:00:00`))
        : `${selectedDates.length}일 선택됨`;
  const selectedScheduleCount = [
    selectedDayData?.maleSchedule,
    selectedDayData?.femaleSchedule,
  ].filter(Boolean).length;
  const selectionSubtitle =
    selectedDates.length === 0
      ? '달력에서 관리할 날짜를 선택하세요.'
      : selectedDates.length === 1
        ? `등록된 기숙사 일정 ${selectedScheduleCount}개`
        : '선택한 날짜에 일정을 일괄 적용합니다.';
  const hasSelectedWeekday = selectedDates.some((date) => {
    const day = calendarDays.find((calendarDay) => calendarDay.fullDate === date);
    return !!day && day.dayOfWeek >= 1 && day.dayOfWeek <= 5;
  });

  const renderSelectedScheduleCard = (gender: Gender) => {
    const isMale = gender === 'MALE';
    const schedule = isMale
      ? selectedDayData?.maleSchedule
      : selectedDayData?.femaleSchedule;
    const genderName = isMale ? '남기숙사' : '여기숙사';

    if (!schedule) {
      return (
        <button
          type="button"
          className={`selected-schedule-empty ${isMale ? 'male' : 'female'}`}
          onClick={() => setActiveEditorTarget(gender)}
        >
          <span>+</span>
          {genderName} 일정 추가
        </button>
      );
    }

    return (
      <article
        className={`selected-schedule-card ${isMale ? 'male' : 'female'}`}
      >
        <div className="selected-schedule-card-header">
          <span className={`gender-badge ${isMale ? 'male' : 'female'}`}>
            {genderName}
          </span>
          <span className="schedule-configured-badge">설정됨</span>
          <button
            type="button"
            className="selected-schedule-delete"
            onClick={() => handleDeleteSchedules(gender)}
            aria-label={`${genderName} 일정 삭제`}
            title="아침·저녁 일정을 모두 삭제합니다."
          >
            <TrashIcon />
          </button>
        </div>

        <button
          type="button"
          className="selected-period-row morning"
          onClick={() => setActiveEditorTarget(gender)}
        >
          <span className="selected-period-icon">
            <SunIcon />
          </span>
          <span>
            <strong>아침 퇴실</strong>
            <small>{formatMorningScheduleRange(schedule, '–')}</small>
          </span>
          <PencilIcon />
        </button>

        <button
          type="button"
          className="selected-period-row night"
          onClick={() => setActiveEditorTarget(gender)}
        >
          <span className="selected-period-icon">
            <MoonIcon />
          </span>
          <span>
            <strong>저녁 입실</strong>
            <small>{formatScheduleRange(schedule, '–')}</small>
          </span>
          <PencilIcon />
        </button>
      </article>
    );
  };

  const renderCombinedScheduleEditor = (target: EditorTarget) => {
    const sourceGender: Gender = target === 'FEMALE' ? 'FEMALE' : 'MALE';
    const isMaleSource = sourceGender === 'MALE';
    const targetName =
      target === 'ALL'
        ? '일괄 적용'
        : target === 'MALE'
          ? '남기숙사'
          : '여기숙사';
    const targetClass =
      target === 'ALL' ? 'all' : target === 'MALE' ? 'male' : 'female';
    const morningDraft = isMaleSource
      ? {
          startHour: maleMorningStartHour,
          startMinute: maleMorningStartMinute,
          endHour: maleMorningEndHour,
          endMinute: maleMorningEndMinute,
          setStartHour: setMaleMorningStartHour,
          setStartMinute: setMaleMorningStartMinute,
          setEndHour: setMaleMorningEndHour,
          setEndMinute: setMaleMorningEndMinute,
        }
      : {
          startHour: femaleMorningStartHour,
          startMinute: femaleMorningStartMinute,
          endHour: femaleMorningEndHour,
          endMinute: femaleMorningEndMinute,
          setStartHour: setFemaleMorningStartHour,
          setStartMinute: setFemaleMorningStartMinute,
          setEndHour: setFemaleMorningEndHour,
          setEndMinute: setFemaleMorningEndMinute,
        };
    const nightDraft = isMaleSource
      ? {
          startHour: maleStartHour,
          startMinute: maleStartMinute,
          endHour: maleEndHour,
          endMinute: maleEndMinute,
          setStartHour: setMaleStartHour,
          setStartMinute: setMaleStartMinute,
          setEndHour: setMaleEndHour,
          setEndMinute: setMaleEndMinute,
        }
      : {
          startHour: femaleStartHour,
          startMinute: femaleStartMinute,
          endHour: femaleEndHour,
          endMinute: femaleEndMinute,
          setStartHour: setFemaleStartHour,
          setStartMinute: setFemaleStartMinute,
          setEndHour: setFemaleEndHour,
          setEndMinute: setFemaleEndMinute,
        };

    const renderTimeRange = (
      draft: typeof morningDraft,
      disabled = false,
    ) => (
      <div className="combined-time-range">
        {renderCompactTimeInput(
          '시작 시간',
          draft.startHour,
          draft.startMinute,
          draft.setStartHour,
          draft.setStartMinute,
          disabled,
        )}
        <span className="compact-time-separator">–</span>
        {renderCompactTimeInput(
          '종료 시간',
          draft.endHour,
          draft.endMinute,
          draft.setEndHour,
          draft.setEndMinute,
          disabled,
        )}
      </div>
    );

    return (
      <div className={`combined-schedule-editor ${targetClass}`}>
        <div className="combined-editor-heading">
          <span className={`gender-badge ${targetClass}`}>{targetName}</span>
          <span>아침과 저녁 시간을 한 번에 저장합니다.</span>
        </div>

        <div className="combined-period-list">
          <section
            className={`combined-period-card morning ${
              hasSelectedWeekday ? '' : 'disabled'
            }`}
          >
            <div className="combined-period-heading">
              <span className="selected-period-icon">
                <SunIcon />
              </span>
              <div>
                <strong>아침 퇴실</strong>
                <small>
                  {hasSelectedWeekday
                    ? '평일에 적용됩니다.'
                    : '주말에는 적용되지 않습니다.'}
                </small>
              </div>
            </div>
            {renderTimeRange(morningDraft, !hasSelectedWeekday)}
          </section>

          <section className="combined-period-card night">
            <div className="combined-period-heading">
              <span className="selected-period-icon">
                <MoonIcon />
              </span>
              <div>
                <strong>저녁 입실</strong>
                <small>선택한 모든 날짜에 적용됩니다.</small>
              </div>
            </div>
            {renderTimeRange(nightDraft)}
          </section>
        </div>
      </div>
    );
  };

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
    <div
      className={`schedule-page ${
        selectedDates.length === 0 ? 'no-selection-mode' : 'has-selection'
      }`}
    >
      {schedulesError && (
        <div className="schedule-error" role="alert">
          <div>
            <strong>일정 정보를 불러오지 못했습니다.</strong>
            <span>
              페이지는 계속 사용할 수 있으며, 연결을 확인한 뒤 다시 시도해주세요.
            </span>
          </div>
          <button type="button" onClick={() => refetchSchedules()}>
            다시 시도
          </button>
        </div>
      )}

      <section className="schedule-hero">
        <div className="calendar-title-row">
          <span className="calendar-title-icon-wrap">
            <CalendarIcon className="calendar-title-icon" />
          </span>
          <div>
            <span className="schedule-kicker">Attendance Schedule</span>
            <h2 className="calendar-title">출석 스케줄 관리</h2>
            <p className="schedule-description">
              날짜를 선택하고 기숙사별 퇴실·입실 시간을 관리하세요.
            </p>
          </div>
        </div>
        <div className="schedule-hero-summary">
          <span>{currentYear}년 {currentMonth}월</span>
          <strong>{schedulesData?.length ?? 0}개 일정</strong>
        </div>
      </section>

      <section className="schedule-bulk-tools" aria-label="일정 빠른 관리">
        <div className="calendar-quick-select">
          <div className="quick-select-copy">
            <span className="quick-select-label">빠른 선택</span>
            <strong>{selectedDates.length}일 선택</strong>
          </div>
          <div className="quick-select-actions">
            <button
              type="button"
              className={`quick-select-btn all ${
                isAllSelectionActive ? 'active' : ''
              }`}
              onClick={handleSelectAll}
              disabled={isLoading}
              aria-pressed={isAllSelectionActive}
            >
              모두 선택
            </button>
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

        <div className="quick-schedule-apply">
          <div className="quick-schedule-copy">
            <span>빠른 적용</span>
            <strong>
              {selectedDates.length > 0
                ? `선택한 ${selectedDates.length}일에 기본 일정 적용`
                : '먼저 날짜를 선택해주세요'}
            </strong>
          </div>
          <div className="quick-complete-preview">
            <span className="morning">
              <SunIcon />
              <span>
                <strong>아침 퇴실</strong>
                <small>06:50–08:05</small>
              </span>
            </span>
            <span className="night">
              <MoonIcon />
              <span>
                <strong>저녁 입실</strong>
                <small>16:00–21:10</small>
              </span>
            </span>
          </div>
          <button
            type="button"
            className="quick-complete-apply"
            onClick={() =>
              handleApplyCompleteSchedule('ALL', DEFAULT_COMPLETE_SCHEDULE)
            }
            disabled={selectedDates.length === 0 || loadingModal.isOpen}
          >
            일괄 적용
          </button>
        </div>
      </section>

      <section className="calendar-container" aria-label="월간 일정 달력">
        <div className="calendar-panel-header">
          <div>
            <span>Monthly calendar</span>
            <h3>월간 일정</h3>
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
              {calendarDays.map((day, index) => {
                const isSelected = selectedDates.includes(day.fullDate);
                const hasMaleSchedule = !!day.maleSchedule;
                const hasFemaleSchedule = !!day.femaleSchedule;
                const scheduleMarkers = [
                  hasMaleSchedule ? 'male' : '',
                  hasFemaleSchedule ? 'female' : '',
                ].filter(Boolean);
                const scheduleTooltip = [
                  day.isHoliday && day.holidayName
                    ? `공휴일 ${day.holidayName}`
                    : '',
                  hasMaleSchedule
                    ? `남기숙사\n☀ 아침 퇴실 ${formatMorningScheduleRange(day.maleSchedule, ' ~ ')}\n☾ 저녁 입실 ${formatScheduleRange(day.maleSchedule, ' ~ ')}`
                    : '',
                  hasFemaleSchedule
                    ? `여기숙사\n☀ 아침 퇴실 ${formatMorningScheduleRange(day.femaleSchedule, ' ~ ')}\n☾ 저녁 입실 ${formatScheduleRange(day.femaleSchedule, ' ~ ')}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n');

                return (
                  <button
                    type="button"
                    key={index}
                    className={`calendar-cell
                      ${!day.isCurrentMonth ? 'inactive' : ''}
                      ${day.isToday ? 'today' : ''}
                      ${isSelected ? 'selected' : ''}
                      ${day.isRedDay ? 'red-day' : ''}
                      ${day.isSaturday && !day.isRedDay ? 'saturday' : ''}
                    `}
                    onClick={() => handleDateClick(day)}
                    disabled={!day.isCurrentMonth}
                    data-schedule-tooltip={scheduleTooltip || undefined}
                    aria-label={`${day.fullDate} ${isSelected ? '선택됨' : ''} ${scheduleTooltip}`}
                  >
                    <span
                      className={`date-number ${day.isToday ? 'today-number' : ''}`}
                    >
                      {day.date}
                    </span>
                    {day.holidayName && (
                      <span className="holiday-label">{day.holidayName}</span>
                    )}
                    <span className="calendar-slot-dots" aria-hidden="true">
                      {scheduleMarkers.map((marker, markerIndex) => (
                        <span
                          key={`${day.fullDate}-${marker}-${markerIndex}`}
                          className={`calendar-slot-dot ${marker}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="calendar-legend" aria-label="일정 표시 안내">
          <span className="legend-gender male">남기숙사 일정</span>
          <span className="legend-gender female">여기숙사 일정</span>
          <span className="legend-selected-dot" /> 선택한 날짜
        </div>
      </section>

      <aside className="scheduler-panel">
        <div className="panel-header">
          <div className="detail-title-group">
            <span className="detail-calendar-icon">
              <CalendarIcon />
            </span>
            <div>
              <h3 className="scheduler-title">{selectionTitle}</h3>
              <p>{selectionSubtitle}</p>
            </div>
          </div>
          {selectedDates.length > 0 && (
            <button
              className="selection-tool-btn"
              onClick={() => {
                setSelectedDates([]);
                setActiveQuickSelection(null);
              }}
            >
              선택 해제
            </button>
          )}
        </div>

        {selectedDates.length > 0 ? (
          <>
            {selectedDates.length === 1 ? (
              <div className="selected-schedule-list">
                {renderSelectedScheduleCard('MALE')}
                {renderSelectedScheduleCard('FEMALE')}
              </div>
            ) : (
              <div className="bulk-selection-card">
                <CalendarIcon />
                <div>
                  <strong>{selectedDates.length}일 일괄 설정</strong>
                  <span>아래에서 대상과 전체 시간을 설정해 적용하세요.</span>
                </div>
              </div>
            )}

            <div className="schedule-workbench">
              <div className="workbench-heading">
                <div>
                  <span className="quick-apply-label">일정 설정</span>
                  <p>대상과 아침·저녁 시간을 확인하세요.</p>
                </div>
                <button
                  className="ghost-reset-btn"
                  onClick={applyDefaultTime}
                  type="button"
                >
                  기본값
                </button>
              </div>

              <div
                className="editor-gender-tabs"
                role="tablist"
                aria-label="일정을 적용할 기숙사"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeEditorTarget === 'ALL'}
                  className={activeEditorTarget === 'ALL' ? 'active all' : 'all'}
                  onClick={() => setActiveEditorTarget('ALL')}
                >
                  일괄 적용
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeEditorTarget === 'MALE'}
                  className={
                    activeEditorTarget === 'MALE' ? 'active male' : 'male'
                  }
                  onClick={() => setActiveEditorTarget('MALE')}
                >
                  남기숙사
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeEditorTarget === 'FEMALE'}
                  className={
                    activeEditorTarget === 'FEMALE'
                      ? 'active female'
                      : 'female'
                  }
                  onClick={() => setActiveEditorTarget('FEMALE')}
                >
                  여기숙사
                </button>
              </div>

              {renderCombinedScheduleEditor(activeEditorTarget)}

              <button
                type="button"
                className="complete-schedule-apply-btn"
                onClick={() => handleApplyCompleteSchedule()}
                disabled={loadingModal.isOpen}
              >
                {activeEditorTarget === 'ALL'
                  ? '일괄 적용'
                  : activeEditorTarget === 'MALE'
                    ? '남기숙사 일정 적용'
                    : '여기숙사 일정 적용'}
              </button>
            </div>
          </>
        ) : (
          <div className="no-selection">
            <span className="no-selection-icon">
              <CalendarIcon />
            </span>
            <strong>날짜를 선택해주세요</strong>
            <p>
              왼쪽 달력에서 날짜를 누르면 등록된 일정과 수정 도구가
              표시됩니다.
            </p>
          </div>
        )}

        <div className="schedule-guide">
          <strong>안내</strong>
          <ul>
            <li>달력의 점은 해당 날짜에 등록된 기숙사 일정을 의미합니다.</li>
            <li>아침·저녁 시간을 설정한 뒤 한 번에 적용할 수 있습니다.</li>
            <li>주말에는 저녁 입실만 적용됩니다.</li>
          </ul>
        </div>
      </aside>

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
