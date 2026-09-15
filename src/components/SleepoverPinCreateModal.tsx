import { useMemo, useRef, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { getStudentNumber, sortStudents } from '../utils/phone-box';
import { isValidSleepoverPinRange } from '../utils/sleepover-pin';
import '../styles/RoomModal.css';
import '../styles/Sleepover.css';
import type { CreateSleepoverPinRequest, StudentResponse } from '../types/api';

interface SleepoverPinCreateModalProps {
  students: StudentResponse[];
  defaultStartDate: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSleepoverPinRequest) => void;
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
  const [selectedStudent, setSelectedStudent] =
    useState<StudentResponse | null>(null);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const hasDraft = Boolean(
    selectedStudent || searchTerm.trim() || endDate || reason.trim(),
  );

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const sortedStudents = sortStudents(students);

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

  const displayedStudents = selectedStudent
    ? [selectedStudent]
    : filteredStudents;

  const clearError = () => {
    if (error) setError('');
  };

  const requestClose = () => {
    if (isPending) return;
    if (hasDraft) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedStudent) {
      setError('외박을 고정할 학생을 선택해주세요.');
      return;
    }

    if (!startDate || !endDate) {
      setError('시작일과 종료일을 모두 입력해주세요.');
      return;
    }

    if (!isValidSleepoverPinRange(startDate, endDate)) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }

    setError('');
    onSubmit({
      studentId: selectedStudent.id,
      startDate,
      endDate,
      reason: reason.trim() || null,
    });
  };

  const handleSelectStudent = (student: StudentResponse) => {
    setSelectedStudent(student);
    setSearchTerm(student.name);
    clearError();
  };

  return (
    <>
      <div
        className="room-modal-backdrop"
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
        <div className="room-modal sleepover-modal">
          <div className="room-modal-header">
            <div>
              <p className="room-modal-eyebrow">Pin sleepover</p>
              <h2 className="room-modal-title">고정 외박 등록</h2>
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
              <label className="room-form-label" htmlFor="sleepover-pin-student">
                학생 검색 <span className="required">*</span>
              </label>
              <input
                id="sleepover-pin-student"
                type="text"
                className="room-form-input"
                placeholder="이름, 호실, 학번으로 검색"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedStudent(null);
                  clearError();
                }}
                disabled={isPending}
                autoFocus
              />
              <div className="sleepover-student-list">
                {displayedStudents.length > 0 ? (
                  displayedStudents.map((student) => {
                    const isSelected = selectedStudent?.id === student.id;

                    return (
                      <button
                        key={student.id}
                        type="button"
                        className={`sleepover-student-option ${
                          isSelected ? 'selected' : ''
                        }`}
                        onClick={() => handleSelectStudent(student)}
                        disabled={isPending}
                      >
                        <span className="sleepover-student-main">
                          {student.room}호 {student.name}
                        </span>
                        <span className="sleepover-student-meta">
                          {isSelected
                            ? '선택됨'
                            : `${getStudentNumber(student)} · ${
                                student.gender === 'MALE' ? '남' : '여'
                              }`}
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
                  min={startDate || undefined}
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
              <textarea
                id="sleepover-pin-reason"
                className="room-form-input sleepover-reason-input"
                placeholder="예: 취업, 장기 병가"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  clearError();
                }}
                maxLength={100}
                disabled={isPending}
              />
              <div className="input-footer">
                {error ? (
                  <span className="error-text">{error}</span>
                ) : (
                  <span className="input-example">
                    기간 동안 휴대폰 제출·인원 확인에서 외박으로 자동 처리
                  </span>
                )}
                <span className="char-count">{reason.length}/100</span>
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

      <ConfirmationModal
        isOpen={isDiscardConfirmOpen}
        eyebrow="Discard changes"
        title="작성 내용을 버릴까요?"
        message="입력 중인 고정 외박 정보가 사라집니다."
        confirmText="버리기"
        cancelText="계속 작성"
        confirmVariant="danger"
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          onClose();
        }}
        onCancel={() => setIsDiscardConfirmOpen(false)}
      />
    </>
  );
}
