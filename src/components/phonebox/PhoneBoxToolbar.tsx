import { SearchIcon } from '../Icons';
import type { PhoneBoxGender } from '../../types/api';

export type GenderFilter = 'ALL_BOXES' | PhoneBoxGender;

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: 'ALL_BOXES', label: '전체' },
  { value: 'MALE', label: '남기숙사' },
  { value: 'FEMALE', label: '여기숙사' },
];

interface PhoneBoxToolbarProps {
  searchTerm: string;
  selectedGender: GenderFilter;
  onSearchChange: (value: string) => void;
  onGenderChange: (gender: GenderFilter) => void;
  onCreateBox: () => void;
}

export default function PhoneBoxToolbar({
  searchTerm,
  selectedGender,
  onSearchChange,
  onGenderChange,
  onCreateBox,
}: PhoneBoxToolbarProps) {
  return (
    <section className="room-toolbar" aria-labelledby="phonebox-page-title">
      <div className="room-toolbar-main">
        <div>
          <p className="room-eyebrow">Phone Box Management</p>
          <h1 id="phonebox-page-title" className="room-title">
            휴대폰 제출함 관리
          </h1>
        </div>
        <button
          type="button"
          className="create-room-button"
          onClick={onCreateBox}
        >
          제출함 추가
        </button>
      </div>

      <div className="room-control-row">
        <label className="room-search-box" htmlFor="phonebox-search">
          <SearchIcon className="room-search-icon" />
          <input
            id="phonebox-search"
            className="room-search-input"
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="제출함 이름 검색"
          />
        </label>

        <div className="room-floor-filters" aria-label="기숙사 필터">
          {GENDER_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`floor-filter-button ${
                selectedGender === filter.value ? 'active' : ''
              }`}
              onClick={() => onGenderChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
