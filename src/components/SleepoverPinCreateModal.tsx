import { useMemo, useRef, useState } from 'react';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { getStudentNumber, sortStudents } from '../utils/phone-box';
import { formatLocalDate } from '../utils/date';
import SleepoverReasonPicker from './SleepoverReasonPicker';
import {
  SLEEPOVER_PIN_REASON_ETC,
  isPastSleepoverPinDate,
  isValidSleepoverPinRange,
} from '../utils/sleepover-pin';
import '../styles/RoomModal.css';
import '../styles/Sleepover.css';
import '../styles/SleepoverCreateModal.css';
import type { CreateSleepoverPinRequest, StudentResponse } from '../types/api';

interface SleepoverPinCreateModalProps {
  students: StudentResponse[];
  defaultStartDate: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (
    studentIds: number[],
    data: Omit<CreateSleepoverPinRequest, 'studentId'>,
  ) => Promise<number[]>;
}

export default function SleepoverPinCreateModal({
  students,
  defaultStartDate,
  isPending,
  onClose,
  onSubmit,
}: SleepoverPinCreateModalProps) {
  const backdropMouseDownRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StudentResponse[]>(
    [],
  );
  // 서버가 과거 날짜를 거부하므로 기본값은 오늘 이후로 맞춥니다.
  const today = formatLocalDate();
  const [startDate, setStartDate] = useState(
    defaultStartDate < today ? today : defaultStartDate,
  );
  const [endDate, setEndDate] = useState('');
  // reason: 선택지 값 또는 '기타', etcReason: '기타'일 때 직접 입력한 사유
  const [reason, setReason] = useState('');
  const [etcReason, setEtcReason] = useState('');
  const [error, setError] = useState('');

  const isEtcReason = reason === SLEEPOVER_PIN_REASON_ETC;

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const sortedStudents = sortStudents(students);

    if (!query) return sortedStudents;

    return sortedStudents
      .filter((student) => {
        const studentNumber = getStudentNumber(student);
        return (
          matchesKoreanNameSearch(student.name, searchTerm) ||
          student.room.toLowerCase().includes(query) ||
          studentNumber.includes(query)
        );
      });
  }, [searchTerm, students]);

  const clearError = () => {
    if (error) setError('');
  };

  const requestClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedStudents.length === 0) {
      setError('외박을 고정할 학생을 한 명 이상 선택해주세요.');
      return;
    }

    if (!startDate || !endDate) {
      setError('시작일과 종료일을 모두 입력해주세요.');
      return;
    }

    if (
      isPastSleepoverPinDate(startDate, today) ||
      isPastSleepoverPinDate(endDate, today)
    ) {
      setError('오늘 이후 날짜만 고정할 수 있습니다.');
      return;
    }

    if (!isValidSleepoverPinRange(startDate, endDate)) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }

    if (isEtcReason && !etcReason.trim()) {
      setError('기타 사유를 입력해주세요.');
      return;
    }

    setError('');
    try {
      const selectedIds = selectedStudents.map((student) => student.id);
      const failedIds = await onSubmit(selectedIds, {
        startDate,
        endDate,
        reason: (isEtcReason ? etcReason.trim() : reason) || null,
      });

      if (failedIds.length > 0) {
        const failedIdSet = new Set(failedIds);
        const failedStudents = selectedStudents.filter((student) =>
          failedIdSet.has(student.id),
        );
        const succeededCount = selectedIds.length - failedStudents.length;

        setSelectedStudents(failedStudents);
        setError(
          succeededCount > 0
            ? `${succeededCount}명은 등록했고 ${failedStudents.length}명은 실패했습니다. 실패 학생만 선택 상태로 남겼습니다.`
            : '선택한 학생을 등록하지 못했습니다. 학생과 기간을 확인한 뒤 다시 시도해주세요.',
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
    clearError();
  };

  const removeSelectedStudent = (studentId: number) => {
    setSelectedStudents((current) =>
      current.filter((student) => student.id !== studentId),
    );
    clearError();
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
            selectedStudents.length > 0 ? 'has-selected-students' : ''
          } ${isEtcReason ? 'has-custom-reason' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sleepover-pin-create-title"
        >
          <div className="room-modal-header">
            <div>
              <h2
                className="room-modal-title"
                id="sleepover-pin-create-title"
              >
                고정 외박 등록
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

          <form className="room-modal-form" onSubmit={handleSubmit}>
            <div className="room-form-group">
              <div className="sleepover-student-heading">
                <label
                  className="room-form-label"
                  htmlFor="sleepover-pin-student"
                >
                  학생 검색 <span className="required">*</span>
                </label>
                <span className="sleepover-selection-count">
                  {selectedStudents.length}명 선택
                </span>
              </div>
              <input
                id="sleepover-pin-student"
                type="text"
                className="room-form-input"
                placeholder="이름, 호실, 학번으로 검색"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  clearError();
                }}
                disabled={isPending}
                autoFocus
              />
              <div className="sleepover-student-list">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
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
                            {getStudentNumber(student)} ·{' '}
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

            <div className="sleepover-pin-date-fields">
              <div className="room-form-group">
                <label
                  className="room-form-label"
                  htmlFor="sleepover-pin-start-date"
                >
                  시작일 <span className="required">*</span>
                </label>
                <input
                  id="sleepover-pin-start-date"
                  type="date"
                  className="room-form-input"
                  value={startDate}
                  min={today}
                  max={endDate || undefined}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    clearError();
                  }}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="room-form-group">
                <label
                  className="room-form-label"
                  htmlFor="sleepover-pin-end-date"
                >
                  종료일 <span className="required">*</span>
                </label>
                <input
                  id="sleepover-pin-end-date"
                  type="date"
                  className="room-form-input"
                  value={endDate}
                  min={startDate > today ? startDate : today}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    clearError();
                  }}
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            <div className="room-form-group">
              <label className="room-form-label" htmlFor="sleepover-pin-reason">
                외박 사유
              </label>
              <SleepoverReasonPicker
                id="sleepover-pin-reason"
                value={reason}
                placeholder="사유 없음"
                allowNoReason
                disabled={isPending}
                onChange={(nextReason) => {
                  setReason(nextReason);
                  clearError();
                }}
              />
              {isEtcReason && (
                <input
                  type="text"
                  className="room-form-input"
                  aria-label="기타 외박 사유"
                  placeholder="사유를 입력해주세요"
                  value={etcReason}
                  maxLength={100}
                  onChange={(e) => {
                    setEtcReason(e.target.value);
                    clearError();
                  }}
                  disabled={isPending}
                />
              )}
              <div className="input-footer">
                {error ? (
                  <span className="error-text">{error}</span>
                ) : (
                  <span className="input-example">
                    기간 동안 휴대폰 제출·인원 확인에서 외박으로 자동 처리
                  </span>
                )}
              </div>
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
                {isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </>
  );
}
