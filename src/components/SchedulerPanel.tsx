import React from 'react';
import '../styles/SchedulerPanel.css';

interface SchedulerPanelProps {
  variant: 'default' | 'no-schedule' | 'active';
  date: string;
  gender?: '남' | '여';
  onCreateSchedule?: () => void;
  onDeleteSchedule?: () => void;
  onComplete?: () => void;
}

const SchedulerPanel: React.FC<SchedulerPanelProps> = ({
  variant,
  date,
  gender = '여',
  onCreateSchedule,
  onDeleteSchedule,
  onComplete
}) => {
  const dormitoryName = gender === '남' ? '남기숙사' : '여기숙사';
  const genderColor = gender === '남' ? '#1492fc' : '#ed4ca4';

  if (variant === 'no-schedule') {
    return (
      <div className="scheduler-panel">
        <h3 className="scheduler-title">{date} 일정</h3>
        <div className="no-schedule-message">
          <p>출석 시간이 미설정 상태입니다!</p>
        </div>
        <div className="scheduler-actions">
          <button className="action-button create" onClick={onCreateSchedule}>
            해당일 출석 생성
          </button>
          <button className="action-button create" onClick={onCreateSchedule}>
            해당일 출석 생성
          </button>
          <button className="action-button complete" onClick={onComplete}>
            수정 완료
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'active') {
    return (
      <div className="scheduler-panel">
        <h3 className="scheduler-title">
          <span style={{ color: genderColor }}>( {gender} )</span>
        </h3>
        <div className="time-picker-section">
          <p className="dormitory-label">
            <span className="dormitory-name" style={{ color: genderColor }}>
              {dormitoryName}
            </span>
          </p>
          <div className="time-picker-row">
            <div className="time-input-group">
              <div className="time-segment">0~23</div>
              <div className="time-separator">:</div>
              <div className="time-segment">0~59</div>
            </div>
            <div className="time-range-separator">~</div>
            <div className="time-input-group">
              <div className="time-segment">0~23</div>
              <div className="time-separator">:</div>
              <div className="time-segment">0~59</div>
            </div>
          </div>
        </div>
        <div className="scheduler-actions">
          <button className="action-button delete" onClick={onDeleteSchedule}>
            해당일 {dormitoryName} 출석 삭제
          </button>
          <button className="action-button complete" onClick={onComplete}>
            수정 완료
          </button>
        </div>
      </div>
    );
  }

  // default variant
  return (
    <div className="scheduler-panel">
      <h3 className="scheduler-title">
        <span style={{ color: genderColor }}>( {gender} )</span>
      </h3>
      <div className="time-picker-section">
        <p className="dormitory-label">
          <span className="dormitory-name" style={{ color: genderColor }}>
            {dormitoryName}
          </span>
        </p>
        <div className="time-picker-row">
          <div className="time-input-group">
            <div className="time-segment">0~23</div>
            <div className="time-separator">:</div>
            <div className="time-segment">0~59</div>
          </div>
          <div className="time-range-separator">~</div>
          <div className="time-input-group">
            <div className="time-segment">0~23</div>
            <div className="time-separator">:</div>
            <div className="time-segment">0~59</div>
          </div>
        </div>
      </div>
      <div className="scheduler-actions">
        <button className="action-button delete" onClick={onDeleteSchedule}>
          해당일 {dormitoryName} 출석 삭제
        </button>
        <button className="action-button complete" onClick={onComplete}>
          수정 완료
        </button>
      </div>
    </div>
  );
};

export default SchedulerPanel;
