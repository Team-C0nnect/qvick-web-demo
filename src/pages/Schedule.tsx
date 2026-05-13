import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services/schedule.service';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/Schedule.css';
import { CalendarIcon } from '../components/Icons';
import type { AttendanceScheduleResponse, Gender } from '../types/api';

interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  dayOfWeek: number; // 0=일요일, 6=토요일
  maleSchedule?: AttendanceScheduleResponse;
  femaleSchedule?: AttendanceScheduleResponse;
}

// 시간 포맷 (HH:mm -> HH:mm, 초 제거)
const formatTime = (time: string) => {
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
};

// 기본 시간 상수
const DEFAULT_START_HOUR = '21';
const DEFAULT_START_MINUTE = '00';
const DEFAULT_END_HOUR = '22';
const DEFAULT_END_MINUTE = '15';

export default function Schedule() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

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
  const [maleEndHour, setMaleEndHour] = useState(DEFAULT_END_HOUR);
  const [maleEndMinute, setMaleEndMinute] = useState(DEFAULT_END_MINUTE);

  // 여기숙사 시간 상태
  const [femaleStartHour, setFemaleStartHour] = useState(DEFAULT_START_HOUR);
  const [femaleStartMinute, setFemaleStartMinute] =
    useState(DEFAULT_START_MINUTE);
  const [femaleEndHour, setFemaleEndHour] = useState(DEFAULT_END_HOUR);
  const [femaleEndMinute, setFemaleEndMinute] = useState(DEFAULT_END_MINUTE);

  // 요일 선택 (월별 일괄 등록용)
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]); // 초기값: 아무것도 선택 안 함

  const queryClient = useQueryClient();

  // Fetch month schedules
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['schedules', 'month', currentYear, currentMonth],
    queryFn: () => scheduleService.getMonthSchedules(currentYear, currentMonth),
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: scheduleService.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => {
      console.error('스케줄 생성 오류:', error);
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: ({
      date,
      gender,
      data,
    }: {
      date: string;
      gender: Gender;
      data: { startTime?: string; endTime?: string };
    }) => scheduleService.updateSchedule(date, gender, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => {
      console.error('스케줄 수정 오류:', error);
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: ({ date, gender }: { date: string; gender: Gender }) =>
      scheduleService.deleteSchedule(date, gender),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => {
      console.error('스케줄 삭제 오류:', error);
    },
  });

  const days = ['일', '월', '화', '수', '목', '금', '토'];

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const result: CalendarDay[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const todayStr = today.toISOString().split('T')[0];

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

      result.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayOfWeek,
      });
    }

    // Current month days
    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const dayOfWeek = (startDayOfWeek + date - 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = fullDate === todayStr;

      result.push({
        date,
        fullDate,
        isCurrentMonth: true,
        isToday,
        isWeekend,
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
      const totalDays = result.length;
      const dayOfWeek = (totalDays + date - 1) % 7;

      result.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayOfWeek,
      });
    }

    return result;
  }, [currentYear, currentMonth, schedulesData]);

  // 선택된 첫번째 날짜의 스케줄 데이터
  const selectedDayData = useMemo(() => {
    if (selectedDates.length === 0) return null;
    const firstDate = selectedDates[0];
    return (
      calendarDays.find((d) => d.fullDate === firstDate && d.isCurrentMonth) ||
      null
    );
  }, [selectedDates, calendarDays]);

  const applyDayScheduleTime = (day: CalendarDay) => {
    // 기존 스케줄이 있으면 해당 시간으로 설정
    if (day.maleSchedule) {
      const [sh, sm] = day.maleSchedule.startTime.split(':');
      const [eh, em] = day.maleSchedule.endTime.split(':');
      setMaleStartHour(sh);
      setMaleStartMinute(sm);
      setMaleEndHour(eh);
      setMaleEndMinute(em);
    } else {
      resetMaleTime();
    }

    if (day.femaleSchedule) {
      const [sh, sm] = day.femaleSchedule.startTime.split(':');
      const [eh, em] = day.femaleSchedule.endTime.split(':');
      setFemaleStartHour(sh);
      setFemaleStartMinute(sm);
      setFemaleEndHour(eh);
      setFemaleEndMinute(em);
    } else {
      resetFemaleTime();
    }
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;

    setSelectedDates((prev) => {
      if (prev.includes(day.fullDate)) {
        const nextDates = prev.filter((date) => date !== day.fullDate);
        if (nextDates.length === 1) {
          const remainingDay = calendarDays.find(
            (calendarDay) => calendarDay.fullDate === nextDates[0],
          );
          if (remainingDay) {
            applyDayScheduleTime(remainingDay);
          }
        }
        return nextDates;
      }

      const nextDates = [...prev, day.fullDate];
      if (nextDates.length === 1) {
        applyDayScheduleTime(day);
      }
      return nextDates;
    });
  };

  // 시간 초기화 함수
  const resetMaleTime = () => {
    setMaleStartHour(DEFAULT_START_HOUR);
    setMaleStartMinute(DEFAULT_START_MINUTE);
    setMaleEndHour(DEFAULT_END_HOUR);
    setMaleEndMinute(DEFAULT_END_MINUTE);
  };

  const resetFemaleTime = () => {
    setFemaleStartHour(DEFAULT_START_HOUR);
    setFemaleStartMinute(DEFAULT_START_MINUTE);
    setFemaleEndHour(DEFAULT_END_HOUR);
    setFemaleEndMinute(DEFAULT_END_MINUTE);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDates([]);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDates([]);
  };

  // 요일 토글 (월별 일괄 등록용)
  const toggleWeekday = (dayIndex: number) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  // 월별 요일 선택 적용
  const applyWeekdaySelection = () => {
    const dates = calendarDays
      .filter((d) => d.isCurrentMonth && selectedWeekdays.includes(d.dayOfWeek))
      .map((d) => d.fullDate);
    setSelectedDates(dates);
  };

  // 요일 선택 헬퍼 함수
  const selectWeekdaysOnly = () => {
    setSelectedWeekdays([1, 2, 3, 4]); // 월~금
  };

  const selectSundayOnly = () => {
    setSelectedWeekdays([0]); // 일요일
  };

  const clearWeekdaySelection = () => {
    setSelectedWeekdays([]); // 요일 선택 해제
    setSelectedDates([]); // 선택된 날짜도 함께 해제
  };

  // 일괄 스케줄 생성 (병렬 처리)
  const handleBulkCreate = async (gender: Gender) => {
    if (selectedDates.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: '알림',
        message: '날짜를 선택해주세요.',
        confirmText: '확인',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const isMALE = gender === 'MALE';
    const genderName = isMALE ? '남기숙사' : '여기숙사';
    const startTime = isMALE
      ? `${maleStartHour.padStart(2, '0')}:${maleStartMinute.padStart(2, '0')}`
      : `${femaleStartHour.padStart(2, '0')}:${femaleStartMinute.padStart(2, '0')}`;
    const endTime = isMALE
      ? `${maleEndHour.padStart(2, '0')}:${maleEndMinute.padStart(2, '0')}`
      : `${femaleEndHour.padStart(2, '0')}:${femaleEndMinute.padStart(2, '0')}`;

    const total = selectedDates.length;
    let completedCount = 0;
    let successCount = 0;
    let failCount = 0;

    // 로딩 모달 표시
    setLoadingModal({
      isOpen: true,
      title: `${genderName} 스케줄 생성 중...`,
      current: 0,
      total,
      action: 'create',
    });

    // 병렬 처리
    const promises = selectedDates.map(async (date) => {
      try {
        await scheduleService.createSchedule({
          date,
          gender,
          startTime,
          endTime,
        });
        successCount++;
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

    await Promise.all(promises);

    // 로딩 모달 닫기
    setLoadingModal((prev) => ({ ...prev, isOpen: false }));

    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    if (failCount > 0) {
      setConfirmModal({
        isOpen: true,
        title: '생성 완료',
        message: `${successCount}개 생성 완료 (max: ${failCount}개)\n(이미 존재하는 스케줄일 수 있습니다)`,
        confirmText: '확인',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: '생성 완료',
        message: `${successCount}개 스케줄이 생성되었습니다.`,
        confirmText: '확인',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // 일괄 스케줄 삭제 (병렬 처리)
  const handleBulkDelete = async (gender: Gender) => {
    if (selectedDates.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: '알림',
        message: '날짜를 선택해주세요.',
        confirmText: '확인',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const genderName = gender === 'MALE' ? '남기숙사' : '여기숙사';

    // 삭제 확인 모달 표시
    setConfirmModal({
      isOpen: true,
      title: '삭제 확인',
      message: `선택된 ${selectedDates.length}개 날짜의\n${genderName} 스케줄을 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await performBulkDelete(gender, genderName);
      },
    });
  };

  // 실제 삭제 수행
  const performBulkDelete = async (gender: Gender, genderName: string) => {
    const total = selectedDates.length;
    let completedCount = 0;
    let successCount = 0;
    let failCount = 0;

    // 로딩 모달 표시
    setLoadingModal({
      isOpen: true,
      title: `${genderName} 스케줄 삭제 중...`,
      current: 0,
      total,
      action: 'delete',
    });

    // 병렬 처리
    const promises = selectedDates.map(async (date) => {
      try {
        await scheduleService.deleteSchedule(date, gender);
        successCount++;
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

    await Promise.all(promises);

    // 로딩 모달 닫기
    setLoadingModal((prev) => ({ ...prev, isOpen: false }));

    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    if (failCount > 0) {
      setConfirmModal({
        isOpen: true,
        title: '삭제 완료',
        message: `${successCount}개 삭제 완료\n${failCount}개 실패`,
        confirmText: '확인',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: '삭제 완료',
        message: `${successCount}개 삭제 완료`,
        confirmText: '확인',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // 단일 스케줄 생성
  const handleSingleCreate = (gender: Gender) => {
    if (selectedDates.length !== 1) return;

    const date = selectedDates[0];
    const isMALE = gender === 'MALE';
    const startTime = isMALE
      ? `${maleStartHour.padStart(2, '0')}:${maleStartMinute.padStart(2, '0')}`
      : `${femaleStartHour.padStart(2, '0')}:${femaleStartMinute.padStart(2, '0')}`;
    const endTime = isMALE
      ? `${maleEndHour.padStart(2, '0')}:${maleEndMinute.padStart(2, '0')}`
      : `${femaleEndHour.padStart(2, '0')}:${femaleEndMinute.padStart(2, '0')}`;

    createScheduleMutation.mutate({
      date,
      gender,
      startTime,
      endTime,
    });
  };

  // 단일 스케줄 수정
  const handleSingleUpdate = (gender: Gender) => {
    if (selectedDates.length !== 1) return;

    const date = selectedDates[0];
    const isMALE = gender === 'MALE';
    const startTime = isMALE
      ? `${maleStartHour.padStart(2, '0')}:${maleStartMinute.padStart(2, '0')}`
      : `${femaleStartHour.padStart(2, '0')}:${femaleStartMinute.padStart(2, '0')}`;
    const endTime = isMALE
      ? `${maleEndHour.padStart(2, '0')}:${maleEndMinute.padStart(2, '0')}`
      : `${femaleEndHour.padStart(2, '0')}:${femaleEndMinute.padStart(2, '0')}`;

    updateScheduleMutation.mutate({
      date,
      gender,
      data: { startTime, endTime },
    });
  };

  // 단일 스케줄 삭제
  const handleSingleDelete = (gender: Gender) => {
    if (selectedDates.length !== 1) return;

    const genderName = gender === 'MALE' ? '남기숙사' : '여기숙사';

    setConfirmModal({
      isOpen: true,
      title: '삭제 확인',
      message: `${genderName} 스케줄을 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        deleteScheduleMutation.mutate({ date: selectedDates[0], gender });
      },
    });
  };

  // 남/여 동시 적용
  const handleApplyBoth = async () => {
    await handleBulkCreate('MALE');
    await handleBulkCreate('FEMALE');
  };

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${year}. ${month}. ${day}.`;
  };

  const isPending =
    createScheduleMutation.isPending ||
    updateScheduleMutation.isPending ||
    deleteScheduleMutation.isPending;

  // 통계 계산
  const stats = useMemo(() => {
    const currentMonthDays = calendarDays.filter((d) => d.isCurrentMonth);
    const maleCount = currentMonthDays.filter((d) => d.maleSchedule).length;
    const femaleCount = currentMonthDays.filter((d) => d.femaleSchedule).length;
    const weekdaysCount = currentMonthDays.filter((d) => !d.isWeekend).length;
    return {
      maleCount,
      femaleCount,
      weekdaysCount,
      totalDays: currentMonthDays.length,
    };
  }, [calendarDays]);

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
        <div className="calendar-header">
          <div className="calendar-title-row">
            <CalendarIcon className="calendar-title-icon" />
            <h2 className="calendar-title">출석 스케줄 관리</h2>
          </div>
          <div className="month-selector">
            <button className="nav-button prev" onClick={handlePrevMonth}>
              ←
            </button>
            <span className="month-text">
              {currentYear}년 {currentMonth}월
            </span>
            <button className="nav-button next" onClick={handleNextMonth}>
              →
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="schedule-stats">
          <div className="stat-item">
            <span className="stat-label">남기숙사</span>
            <span className="stat-value male">
              {stats.maleCount}/{stats.weekdaysCount}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">여기숙사</span>
            <span className="stat-value female">
              {stats.femaleCount}/{stats.weekdaysCount}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">선택됨</span>
            <span className="stat-value">{selectedDates.length}일</span>
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

                return (
                  <div
                    key={i}
                    className={`calendar-cell 
                      ${!day.isCurrentMonth ? 'inactive' : ''} 
                      ${day.isToday ? 'today' : ''} 
                      ${isSelected ? 'selected' : ''} 
                      ${day.isWeekend && day.isCurrentMonth ? 'weekend' : ''}
                    `}
                    onClick={() => handleDateClick(day)}
                  >
                    {day.isCurrentMonth ? (
                      <>
                        <span
                          className={`date-number ${day.isToday ? 'today-number' : ''}`}
                        >
                          {day.date}
                        </span>
                        <div className="schedule-indicators">
                          {hasMaleSchedule && (
                            <div className="schedule-tag blue">
                              {formatTime(day.maleSchedule!.startTime)}~
                              {formatTime(day.maleSchedule!.endTime)}
                            </div>
                          )}
                          {hasFemaleSchedule && (
                            <div className="schedule-tag pink">
                              {formatTime(day.femaleSchedule!.startTime)}~
                              {formatTime(day.femaleSchedule!.endTime)}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="date-number inactive-date">
                        {day.date}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scheduler Panel */}
      <div className="scheduler-panel">
        {/* 선택 도구 */}
        <div className="selection-tools">
          <div className="selection-summary">
            <span className="selection-summary-label">날짜 선택</span>
            <span className="selection-summary-value">
              {selectedDates.length}일
            </span>
          </div>
          <button
            className="selection-tool-btn"
            onClick={() => setSelectedDates([])}
            disabled={selectedDates.length === 0}
          >
            선택 해제
          </button>
        </div>

        {/* 요일별 선택 도구 */}
        <div className="weekday-selector">
          <p className="section-label">요일 선택</p>
          <div className="weekday-buttons">
            {days.map((day, index) => (
              <button
                key={day}
                className={`weekday-btn ${selectedWeekdays.includes(index) ? 'active' : ''} ${index === 0 ? 'sunday' : ''} ${index === 6 ? 'saturday' : ''}`}
                onClick={() => toggleWeekday(index)}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="weekday-quick-actions">
            <button className="weekday-quick-btn" onClick={selectWeekdaysOnly}>
              평일 전체 선택
            </button>
            <button className="weekday-quick-btn" onClick={selectSundayOnly}>
              일요일 선택
            </button>
          </div>
          <button
            className="apply-weekday-btn"
            onClick={applyWeekdaySelection}
            disabled={selectedWeekdays.length === 0}
          >
            해당 요일 전체 선택
          </button>
          <button className="clear-weekday-btn" onClick={clearWeekdaySelection}>
            요일 선택 해제
          </button>
        </div>

        {selectedDates.length > 0 ? (
          <>
            <h3 className="scheduler-title">
              {selectedDates.length === 1
                ? formatDisplayDate(selectedDates[0])
                : `${selectedDates.length}개 날짜 선택됨`}
            </h3>

            {/* 남기숙사 섹션 */}
            <div className="gender-section male">
              <div className="gender-header">
                <span className="gender-badge male">남기숙사</span>
                {selectedDates.length === 1 &&
                  selectedDayData?.maleSchedule && (
                    <span className="current-time">
                      현재: {formatTime(selectedDayData.maleSchedule.startTime)}{' '}
                      ~ {formatTime(selectedDayData.maleSchedule.endTime)}
                    </span>
                  )}
              </div>

              <div className="time-picker-row">
                <div className="time-input-group">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={maleStartHour}
                    onChange={(e) => setMaleStartHour(e.target.value)}
                    className="time-input"
                  />
                  <span className="time-separator">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={maleStartMinute}
                    onChange={(e) => setMaleStartMinute(e.target.value)}
                    className="time-input"
                  />
                </div>
                <span className="time-range-separator">~</span>
                <div className="time-input-group">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={maleEndHour}
                    onChange={(e) => setMaleEndHour(e.target.value)}
                    className="time-input"
                  />
                  <span className="time-separator">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={maleEndMinute}
                    onChange={(e) => setMaleEndMinute(e.target.value)}
                    className="time-input"
                  />
                </div>
              </div>

              <div className="gender-actions">
                {selectedDates.length === 1 ? (
                  selectedDayData?.maleSchedule ? (
                    <>
                      <button
                        className="action-button update small"
                        onClick={() => handleSingleUpdate('MALE')}
                        disabled={isPending}
                      >
                        수정
                      </button>
                      <button
                        className="action-button delete small"
                        onClick={() => handleSingleDelete('MALE')}
                        disabled={isPending}
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <button
                      className="action-button create"
                      onClick={() => handleSingleCreate('MALE')}
                      disabled={isPending}
                    >
                      생성
                    </button>
                  )
                ) : (
                  <>
                    <button
                      className="action-button create small"
                      onClick={() => handleBulkCreate('MALE')}
                      disabled={isPending}
                    >
                      일괄 생성
                    </button>
                    <button
                      className="action-button delete small"
                      onClick={() => handleBulkDelete('MALE')}
                      disabled={isPending}
                    >
                      일괄 삭제
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 여기숙사 섹션 */}
            <div className="gender-section female">
              <div className="gender-header">
                <span className="gender-badge female">여기숙사</span>
                {selectedDates.length === 1 &&
                  selectedDayData?.femaleSchedule && (
                    <span className="current-time">
                      현재:{' '}
                      {formatTime(selectedDayData.femaleSchedule.startTime)} ~{' '}
                      {formatTime(selectedDayData.femaleSchedule.endTime)}
                    </span>
                  )}
              </div>

              <div className="time-picker-row">
                <div className="time-input-group">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={femaleStartHour}
                    onChange={(e) => setFemaleStartHour(e.target.value)}
                    className="time-input"
                  />
                  <span className="time-separator">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={femaleStartMinute}
                    onChange={(e) => setFemaleStartMinute(e.target.value)}
                    className="time-input"
                  />
                </div>
                <span className="time-range-separator">~</span>
                <div className="time-input-group">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={femaleEndHour}
                    onChange={(e) => setFemaleEndHour(e.target.value)}
                    className="time-input"
                  />
                  <span className="time-separator">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={femaleEndMinute}
                    onChange={(e) => setFemaleEndMinute(e.target.value)}
                    className="time-input"
                  />
                </div>
              </div>

              <div className="gender-actions">
                {selectedDates.length === 1 ? (
                  selectedDayData?.femaleSchedule ? (
                    <>
                      <button
                        className="action-button update small"
                        onClick={() => handleSingleUpdate('FEMALE')}
                        disabled={isPending}
                      >
                        수정
                      </button>
                      <button
                        className="action-button delete small"
                        onClick={() => handleSingleDelete('FEMALE')}
                        disabled={isPending}
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <button
                      className="action-button create-female"
                      onClick={() => handleSingleCreate('FEMALE')}
                      disabled={isPending}
                    >
                      생성
                    </button>
                  )
                ) : (
                  <>
                    <button
                      className="action-button create-female small"
                      onClick={() => handleBulkCreate('FEMALE')}
                      disabled={isPending}
                    >
                      일괄 생성
                    </button>
                    <button
                      className="action-button delete small"
                      onClick={() => handleBulkDelete('FEMALE')}
                      disabled={isPending}
                    >
                      일괄 삭제
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 남/여 동시 적용 */}
            {selectedDates.length > 1 && (
              <button
                className="action-button apply-both"
                onClick={handleApplyBoth}
                disabled={isPending || loadingModal.isOpen}
              >
                남/여 기숙사 동시 일괄 생성
              </button>
            )}
          </>
        ) : (
          <div className="no-selection">
            <p>캘린더에서 날짜를 선택해주세요.</p>
            <p className="hint">
              날짜를 다시 클릭하면 선택을 해제할 수 있습니다.
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
