import type { DeleteModalState } from '../types/student-management';

interface DeleteStudentModalProps {
  deleteModal: DeleteModalState;
  isPending: boolean;
  onConfirmNameChange: (name: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmDelete: () => void;
  onClose: () => void;
}

export default function DeleteStudentModal({
  deleteModal,
  isPending,
  onConfirmNameChange,
  onPasswordChange,
  onConfirmDelete,
  onClose,
}: DeleteStudentModalProps) {
  if (!deleteModal.student) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container delete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">학생 계정 삭제</h2>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>

        <div className="delete-modal-content">
          <p className="delete-warning">
            ⚠️ 경고: 이 작업은 되돌릴 수 없습니다!
          </p>
          <p className="delete-warning-secondary">
            다음 학생의 계정을 영구적으로 삭제하시겠습니까?
          </p>
          <div className="student-info-card">
            <div className="info-row">
              <span className="info-label">이름</span>
              <span className="info-value">{deleteModal.student.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">학년/반/번호</span>
              <span className="info-value">
                {deleteModal.student.grade}학년 {deleteModal.student.classroom}
                반 {deleteModal.student.number}번
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">성별</span>
              <span className="info-value">
                {deleteModal.student.gender === 'MALE' ? '남' : '여'}
              </span>
            </div>
          </div>

          <div className="password-section">
            <label htmlFor="confirm-name" className="password-label">
              학생 이름 입력 (학생 이름을 정확히 입력해주세요)
            </label>
            <input
              id="confirm-name"
              type="text"
              placeholder={String(deleteModal.student?.name) || '학생 이름'}
              value={deleteModal.confirmName}
              onChange={(e) => onConfirmNameChange(e.target.value)}
              className="password-input"
              disabled={isPending}
            />
          </div>

          <div className="password-section">
            <label htmlFor="delete-password" className="password-label">
              로그인 비밀번호 입력 (확인)
            </label>
            <input
              id="delete-password"
              type="password"
              placeholder="비밀번호를 입력해주세요"
              value={deleteModal.password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="password-input"
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onConfirmDelete();
                }
              }}
            />
            {deleteModal.error && (
              <div className="error-message">{deleteModal.error}</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="modal-btn cancel-btn"
            onClick={onClose}
            disabled={isPending}
          >
            취소
          </button>
          <button
            className="modal-btn delete-btn"
            onClick={onConfirmDelete}
            disabled={
              isPending || !deleteModal.password || !deleteModal.confirmName
            }
          >
            {isPending ? '확인 중...' : '계정 삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
