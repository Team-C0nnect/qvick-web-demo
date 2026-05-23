import { useMemo, useRef, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import '../styles/RoomModal.css';
import '../styles/Sleepover.css';
import type { StudentResponse } from '../types/api';

interface SleepoverCreateModalProps {
  students: StudentResponse[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (studentId: number, reason: string) => void;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] =
    useState<StudentResponse | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const hasDraft = Boolean(selectedStudent || searchTerm.trim() || reason.trim());

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

  const displayedStudents = selectedStudent
    ? [selectedStudent]
    : filteredStudents;

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
      setError('외박 처리할 학생을 선택해주세요.');
      return;
    }

    if (!reason.trim()) {
      setError('외박 사유를 입력해주세요.');
      return;
    }

    setError('');
    onSubmit(selectedStudent.id, reason.trim());
  };

  const handleSelectStudent = (student: StudentResponse) => {
    setSelectedStudent(student);
    setSearchTerm(student.name);
    if (error) setError('');
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
              <p className="room-modal-eyebrow">Create sleepover</p>
              <h2 className="room-modal-title">외박자 추가</h2>
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
              <label className="room-form-label" htmlFor="sleepover-student">
                학생 검색 <span className="required">*</span>
              </label>
              <input
                id="sleepover-student"
                type="text"
                className="room-form-input"
                placeholder="이름, 호실, 학번으로 검색"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedStudent(null);
                  if (error) setError('');
                }}
                disabled={isPending}
                autoFocus
              />
              <div className="sleepover-student-list">
                {displayedStudents.length > 0 ? (
                  displayedStudents.map((student) => {
                    const studentNumber = getStudentNumber(student);
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
                            : `${studentNumber} · ${
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

            <div className="room-form-group">
              <label className="room-form-label" htmlFor="sleepover-reason">
                외박 사유 <span className="required">*</span>
              </label>
              <textarea
                id="sleepover-reason"
                className="room-form-input sleepover-reason-input"
                placeholder="예: 가정학습, 병원 진료"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                maxLength={100}
                disabled={isPending}
                required
              />
              <div className="input-footer">
                {error ? (
                  <span className="error-text">{error}</span>
                ) : (
                  <span className="input-example">선택 날짜에 외박자로 추가</span>
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
                {isPending ? '추가 중...' : '추가'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDiscardConfirmOpen}
        eyebrow="Discard changes"
        title="작성 내용을 버릴까요?"
        message="입력 중인 외박 정보가 사라집니다."
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
