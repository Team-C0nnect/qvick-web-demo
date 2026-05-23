import '../styles/ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  eyebrow?: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  confirmVariant?: 'default' | 'danger';
}

export default function ConfirmationModal({
  isOpen,
  eyebrow,
  title,
  message,
  confirmText = '확인',
  cancelText,
  onConfirm,
  onCancel,
  isConfirming = false,
  confirmVariant = 'default',
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
          <div>
            {eyebrow && (
              <p className="confirmation-modal-eyebrow">{eyebrow}</p>
            )}
            <h2 className="confirmation-modal-title">{title}</h2>
          </div>
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
            className={`confirmation-modal-button confirm ${confirmVariant}`}
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
