import { useRef, useState } from 'react';
import '../../styles/RoomModal.css';
import { PHONE_BOX_GENDER_LABEL } from '../../utils/phone-box';
import type { PhoneBoxResponse } from '../../types/api';

const NAME_MAX_LENGTH = 50;

interface PhoneBoxEditModalProps {
  box: PhoneBoxResponse;
  isPending: boolean;
  requestError: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export default function PhoneBoxEditModal({
  box,
  isPending,
  requestError,
  onClose,
  onSubmit,
}: PhoneBoxEditModalProps) {
  const backdropMouseDownRef = useRef(false);
  const [name, setName] = useState(box.name);
  const [error, setError] = useState('');

  const requestClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('제출함 이름을 입력해주세요.');
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setError(`제출함 이름은 ${NAME_MAX_LENGTH}자 이내로 입력해주세요.`);
      return;
    }

    if (trimmedName === box.name) {
      setError('기존 이름과 다른 이름을 입력해주세요.');
      return;
    }

    setError('');
    onSubmit(trimmedName);
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
            <p className="room-modal-eyebrow">Rename phone box</p>
            <h2 className="room-modal-title">제출함 이름 수정</h2>
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
            <label className="room-form-label" htmlFor="phonebox-edit-name">
              제출함 이름 <span className="required">*</span>
            </label>
            <input
              id="phonebox-edit-name"
              type="text"
              className="room-form-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              maxLength={NAME_MAX_LENGTH}
              disabled={isPending}
              autoFocus
            />
            <div className="input-footer">
              {error ? (
                <span className="error-text">{error}</span>
              ) : (
                <span className="input-example">
                  {PHONE_BOX_GENDER_LABEL[box.gender]} · 학생 {box.students.length}명
                </span>
              )}
              <span className="char-count">
                {name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
          </div>

          {requestError && (
            <div className="input-footer">
              <span className="error-text">{requestError}</span>
            </div>
          )}

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
              {isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
