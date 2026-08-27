import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/SleepoverReasonModal.css';

type SleepoverReason =
  | '일반 외박'
  | '연수'
  | '현장실습'
  | '실리콘밸리'
  | '병가';

interface SleepoverReasonModalProps {
  isOpen: boolean;
  studentName?: string;
  studentCount?: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const SLEEPOVER_REASONS: SleepoverReason[] = [
  '일반 외박',
  '연수',
  '현장실습',
  '실리콘밸리',
  '병가',
];

export default function SleepoverReasonModal({
  isOpen,
  studentName,
  studentCount,
  isSubmitting = false,
  onClose,
  onSubmit,
}: SleepoverReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<
    SleepoverReason | '기타' | null
  >(null);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedReason(null);
    setCustomReason('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const sleepoverReason =
    selectedReason === '기타' ? customReason.trim() : selectedReason;
  const isSubmitDisabled = !sleepoverReason || isSubmitting;
  const description = studentCount
    ? `선택한 ${studentCount}명에게 동일한 외박 사유를 적용합니다.`
    : `${studentName} 학생의 외박 사유를 선택해주세요.`;

  return createPortal(
    <div
      className="sleepover-reason-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (!isSubmitting && event.target === event.currentTarget) onClose();
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
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="외박 사유 선택 닫기"
          >
            ✕
          </button>
        </div>
        <p className="sleepover-reason-description">{description}</p>
        <div className="sleepover-reason-options">
          {SLEEPOVER_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className={`sleepover-reason-option ${
                selectedReason === reason ? 'selected' : ''
              }`}
              onClick={() => setSelectedReason(reason)}
              disabled={isSubmitting}
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
            disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            <em>{customReason.length}/100</em>
          </label>
        )}
        <div className="sleepover-reason-actions">
          <button
            type="button"
            className="sleepover-reason-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="sleepover-reason-submit"
            onClick={() => sleepoverReason && onSubmit(sleepoverReason)}
            disabled={isSubmitDisabled}
          >
            {isSubmitting ? '처리 중...' : '외박 처리'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
