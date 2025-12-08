import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services/schedule.service';
import '../styles/Schedule.css';
import { CalendarIcon } from '../components/Icons';
import type { AttendanceScheduleResponse } from '../types/api';

interface CalendarDay {
  date: number;
  fullDate: string; // YYYY-MM-DD format
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  schedules: AttendanceScheduleResponse[];
}

export default function Schedule() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // 스케줄 생성/수정용 시간 상태
  const [startHour, setStartHour] = useState('21');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('22');
  const [endMinute, setEndMinute] = useState('30');
  
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
      alert('스케줄 생성에 실패했습니다.');
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: ({ date, data }: { date: string; data: { startTime?: string; endTime?: string } }) =>
      scheduleService.updateSchedule(date, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => {
      console.error('스케줄 수정 오류:', error);
      alert('스케줄 수정에 실패했습니다.');
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: scheduleService.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => {
      console.error('스케줄 삭제 오류:', error);
      alert('스케줄 삭제에 실패했습니다.');
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

    // Create schedule map by date string
    const scheduleMap = new Map<string, AttendanceScheduleResponse[]>();
    if (schedulesData) {
      schedulesData.forEach((schedule) => {
        const dateStr = schedule.date;
        if (!scheduleMap.has(dateStr)) {
          scheduleMap.set(dateStr, []);
        }
        scheduleMap.get(dateStr)?.push(schedule);
      });
    }

    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const fullDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      
      result.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        schedules: [],
      });
    }

    // Current month days
    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const dayOfWeek = (startDayOfWeek + date - 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = fullDate === todayStr;
      const schedules = scheduleMap.get(fullDate) || [];

      result.push({
        date,
        fullDate,
        isCurrentMonth: true,
        isToday,
        isWeekend,
        schedules,
      });
    }

    // Next month days to fill the grid (6 rows)
    const remainingCells = 42 - result.length;
    for (let date = 1; date <= remainingCells; date++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const fullDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      
      result.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        schedules: [],
      });
    }

    return result;
  }, [currentYear, currentMonth, schedulesData]);

  // 선택된 날짜의 스케줄
  const selectedSchedule = useMemo(() => {
    if (!selectedDate || !schedulesData) return null;
    return schedulesData.find(s => s.date === selectedDate) || null;
  }, [selectedDate, schedulesData]);

  // 선택된 날짜 변경 시 시간 업데이트
  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    
    setSelectedDate(day.fullDate);
    
    // 기존 스케줄이 있으면 해당 시간으로 설정
    if (day.schedules.length > 0) {
      const schedule = day.schedules[0];
      const [sh, sm] = schedule.startTime.split(':');
      const [eh, em] = schedule.endTime.split(':');
      setStartHour(sh);
      setStartMinute(sm);
      setEndHour(eh);
      setEndMinute(em);
    } else {
      // 기본값
      setStartHour('21');
      setStartMinute('00');
      setEndHour('22');
      setEndMinute('30');
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const handleCreateSchedule = () => {
    if (!selectedDate) return;
    
    const startTime = `${startHour.padStart(2, '0')}:${startMinute.padStart(2, '0')}`;
    const endTime = `${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`;
    
    createScheduleMutation.mutate({
      date: selectedDate,
      startTime,
      endTime,
    });
  };

  const handleUpdateSchedule = () => {
    if (!selectedDate) return;
    
    const startTime = `${startHour.padStart(2, '0')}:${startMinute.padStart(2, '0')}`;
    const endTime = `${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`;
    
    updateScheduleMutation.mutate({
      date: selectedDate,
      data: { startTime, endTime },
    });
  };

  const handleDeleteSchedule = () => {
    if (!selectedDate) return;
    
    if (confirm('정말 이 날짜의 출석 스케줄을 삭제하시겠습니까?')) {
      deleteScheduleMutation.mutate(selectedDate);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${year}. ${month}. ${day}.`;
  };

  const isPending = createScheduleMutation.isPending || updateScheduleMutation.isPending || deleteScheduleMutation.isPending;

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
            <h2 className="calendar-title">출석 스케줄 관리</h2>
          </div>
          <div className="month-selector">
            <button className="nav-button prev" onClick={handlePrevMonth}>←</button>
            <span className="month-text">{currentYear}년 {currentMonth}월</span>
            <button className="nav-button next" onClick={handleNextMonth}>→</button>
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

          <div className="calendar-grid">
            {calendarDays.map((day, i) => {
              const isSelected = day.fullDate === selectedDate;
              const hasSchedule = day.schedules.length > 0;
              
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
                      <span className={`date-number ${day.isToday ? 'today-number' : ''}`}>
                        {day.date}
                      </span>
                      {hasSchedule && (
                        <div className="schedule-indicators">
                          {day.schedules.map((schedule, idx) => (
                            <div key={idx} className="schedule-tag blue">
                              {schedule.startTime}~{schedule.endTime}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="date-number inactive-date">{day.date}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scheduler Panel */}
      <div className="scheduler-panel">
        {selectedDate ? (
          <>
            <h3 className="scheduler-title">{formatDisplayDate(selectedDate)} 일정</h3>
            
            {selectedSchedule ? (
              // 기존 스케줄 수정 모드
              <>
                <div className="schedule-info">
                  <div className="current-schedule">
                    <span className="schedule-label">현재 설정:</span>
                    <span className="schedule-time">
                      {selectedSchedule.startTime} ~ {selectedSchedule.endTime}
                    </span>
                  </div>
                </div>
                
                <div className="time-picker-section">
                  <p className="section-label">시간 수정</p>
                  <div className="time-picker-row">
                    <div className="time-input-group">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={startHour}
                        onChange={(e) => setStartHour(e.target.value)}
                        className="time-input"
                      />
                      <span className="time-separator">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={startMinute}
                        onChange={(e) => setStartMinute(e.target.value)}
                        className="time-input"
                      />
                    </div>
                    <span className="time-range-separator">~</span>
                    <div className="time-input-group">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                        className="time-input"
                      />
                      <span className="time-separator">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={endMinute}
                        onChange={(e) => setEndMinute(e.target.value)}
                        className="time-input"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="scheduler-actions">
                  <button 
                    className="action-button update" 
                    onClick={handleUpdateSchedule}
                    disabled={isPending}
                  >
                    {updateScheduleMutation.isPending ? '수정 중...' : '시간 수정'}
                  </button>
                  <button 
                    className="action-button delete" 
                    onClick={handleDeleteSchedule}
                    disabled={isPending}
                  >
                    {deleteScheduleMutation.isPending ? '삭제 중...' : '스케줄 삭제'}
                  </button>
                </div>
              </>
            ) : (
              // 새 스케줄 생성 모드
              <>
                <div className="no-schedule-message">
                  <p>출석 스케줄이 설정되지 않았습니다.</p>
                </div>
                
                <div className="time-picker-section">
                  <p className="section-label">출석 시간 설정</p>
                  <div className="time-picker-row">
                    <div className="time-input-group">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={startHour}
                        onChange={(e) => setStartHour(e.target.value)}
                        className="time-input"
                      />
                      <span className="time-separator">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={startMinute}
                        onChange={(e) => setStartMinute(e.target.value)}
                        className="time-input"
                      />
                    </div>
                    <span className="time-range-separator">~</span>
                    <div className="time-input-group">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                        className="time-input"
                      />
                      <span className="time-separator">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={endMinute}
                        onChange={(e) => setEndMinute(e.target.value)}
                        className="time-input"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="scheduler-actions">
                  <button 
                    className="action-button create" 
                    onClick={handleCreateSchedule}
                    disabled={isPending}
                  >
                    {createScheduleMutation.isPending ? '생성 중...' : '출석 스케줄 생성'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="no-selection">
            <p>날짜를 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
