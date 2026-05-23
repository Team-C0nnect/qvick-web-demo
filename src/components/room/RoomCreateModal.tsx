import '../../styles/RoomModal.css';

interface RoomCreateModalProps {
  roomName: string;
  error: string;
  isPending: boolean;
  onRoomNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export default function RoomCreateModal({
  roomName,
  error,
  isPending,
  onRoomNameChange,
  onClose,
  onSubmit,
}: RoomCreateModalProps) {
  return (
    <div
      className="room-modal-backdrop"
      onMouseDown={(e) => {
        if (isPending) return;
        if (e.target === e.currentTarget) {
          e.currentTarget.setAttribute('data-backdrop-mousedown', 'true');
        }
      }}
      onMouseUp={(e) => {
        if (isPending) return;
        if (
          e.target === e.currentTarget &&
          e.currentTarget.getAttribute('data-backdrop-mousedown') === 'true'
        ) {
          onClose();
        }
        e.currentTarget.removeAttribute('data-backdrop-mousedown');
      }}
    >
      <div className="room-modal">
        <div className="room-modal-header">
          <div>
            <p className="room-modal-eyebrow">Create rooms</p>
            <h2 className="room-modal-title">방 추가</h2>
          </div>
          <button
            className="room-modal-close-button"
            onClick={onClose}
            disabled={isPending}
            type="button"
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>

        <form className="room-modal-form" onSubmit={onSubmit}>
          <div className="room-form-group">
            <label className="room-form-label" htmlFor="room-name">
              방 번호 <span className="required">*</span>
            </label>
            <input
              id="room-name"
              type="text"
              className="room-form-input"
              placeholder="예: 101, 102, 103 또는 301~305"
              value={roomName}
              onChange={(e) => onRoomNameChange(e.target.value)}
              maxLength={100}
              autoFocus
              required
            />
            <p className="input-helper">
              쉼표로 여러 방을 구분하거나, 301~305처럼 범위를 입력할 수
              있습니다.
            </p>
            <div className="input-footer">
              {error ? (
                <span className="error-text">{error}</span>
              ) : (
                <span className="input-example">최대 20개까지 한 번에 추가</span>
              )}
              <span className="char-count">{roomName.length}/100</span>
            </div>
          </div>

          <div className="room-modal-actions">
            <button
              type="button"
              className="room-cancel-button"
              onClick={onClose}
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
