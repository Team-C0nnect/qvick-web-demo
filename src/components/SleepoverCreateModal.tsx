import { useMemo, useRef, useState } from 'react';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import {
  SLEEPOVER_PIN_REASON_ETC,
  SLEEPOVER_PIN_REASON_OPTIONS,
} from '../utils/sleepover-pin';
import '../styles/RoomModal.css';
import '../styles/Sleepover.css';
import '../styles/SleepoverCreateModal.css';
import type { StudentResponse } from '../types/api';

interface SleepoverCreateModalProps {
  students: StudentResponse[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (studentIds: number[], reason: string) => Promise<number[]>;
}

const getStudentNumber = (student: StudentResponse) =>
  `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

export default function SleepoverCreateModal({
  students,
  isPending,
  onClose,
  onSubmit,
}: SleepoverCreateModalProps) {
  const backdropMouseDownRef = useRef(false);
  const reasonSelectRef = useRef<HTMLSelectElement>(null);
  const etcReasonInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StudentResponse[]>(
    [],
  );
  const [reason, setReason] = useState('');
  const [etcReason, setEtcReason] = useState('');
  const [error, setError] = useState('');

  const isEtcReason = reason === SLEEPOVER_PIN_REASON_ETC;

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const sortedStudents = [...students].sort((a, b) => {
      const roomDiff = a.room.localeCompare(b.room, 'ko-KR', {
        numeric: true,
      });
      if (roomDiff !== 0) return roomDiff;
      return getStudentNumber(a).localeCompare(getStudentNumber(b), 'ko-KR', {
        numeric: true,
      });
    });

    if (!query) return sortedStudents.slice(0, 8);

    return sortedStudents
      .filter((student) => {
        const studentNumber = getStudentNumber(student);
        return (
          matchesKoreanNameSearch(student.name, searchTerm) ||
          student.room.toLowerCase().includes(query) ||
          studentNumber.includes(query)
        );
      })
      .slice(0, 8);
  }, [searchTerm, students]);

  const requestClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedStudents.length === 0) {
      setError('외박 처리할 학생을 한 명 이상 선택해주세요.');
      return;
    }

    if (!reason) {
      setError('외박 사유를 선택해주세요.');
      reasonSelectRef.current?.focus();
      return;
    }

    if (isEtcReason && !etcReason.trim()) {
      setError('기타 사유를 입력해주세요.');
      etcReasonInputRef.current?.focus();
      return;
    }

    setError('');
    try {
      const selectedIds = selectedStudents.map((student) => student.id);
      const failedIds = await onSubmit(
        selectedIds,
        isEtcReason ? etcReason.trim() : reason,
      );

      if (failedIds.length > 0) {
        const failedIdSet = new Set(failedIds);
        const failedStudents = selectedStudents.filter((student) =>
          failedIdSet.has(student.id),
        );
        const succeededCount = selectedIds.length - failedStudents.length;

        setSelectedStudents(failedStudents);
        setError(
          succeededCount > 0
            ? `${succeededCount}명은 추가했고 ${failedStudents.length}명은 실패했습니다. 실패 학생만 선택 상태로 남겼습니다.`
            : '선택한 학생을 추가하지 못했습니다. 학생을 확인한 뒤 다시 시도해주세요.',
        );
      }
    } catch {
      setError('등록 요청에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const toggleStudent = (student: StudentResponse) => {
    setSelectedStudents((current) =>
      current.some((selected) => selected.id === student.id)
        ? current.filter((selected) => selected.id !== student.id)
        : [...current, student],
    );
    if (error) setError('');
  };

  const removeSelectedStudent = (studentId: number) => {
    setSelectedStudents((current) =>
      current.filter((student) => student.id !== studentId),
    );
    if (error) setError('');
  };

  return (
    <>
      <div
        className="room-modal-backdrop sleepover-create-backdrop"
        onMouseDown={(e) => {
          if (isPending) return;
          backdropMouseDownRef.current = e.target === e.currentTarget;
        }}
        onMouseUp={(e) => {
          if (isPending) return;
          if (e.target === e.currentTarget && backdropMouseDownRef.current) {
            requestClose();
          }
          backdropMouseDownRef.current = false;
        }}
      >
        <div
          className={`room-modal sleepover-modal sleepover-create-modal ${
            isEtcReason ? 'has-custom-reason' : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sleepover-create-title"
        >
          <div className="room-modal-header">
            <div>
              <h2 className="room-modal-title" id="sleepover-create-title">
                외박자 추가
              </h2>
            </div>
            <button
              className="room-modal-close-button"
              onClick={requestClose}
              disabled={isPending}
              type="button"
              aria-label="모달 닫기"
            >
              ✕
            </button>
          </div>

          <form
            className="room-modal-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="room-form-group">
              <div className="sleepover-student-heading">
                <label
                  className="room-form-label"
                  htmlFor="sleepover-student"
                >
                  학생 검색 <span className="required">*</span>
                </label>
                <span className="sleepover-selection-count">
                  {selectedStudents.length}명 선택
                </span>
              </div>
              <input
                id="sleepover-student"
                type="text"
                className="room-form-input"
                placeholder="이름, 호실, 학번으로 검색"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (error) setError('');
                }}
                disabled={isPending}
                autoFocus
              />
              <div className="sleepover-student-list">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const studentNumber = getStudentNumber(student);
                    const isSelected = selectedStudents.some(
                      (selected) => selected.id === student.id,
                    );

                    return (
                      <button
                        key={student.id}
                        type="button"
                        className={`sleepover-student-option ${
                          isSelected ? 'selected' : ''
                        }`}
                        onClick={() => toggleStudent(student)}
                        disabled={isPending}
                        aria-pressed={isSelected}
                      >
                        <span
                          className="sleepover-student-check"
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <svg viewBox="0 0 16 16" focusable="false">
                              <path d="m3.5 8 3 3 6-6" />
                            </svg>
                          )}
                        </span>
                        <span className="sleepover-student-main">
                          {student.room}호 {student.name}
                        </span>
                        <span className="sleepover-student-trailing">
                          <span className="sleepover-student-meta">
                            {studentNumber} ·{' '}
                            {student.gender === 'MALE' ? '남' : '여'}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="sleepover-empty-option">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
              <div
                className={`sleepover-selected-transition ${
                  selectedStudents.length > 0 ? 'expanded' : ''
                }`}
                aria-hidden={selectedStudents.length === 0}
              >
                <section
                  className="sleepover-selected-panel"
                  aria-label="선택한 학생"
                >
                  <p className="sleepover-selected-heading">선택한 학생</p>
                  <ul className="sleepover-selected-students">
                    {selectedStudents.map((student) => (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => removeSelectedStudent(student.id)}
                          disabled={isPending}
                          aria-label={`${student.room}호 ${student.name} 선택 해제`}
                        >
                          {student.room}호 {student.name}
                          <span aria-hidden="true">×</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <div className="room-form-group">
              <label className="room-form-label" htmlFor="sleepover-reason">
                외박 사유 <span className="required">*</span>
              </label>
              <select
                id="sleepover-reason"
                ref={reasonSelectRef}
                className="room-form-input sleepover-reason-select"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                disabled={isPending}
                required
                aria-invalid={error === '외박 사유를 선택해주세요.'}
                aria-describedby={error ? 'sleepover-reason-error' : undefined}
              >
                <option value="" disabled>
                  사유를 선택해주세요
                </option>
                {SLEEPOVER_PIN_REASON_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={SLEEPOVER_PIN_REASON_ETC}>
                  {SLEEPOVER_PIN_REASON_ETC} (직접 입력)
                </option>
              </select>
              {isEtcReason && (
                <input
                  ref={etcReasonInputRef}
                  type="text"
                  className="room-form-input"
                  aria-label="기타 외박 사유"
                  aria-invalid={error === '기타 사유를 입력해주세요.'}
                  aria-describedby={error ? 'sleepover-reason-error' : undefined}
                  placeholder="기타 사유를 입력해주세요"
                  value={etcReason}
                  onChange={(e) => {
                    setEtcReason(e.target.value);
                    if (error) setError('');
                  }}
                  maxLength={100}
                  disabled={isPending}
                  required
                />
              )}
              <div
                className={`sleepover-validation-message ${error ? 'visible' : ''}`}
                aria-live="polite"
                aria-atomic="true"
                aria-hidden={!error}
              >
                <div className="sleepover-validation-message-content">
                  <span className="error-text" id="sleepover-reason-error">
                    {error}
                  </span>
                </div>
              </div>
              {isEtcReason && (
                <div className="input-footer">
                  <span className="char-count">{etcReason.length}/100</span>
                </div>
              )}
            </div>

            <div className="room-modal-actions">
              <button
                type="button"
                className="room-cancel-button"
                onClick={requestClose}
                disabled={isPending}
              >
                취소
              </button>
              <button
                type="submit"
                className="room-submit-button"
                disabled={isPending}
              >
                {isPending ? '추가 중...' : '추가'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </>
  );
}
