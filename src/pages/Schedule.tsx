import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services/schedule.service';
import '../styles/Schedule.css';
import { CalendarIcon, ChevronDownIcon } from '../components/Icons';
import SchedulerPanel from '../components/SchedulerPanel';
import type { AttendanceScheduleResponse } from '../types/api';

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  hasSchedule: boolean;
  isActive: boolean;
  schedules?: AttendanceScheduleResponse[];
}

export default function Schedule() {
  const [currentYear, setCurrentYear] = useState(2024);
  const [currentMonth, setCurrentMonth] = useState(3);
  const [selectedDate, setSelectedDate] = useState(19);
  const [schedulerVariant, setSchedulerVariant] = useState<'default' | 'no-schedule' | 'active'>('active');
  
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
      setSchedulerVariant('active');
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: ({ date, data }: { date: string; data: { startTime?: string; endTime?: string } }) =>
      scheduleService.updateSchedule(date, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: scheduleService.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setSchedulerVariant('no-schedule');
    },
  });

  const days = ['일', '월', '화', '수', '목', '금', '토'];

  // Generate calendar days
  const generateCalendarDays = (): CalendarDay[] => {
    const calendarDays: CalendarDay[] = [];
    const firstDayOffset = 5; // 1일이 금요일 (0=일요일, 5=금요일)
    const daysInMonth = 31;
    const today = new Date().getDate();
    const isCurrentYearMonth = 
      new Date().getFullYear() === currentYear && 
      new Date().getMonth() + 1 === currentMonth;

    // Create schedule map by date
    const scheduleMap = new Map<number, AttendanceScheduleResponse[]>();
    if (schedulesData) {
      schedulesData.forEach((schedule) => {
        const scheduleDate = new Date(schedule.date).getDate();
        if (!scheduleMap.has(scheduleDate)) {
          scheduleMap.set(scheduleDate, []);
        }
        scheduleMap.get(scheduleDate)?.push(schedule);
      });
    }

    for (let i = 0; i < 35; i++) {
      const date = i - firstDayOffset + 1;
      const isCurrentMonth = date > 0 && date <= daysInMonth;
      const dayOfWeek = i % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = isCurrentYearMonth && date === today;
      const schedules = scheduleMap.get(date);
      const hasSchedule = !!schedules && schedules.length > 0;
      const isActive = hasSchedule && !isWeekend;

      calendarDays.push({
        date,
        isCurrentMonth,
        isToday,
        isWeekend,
        hasSchedule,
        isActive,
        schedules,
      });
    }

    return calendarDays;
  };

  const calendarDays = generateCalendarDays();

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    
    setSelectedDate(day.date);
    
    // Determine scheduler variant based on day state
    if (!day.hasSchedule) {
      setSchedulerVariant('no-schedule');
    } else if (day.isActive) {
      setSchedulerVariant('active');
    } else {
      setSchedulerVariant('default');
    }
  };

  const handleCreateSchedule = () => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    createScheduleMutation.mutate({
      date: dateStr,
      startTime: '09:00',
      endTime: '10:20',
    });
  };

  const handleDeleteSchedule = () => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    deleteScheduleMutation.mutate(dateStr);
  };

  const handleComplete = () => {
    console.log('Complete editing schedule');
  };

  if (isLoading) {
    return (
      <div className="schedule-page">
        <div className="loading">일정을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="schedule-page">
          <div className="calendar-container">
            <div className="calendar-header">
              <div className="calendar-title-row">
                <CalendarIcon className="calendar-title-icon" />
                <h2 className="calendar-title">일정 관리</h2>
              </div>
              <div className="month-selector">
                <button className="nav-button prev">←</button>
                <span className="month-text">{currentYear}년 {currentMonth}월</span>
                <button className="nav-button next">
                  <ChevronDownIcon className="chevron-icon" />
                </button>
              </div>
            </div>

            <div className="calendar">
              <div className="calendar-weekdays">
                {days.map((day) => (
                  <div key={day} className="weekday">{day}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarDays.map((day, i) => {
                  const isSelected = day.date === selectedDate && day.isCurrentMonth;
                  
                  return (
                    <div
                      key={i}
                      className={`calendar-cell ${!day.isCurrentMonth ? 'inactive' : ''} ${day.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${day.isWeekend && day.isCurrentMonth ? 'weekend' : ''} ${!day.isActive && day.hasSchedule ? 'disabled' : ''}`}
                      onClick={() => handleDateClick(day)}
                    >
                      {day.isCurrentMonth && (
                        <>
                          <span className={`date-number ${day.isToday ? 'today-number' : ''}`}>
                            {day.date}
                          </span>
                          {day.hasSchedule && day.isActive && (
                            <div className="schedule-indicators">
                              <div className="schedule-tag blue">09:00~10:20</div>
                              <div className="schedule-tag pink">09:00~10:20</div>
                            </div>
                          )}
                          {day.hasSchedule && !day.isActive && (
                            <div className="schedule-indicators">
                              <div className="schedule-tag disabled">09:00~10:20</div>
                              <div className="schedule-tag disabled">09:00~10:20</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <SchedulerPanel
            variant={schedulerVariant}
            date={`${currentYear}. ${String(currentMonth).padStart(2, '0')}. ${String(selectedDate).padStart(2, '0')}.`}
            gender="여"
            onCreateSchedule={handleCreateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onComplete={handleComplete}
          />
    </div>
  );
}
