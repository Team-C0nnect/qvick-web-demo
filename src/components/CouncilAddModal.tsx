import { useMemo, useRef, useState } from 'react';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import '../styles/RoomModal.css';
import '../styles/Sleepover.css';
import type { StudentResponse } from '../types/api';

interface CouncilAddModalProps {
  students: StudentResponse[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (studentId: number) => void;
}

const getStudentNumber = (student: StudentResponse) =>
  `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

export default function CouncilAddModal({
  students,
  isPending,
  onClose,
  onSubmit,
}: CouncilAddModalProps) {
  const backdropMouseDownRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null);
  const [error, setError] = useState('');

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const sorted = [...students].sort((a, b) => {
      const roomDiff = a.room.localeCompare(b.room, 'ko-KR', { numeric: true });
      if (roomDiff !== 0) return roomDiff;
      return getStudentNumber(a).localeCompare(getStudentNumber(b), 'ko-KR', { numeric: true });
    });
    if (!query) return sorted.slice(0, 8);
    return sorted
      .filter((s) => {
        const studentNumber = getStudentNumber(s);
        return (
          matchesKoreanNameSearch(s.name, searchTerm) ||
          s.room.toLowerCase().includes(query) ||
          studentNumber.includes(query)
        );
      })
      .slice(0, 8);
  }, [searchTerm, students]);

  const displayedStudents = selectedStudent ? [selectedStudent] : filteredStudents;

  const requestClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent) {
      setError('자치위원으로 설정할 학생을 선택해주세요.');
      return;
    }
    setError('');
    onSubmit(selectedStudent.id);
  };

  const handleSelectStudent = (student: StudentResponse) => {
    setSelectedStudent(student);
    setSearchTerm(student.name);
    if (error) setError('');
  };

  return (
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
      <div className="room-modal">
        <div className="room-modal-header">
          <div>
            <p className="room-modal-eyebrow">Grant council role</p>
            <h2 className="room-modal-title">자치위원 추가</h2>
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
            <label className="room-form-label" htmlFor="council-student">
              학생 검색 <span className="required">*</span>
            </label>
            <input
              id="council-student"
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
                      className={`sleepover-student-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectStudent(student)}
                      disabled={isPending}
                    >
                      <span className="sleepover-student-main">
                        {student.room}호 {student.name}
                      </span>
                      <span className="sleepover-student-meta">
                        {isSelected
                          ? '선택됨'
                          : `${studentNumber} · ${student.gender === 'MALE' ? '남' : '여'}`}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="sleepover-empty-option">검색 결과가 없습니다.</div>
              )}
            </div>
            {error && (
              <div className="input-footer">
                <span className="error-text">{error}</span>
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
  );
}
