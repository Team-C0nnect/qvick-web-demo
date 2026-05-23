import { SearchIcon } from '../Icons';

interface RoomToolbarProps {
  floors: string[];
  searchTerm: string;
  selectedFloor: string;
  onSearchChange: (value: string) => void;
  onFloorChange: (floor: string) => void;
  onCreateRoom: () => void;
}

export default function RoomToolbar({
  floors,
  searchTerm,
  selectedFloor,
  onSearchChange,
  onFloorChange,
  onCreateRoom,
}: RoomToolbarProps) {
  return (
    <section className="room-toolbar" aria-labelledby="room-page-title">
      <div className="room-toolbar-main">
        <div>
          <p className="room-eyebrow">Room Management</p>
          <h1 id="room-page-title" className="room-title">
            방 관리
          </h1>
        </div>
        <button
          type="button"
          className="create-room-button"
          onClick={onCreateRoom}
        >
          방 추가
        </button>
      </div>

      <div className="room-control-row">
        <label className="room-search-box" htmlFor="room-search">
          <SearchIcon className="room-search-icon" />
          <input
            id="room-search"
            className="room-search-input"
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="방 번호 검색"
          />
        </label>

        <div className="room-floor-filters" aria-label="층 필터">
          {['전체', ...floors].map((floor) => (
            <button
              key={floor}
              type="button"
              className={`floor-filter-button ${
                selectedFloor === floor ? 'active' : ''
              }`}
              onClick={() => onFloorChange(floor)}
            >
              {floor === '전체' ? '전체' : `${floor}층`}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
