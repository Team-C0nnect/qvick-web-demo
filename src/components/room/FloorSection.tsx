import type { RoomResponse } from '../../types/api';

interface FloorSectionProps {
  floor: string;
  rooms: RoomResponse[];
  selectedRoomSet: Set<number>;
  onSelectAll: (rooms: RoomResponse[]) => void;
  onToggleRoom: (roomId: number) => void;
  onDeleteRoom: (roomId: number, roomName: string) => void;
}

export default function FloorSection({
  floor,
  rooms,
  selectedRoomSet,
  onSelectAll,
  onToggleRoom,
  onDeleteRoom,
}: FloorSectionProps) {
  const allSelected = rooms.every((room) => selectedRoomSet.has(room.id));

  return (
    <section className="floor-section">
      <div className="floor-header">
        <div>
          <h2 className="floor-title">{floor}층</h2>
          <p className="floor-count">{rooms.length}개 호실</p>
        </div>
        <button
          type="button"
          className="select-all-button"
          onClick={() => onSelectAll(rooms)}
        >
          {allSelected ? '전체 해제' : '전체 선택'}
        </button>
      </div>

      <div className="room-grid">
        {rooms.map((room) => {
          const isSelected = selectedRoomSet.has(room.id);

          return (
            <div
              key={room.id}
              className={`room-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleRoom(room.id)}
            >
              <input
                type="checkbox"
                className="room-checkbox"
                checked={isSelected}
                onChange={() => onToggleRoom(room.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${room.room} 호실 선택`}
              />
              <span className="room-name">{room.room}</span>
              <span className="room-card-actions">
                <button
                  type="button"
                  className="delete-room-button"
                  aria-label={`${room.room} 호실 삭제`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRoom(room.id, room.room);
                  }}
                >
                  삭제
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
