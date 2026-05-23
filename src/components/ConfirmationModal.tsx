import '../styles/ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText,
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (isConfirming) return;
    onCancel();
  };

  return (
    <div className="confirmation-modal-backdrop" onClick={handleCancel}>
      <div
        className="confirmation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirmation-modal-header">
          <h2 className="confirmation-modal-title">{title}</h2>
          <button
            type="button"
            className="confirmation-modal-close-button"
            onClick={handleCancel}
            disabled={isConfirming}
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>
        <div className="confirmation-modal-content">
          <p>{message}</p>
        </div>
        <div className="confirmation-modal-footer">
          {cancelText && (
            <button
              className="confirmation-modal-button cancel"
              onClick={handleCancel}
              disabled={isConfirming}
            >
              {cancelText}
            </button>
          )}
          <button
            className="confirmation-modal-button confirm"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
