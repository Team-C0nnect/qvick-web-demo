import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import SleepoverReasonModal from './SleepoverReasonModal';
import '../styles/AttendanceStatusPicker.css';

export type AttendanceDisplayStatus =
  | '출석'
  | '미출석'
  | '외박'
  | '지연출석';

interface AttendanceStatusPickerProps {
  value: AttendanceDisplayStatus;
  completeLabel: string;
  lateLabel: string;
  absentLabel: string;
  studentName: string;
  disabled?: boolean;
  showLateOption?: boolean;
  showSleepoverOption?: boolean;
  menuTitle?: string;
  onChange: (
    status: AttendanceDisplayStatus,
    sleepoverReason?: string,
  ) => void;
}

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
  showLateOption = true,
  showSleepoverOption = true,
  menuTitle = '출결 상태 변경',
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

  const statusOptions: Array<{
    value: AttendanceDisplayStatus;
    label: string;
  }> = [
    { value: '출석', label: completeLabel },
    ...(showLateOption ? [{ value: '지연출석' as const, label: lateLabel }] : []),
    { value: '미출석', label: absentLabel },
    ...(showSleepoverOption ? [{ value: '외박' as const, label: '외박' }] : []),
  ];

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = 208;
    const menuHeight = 40 + statusOptions.length * 38;
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
  }, [statusOptions.length]);

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
    if (!isMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMenuOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  const handleStatusSelect = (status: AttendanceDisplayStatus) => {
    setIsMenuOpen(false);

    if (status === '외박' && showSleepoverOption) {
      setIsSleepoverReasonOpen(true);
      return;
    }

    onChange(status);
  };

  const statusMenu =
    isMenuOpen && menuPosition ? (
      <div
        ref={menuRef}
        className={`attendance-status-menu ${
          menuPosition.openUpward ? 'open-upward' : ''
        }`}
        role="menu"
        aria-label={menuTitle}
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
        }}
      >
        <p className="attendance-status-menu-title">{menuTitle}</p>
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
      {isSleepoverReasonOpen && (
        <SleepoverReasonModal
          isOpen
          studentName={studentName}
          onClose={() => setIsSleepoverReasonOpen(false)}
          onSubmit={(sleepoverReason) => {
            onChange('외박', sleepoverReason);
            setIsSleepoverReasonOpen(false);
          }}
        />
      )}
    </>
  );
}
