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
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['schedules', 'month', currentYear, currentMonth],
    queryFn: () => scheduleService.getMonthSchedules(currentYear, currentMonth),
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

  const getDefaultTimeByDay = (dayOfWeek?: number) => ({
    startHour: DEFAULT_START_HOUR,
    startMinute: DEFAULT_START_MINUTE,
    endHour: dayOfWeek === 0 ? SUNDAY_END_HOUR : WEEKDAY_END_HOUR,
    endMinute: dayOfWeek === 0 ? SUNDAY_END_MINUTE : WEEKDAY_END_MINUTE,
  });

  const getDefaultTimeForSelection = () => {
    return getDefaultTimeByDay(selectedDayData?.dayOfWeek);
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
    const defaults = getDefaultTimeByDay(day.dayOfWeek);

    // 기존 스케줄이 있으면 해당 시간으로 설정
    if (day.maleSchedule) {
      const [sh, sm] = day.maleSchedule.startTime.split(':');
      const [eh, em] = day.maleSchedule.endTime.split(':');
      setMaleStartHour(sh);
      setMaleStartMinute(sm);
      setMaleEndHour(eh);
      setMaleEndMinute(em);
    } else {
      resetMaleTime(defaults);
    }

    if (day.femaleSchedule) {
      const [sh, sm] = day.femaleSchedule.startTime.split(':');
      const [eh, em] = day.femaleSchedule.endTime.split(':');
      setFemaleStartHour(sh);
      setFemaleStartMinute(sm);
      setFemaleEndHour(eh);
      setFemaleEndMinute(em);
    } else {
      resetFemaleTime(defaults);
    }
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;

    setSelectedDates((prev) => {
      if (prev.includes(day.fullDate)) {
        return [];
      }

      applyDayScheduleTime(day);
      return [day.fullDate];
    });
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

  // 단일 스케줄 삭제
  const handleSingleDelete = (gender: Gender) => {
    if (selectedDates.length !== 1) {
      showSelectDateAlert();
      return;
    }

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

  const isPending = deleteScheduleMutation.isPending;

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

  const scheduleStatItems = [
    {
      label: '남기숙사',
      value: `${stats.maleCount}/${stats.weekdaysCount}`,
      tone: 'male',
    },
    {
      label: '여기숙사',
      value: `${stats.femaleCount}/${stats.weekdaysCount}`,
      tone: 'female',
    },
    {
      label: '선택 날짜',
      value: `${selectedDates.length}일`,
      tone: 'selected',
    },
  ];

  const selectionTitle =
    selectedDates.length === 0
      ? '날짜를 선택해주세요'
      : formatDisplayDate(selectedDates[0]);

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

        <div className="schedule-stats">
          {scheduleStatItems.map((item) => (
            <div key={item.label} className={`stat-item ${item.tone}`}>
              <span className="stat-label">{item.label}</span>
              <span className={`stat-value ${item.tone}`}>{item.value}</span>
            </div>
          ))}
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
                    aria-label={`${day.fullDate} ${isSelected ? '선택됨' : ''}`}
                  >
                    {day.isCurrentMonth ? (
                      <>
                        <div className="calendar-cell-top">
                          <span
                            className={`date-number ${day.isToday ? 'today-number' : ''}`}
                          >
                            {day.date}
                          </span>
                          {(hasMaleSchedule || hasFemaleSchedule) && (
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
                        <div className="schedule-indicators">
                          {hasMaleSchedule && (
                            <div className="schedule-tag male">
                              <span>남</span>
                              {formatTime(day.maleSchedule!.startTime)}-
                              {formatTime(day.maleSchedule!.endTime)}
                            </div>
                          )}
                          {hasFemaleSchedule && (
                            <div className="schedule-tag female">
                              <span>여</span>
                              {formatTime(day.femaleSchedule!.startTime)}-
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

      <div className="scheduler-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Schedule editor</span>
            <h3 className="scheduler-title">{selectionTitle}</h3>
          </div>
          <button
            className="selection-tool-btn"
            onClick={() => setSelectedDates([])}
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
                        현재 {formatTime(selectedDayData.maleSchedule.startTime)}
                        -{formatTime(selectedDayData.maleSchedule.endTime)}
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
                    disabled={isPending || loadingModal.isOpen}
                  >
                    적용
                  </button>
                  <button
                    className="row-delete-btn"
                    onClick={() => handleSingleDelete('MALE')}
                    disabled={isPending || loadingModal.isOpen}
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
                        {formatTime(selectedDayData.femaleSchedule.startTime)}-
                        {formatTime(selectedDayData.femaleSchedule.endTime)}
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
                    disabled={isPending || loadingModal.isOpen}
                  >
                    적용
                  </button>
                  <button
                    className="row-delete-btn"
                    onClick={() => handleSingleDelete('FEMALE')}
                    disabled={isPending || loadingModal.isOpen}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-selection">
            <p>캘린더에서 날짜를 선택해주세요.</p>
            <p className="hint">
              날짜 하나를 클릭하면 해당 날짜의 남/여 기숙사 시간을 설정할 수 있습니다.
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
