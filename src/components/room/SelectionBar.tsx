interface SelectionBarProps {
  selectedCount: number;
  isDeleting: boolean;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}

export default function SelectionBar({
  selectedCount,
  isDeleting,
  onClearSelection,
  onDeleteSelected,
}: SelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="selection-bar">
      <span>{selectedCount}개 호실 선택됨</span>
      <div className="selection-actions">
        <button
          type="button"
          className="clear-selection-button"
          onClick={onClearSelection}
          disabled={isDeleting}
        >
          선택 해제
        </button>
        <button
          type="button"
          className="delete-selected-button"
          onClick={onDeleteSelected}
          disabled={isDeleting}
        >
          선택 삭제
        </button>
      </div>
    </div>
  );
}
