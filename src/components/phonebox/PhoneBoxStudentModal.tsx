import { useMemo, useRef, useState } from 'react';
import '../../styles/RoomModal.css';
import '../../styles/Sleepover.css';
import { matchesKoreanNameSearch } from '../../utils/korean-search';
import {
  GENDER_SHORT_LABEL,
  PHONE_BOX_GENDER_LABEL,
  canAssignStudent,
  getStudentNumber,
  sortStudents,
} from '../../utils/phone-box';
import type { PhoneBoxResponse, StudentResponse } from '../../types/api';

const SEARCH_RESULT_LIMIT = 30;

interface PhoneBoxStudentModalProps {
  box: PhoneBoxResponse;
  students: StudentResponse[];
  isStudentsLoading: boolean;
  isAdding: boolean;
  isRemoving: boolean;
  requestError: string;
  onClose: () => void;
  onAddStudents: (studentIds: number[]) => Promise<void>;
  onRemoveStudent: (student: { id: number; name: string }) => void;
}

export default function PhoneBoxStudentModal({
  box,
  students,
  isStudentsLoading,
  isAdding,
  isRemoving,
  requestError,
  onClose,
  onAddStudents,
  onRemoveStudent,
}: PhoneBoxStudentModalProps) {
  const backdropMouseDownRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState('');

  const isPending = isAdding || isRemoving;

  const assignedStudents = useMemo(
    () => sortStudents(box.students),
    [box.students],
  );

  const assignedIdSet = useMemo(
    () => new Set(box.students.map((student) => student.id)),
    [box.students],
  );

  /** 제출함 성별과 일치하는 학생만 후보로 노출 */
  const eligibleStudents = useMemo(
    () =>
      sortStudents(
        students.filter((student) =>
          canAssignStudent(box.gender, student.gender),
        ),
      ),
    [box.gender, students],
  );

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return eligibleStudents;

    return eligibleStudents.filter((student) => {
      const studentNumber = getStudentNumber(student);
      return (
        matchesKoreanNameSearch(student.name, searchTerm) ||
        student.room.toLowerCase().includes(query) ||
        studentNumber.includes(query)
      );
    });
  }, [eligibleStudents, searchTerm]);

  const visibleResults = searchResults.slice(0, SEARCH_RESULT_LIMIT);
  const hiddenResultCount = searchResults.length - visibleResults.length;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const requestClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleToggleStudent = (studentId: number) => {
    if (assignedIdSet.has(studentId)) return;

    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );

    if (error) setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedIds.length === 0) {
      setError('추가할 학생을 선택해주세요.');
      return;
    }

    setError('');

    try {
      await onAddStudents(selectedIds);
      setSelectedIds([]);
    } catch {
      // 실패 시 선택을 유지해 다시 시도할 수 있도록 하고, 에러 메시지는 부모에서 표시한다.
    }
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
      <div className="room-modal phonebox-modal">
        <div className="room-modal-header">
          <div>
            <p className="room-modal-eyebrow">Manage students</p>
            <h2 className="room-modal-title">{box.name}</h2>
            <p className="phonebox-modal-subtitle">
              <span className={`phonebox-gender-badge ${box.gender.toLowerCase()}`}>
                {PHONE_BOX_GENDER_LABEL[box.gender]}
              </span>
              등록 학생 {assignedStudents.length}명
            </p>
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

        <form className="phonebox-modal-form" onSubmit={handleSubmit}>
          <div className="phonebox-modal-body">
            <div className="room-form-group">
              <label className="room-form-label" htmlFor="phonebox-student-search">
                학생 추가
              </label>
              <input
                id="phonebox-student-search"
                type="text"
                className="room-form-input"
                placeholder="이름, 호실, 학번으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isPending}
                autoFocus
              />
              <p className="input-helper">
                {box.gender === 'ALL'
                  ? '모든 학생을 추가할 수 있습니다.'
                  : `${PHONE_BOX_GENDER_LABEL[box.gender]} 제출함이므로 ${GENDER_SHORT_LABEL[box.gender]}학생만 추가할 수 있습니다.`}
              </p>

              <div className="sleepover-student-list phonebox-student-list">
                {isStudentsLoading ? (
                  <div className="sleepover-empty-option">
                    학생 목록을 불러오는 중입니다.
                  </div>
                ) : visibleResults.length > 0 ? (
                  visibleResults.map((student) => {
                    const isAssigned = assignedIdSet.has(student.id);
                    const isSelected = selectedIdSet.has(student.id);

                    return (
                      <button
                        key={student.id}
                        type="button"
                        className={`sleepover-student-option ${isSelected ? 'selected' : ''} ${
                          isAssigned ? 'assigned' : ''
                        }`}
                        onClick={() => handleToggleStudent(student.id)}
                        disabled={isPending || isAssigned}
                        aria-pressed={isSelected}
                      >
                        <span className="sleepover-student-main">
                          {student.room}호 {student.name}
                        </span>
                        <span className="sleepover-student-meta">
                          {isAssigned
                            ? '추가됨'
                            : `${getStudentNumber(student)} · ${GENDER_SHORT_LABEL[student.gender]}`}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="sleepover-empty-option">
                    {searchTerm
                      ? '검색 결과가 없습니다.'
                      : '추가할 수 있는 학생이 없습니다.'}
                  </div>
                )}
              </div>

              <div className="input-footer">
                {error ? (
                  <span className="error-text">{error}</span>
                ) : (
                  <span className="input-example">
                    {hiddenResultCount > 0
                      ? `외 ${hiddenResultCount}명 · 검색으로 좁혀보세요`
                      : '여러 명을 선택해 한 번에 추가할 수 있습니다'}
                  </span>
                )}
                <span className="char-count">{selectedIds.length}명 선택됨</span>
              </div>
            </div>

            <div className="room-form-group">
              <div className="phonebox-section-head">
                <span className="room-form-label">
                  등록된 학생 ({assignedStudents.length}명)
                </span>
              </div>

              <div className="sleepover-student-list phonebox-student-list">
                {assignedStudents.length > 0 ? (
                  assignedStudents.map((student) => (
                    <div key={student.id} className="phonebox-assigned-row">
                      <span className="sleepover-student-main">
                        {student.room}호 {student.name}
                      </span>
                      <span className="phonebox-assigned-meta">
                        <span className="sleepover-student-meta">
                          {getStudentNumber(student)} ·{' '}
                          {GENDER_SHORT_LABEL[student.gender]}
                        </span>
                        <button
                          type="button"
                          className="phonebox-remove-button"
                          onClick={() =>
                            onRemoveStudent({ id: student.id, name: student.name })
                          }
                          disabled={isPending}
                        >
                          제거
                        </button>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="sleepover-empty-option">
                    아직 등록된 학생이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {requestError && (
              <div className="sleepover-message error">{requestError}</div>
            )}
          </div>

          <div className="room-modal-actions phonebox-modal-actions">
            <button
              type="button"
              className="room-cancel-button"
              onClick={requestClose}
              disabled={isPending}
            >
              닫기
            </button>
            <button
              type="submit"
              className="room-submit-button"
              disabled={isPending || selectedIds.length === 0}
            >
              {isAdding
                ? '추가 중...'
                : `${selectedIds.length > 0 ? `${selectedIds.length}명 ` : ''}추가`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
