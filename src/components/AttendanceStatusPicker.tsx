import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import '../styles/AttendanceStatusPicker.css';

export type AttendanceDisplayStatus =
  | '출석'
  | '미출석'
  | '외박'
  | '지연출석';

type SleepoverReason =
  | '일반 외박'
  | '연수'
  | '현장실습'
  | '실리콘밸리'
  | '병가';

interface AttendanceStatusPickerProps {
  value: AttendanceDisplayStatus;
  completeLabel: string;
  lateLabel: string;
  absentLabel: string;
  studentName: string;
  disabled?: boolean;
  onChange: (
    status: AttendanceDisplayStatus,
    sleepoverReason?: string,
  ) => void;
}

const SLEEPOVER_REASONS: SleepoverReason[] = [
  '일반 외박',
  '연수',
  '현장실습',
  '실리콘밸리',
  '병가',
];

const getStatusTone = (status: AttendanceDisplayStatus) => {
  switch (status) {
    case '출석':
      return 'present';
    case '지연출석':
      return 'late';
    case '외박':
      return 'sleepover';
    default:
      return 'absent';
  }
};

export default function AttendanceStatusPicker({
  value,
  completeLabel,
  lateLabel,
  absentLabel,
  studentName,
  disabled = false,
  onChange,
}: AttendanceStatusPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSleepoverReasonOpen, setIsSleepoverReasonOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);
  const [selectedReason, setSelectedReason] = useState<
    SleepoverReason | '기타' | null
  >(null);
  const [customReason, setCustomReason] = useState('');

  const statusOptions: Array<{
    value: AttendanceDisplayStatus;
    label: string;
  }> = [
    { value: '출석', label: completeLabel },
    { value: '지연출석', label: lateLabel },
    { value: '미출석', label: absentLabel },
    { value: '외박', label: '외박' },
  ];

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = 208;
    const menuHeight = 208;
    const openUpward =
      window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setMenuPosition({
      top: openUpward ? rect.top - 8 : rect.bottom + 8,
      left,
      openUpward,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
  }, [isMenuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeMenuOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const updatePositionOnViewportChange = () => updateMenuPosition();

    document.addEventListener('mousedown', closeMenuOnOutsideClick);
    window.addEventListener('resize', updatePositionOnViewportChange);
    window.addEventListener('scroll', updatePositionOnViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', closeMenuOnOutsideClick);
      window.removeEventListener('resize', updatePositionOnViewportChange);
      window.removeEventListener('scroll', updatePositionOnViewportChange, true);
    };
  }, [isMenuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isMenuOpen && !isSleepoverReasonOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMenuOpen(false);
      setIsSleepoverReasonOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen, isSleepoverReasonOpen]);

  const handleStatusSelect = (status: AttendanceDisplayStatus) => {
    setIsMenuOpen(false);

    if (status === '외박') {
      setSelectedReason(null);
      setCustomReason('');
      setIsSleepoverReasonOpen(true);
      return;
    }

    onChange(status);
  };

  const submitSleepoverReason = () => {
    if (!selectedReason) return;

    const sleepoverReason =
      selectedReason === '기타' ? customReason.trim() : selectedReason;
    if (!sleepoverReason) return;

    onChange('외박', sleepoverReason);
    setIsSleepoverReasonOpen(false);
  };

  const statusMenu =
    isMenuOpen && menuPosition ? (
      <div
        ref={menuRef}
        className={`attendance-status-menu ${
          menuPosition.openUpward ? 'open-upward' : ''
        }`}
        role="menu"
        aria-label="출결 상태 선택"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
        }}
      >
        <p className="attendance-status-menu-title">출결 상태 변경</p>
        {statusOptions.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={isSelected}
              className={`attendance-status-option ${getStatusTone(
                option.value,
              )} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleStatusSelect(option.value)}
            >
              <span className="attendance-status-option-dot" />
              <span>{option.label}</span>
              {isSelected && <span aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    ) : null;

  const sleepoverReasonModal = isSleepoverReasonOpen ? (
    <div
      className="sleepover-reason-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setIsSleepoverReasonOpen(false);
        }
      }}
    >
      <section
        className="sleepover-reason-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sleepover-reason-title"
      >
        <div className="sleepover-reason-header">
          <div>
            <p>Sleepover reason</p>
            <h2 id="sleepover-reason-title">외박 사유 선택</h2>
          </div>
          <button
            type="button"
            className="sleepover-reason-close"
            onClick={() => setIsSleepoverReasonOpen(false)}
            aria-label="외박 사유 선택 닫기"
          >
            ✕
          </button>
        </div>
        <p className="sleepover-reason-description">
          {studentName} 학생의 외박 사유를 선택해주세요.
        </p>
        <div className="sleepover-reason-options">
          {SLEEPOVER_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className={`sleepover-reason-option ${
                selectedReason === reason ? 'selected' : ''
              }`}
              onClick={() => setSelectedReason(reason)}
            >
              {reason}
            </button>
          ))}
          <button
            type="button"
            className={`sleepover-reason-option ${
              selectedReason === '기타' ? 'selected' : ''
            }`}
            onClick={() => setSelectedReason('기타')}
          >
            기타 (입력)
          </button>
        </div>
        {selectedReason === '기타' && (
          <label className="sleepover-custom-reason">
            <span>기타 사유</span>
            <input
              type="text"
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              placeholder="외박 사유를 입력해주세요"
              maxLength={100}
              autoFocus
            />
            <em>{customReason.length}/100</em>
          </label>
        )}
        <div className="sleepover-reason-actions">
          <button
            type="button"
            className="sleepover-reason-cancel"
            onClick={() => setIsSleepoverReasonOpen(false)}
          >
            취소
          </button>
          <button
            type="button"
            className="sleepover-reason-submit"
            onClick={submitSleepoverReason}
            disabled={
              !selectedReason ||
              (selectedReason === '기타' && !customReason.trim())
            }
          >
            외박 처리
          </button>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`attendance-status-trigger ${getStatusTone(value)}`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        disabled={disabled}
      >
        <span>{statusOptions.find((option) => option.value === value)?.label}</span>
        <span className="attendance-status-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {createPortal(statusMenu, document.body)}
      {createPortal(sleepoverReasonModal, document.body)}
    </>
  );
}
