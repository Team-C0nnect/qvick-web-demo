import { useRef, useState } from 'react';
import '../../styles/RoomModal.css';
import { PHONE_BOX_GENDER_LABEL } from '../../utils/phone-box';
import type { CreatePhoneBoxRequest, PhoneBoxGender } from '../../types/api';

const NAME_MAX_LENGTH = 50;
const GENDER_OPTIONS: PhoneBoxGender[] = ['MALE', 'FEMALE'];

interface PhoneBoxCreateModalProps {
  defaultGender: PhoneBoxGender;
  isPending: boolean;
  requestError: string;
  onClose: () => void;
  onSubmit: (data: CreatePhoneBoxRequest) => void;
}

export default function PhoneBoxCreateModal({
  defaultGender,
  isPending,
  requestError,
  onClose,
  onSubmit,
}: PhoneBoxCreateModalProps) {
  const backdropMouseDownRef = useRef(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<PhoneBoxGender>(defaultGender);
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

    setError('');
    onSubmit({ name: trimmedName, gender });
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
            <p className="room-modal-eyebrow">Create phone box</p>
            <h2 className="room-modal-title">제출함 추가</h2>
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
            <label className="room-form-label" htmlFor="phonebox-name">
              제출함 이름 <span className="required">*</span>
            </label>
            <input
              id="phonebox-name"
              type="text"
              className="room-form-input"
              placeholder="예: 1층 남자 제출함"
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
              {error ? <span className="error-text">{error}</span> : <span />}
              <span className="char-count">
                {name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="room-form-group">
            <span className="room-form-label">
              기숙사 <span className="required">*</span>
            </span>
            <div className="phonebox-gender-options" role="radiogroup" aria-label="기숙사 선택">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={gender === option}
                  className={`phonebox-gender-option ${gender === option ? 'active' : ''}`}
                  onClick={() => setGender(option)}
                  disabled={isPending}
                >
                  {PHONE_BOX_GENDER_LABEL[option]}
                </button>
              ))}
            </div>
            <p className="input-helper">
              선택한 기숙사의 학생만 이 제출함에 배정할 수 있습니다.
            </p>
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
              {isPending ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
