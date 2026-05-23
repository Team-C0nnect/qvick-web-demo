import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomService } from '../services/room.service';
import ConfirmationModal from '../components/ConfirmationModal';
import { SearchIcon } from '../components/Icons';
import '../styles/Room.css';
import type { RoomResponse } from '../types/api';

type DeleteTarget =
  | {
      type: 'single';
      roomIds: number[];
      roomName: string;
    }
  | {
      type: 'selected';
      roomIds: number[];
    };

const getRoomFloor = (roomName: string) => roomName.charAt(0) || '-';

const sortRooms = (rooms: RoomResponse[]) =>
  [...rooms].sort((a, b) =>
    a.room.localeCompare(b.room, 'ko-KR', { numeric: true }),
  );

export default function Room() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('전체');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomService.getRooms,
  });

  const createMutation = useMutation({
    mutationFn: async (roomsToCreate: string[]) => {
      for (const room of roomsToCreate) {
        await roomService.createRoom({ room });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsCreateModalOpen(false);
      setNewRoomName('');
      setError('');
    },
    onError: (error: Error) => {
      console.error('Create rooms error:', error);
      setError('일부 방 생성에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roomIds: number[]) => {
      await Promise.all(roomIds.map((id) => roomService.deleteRoom(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSelectedRooms([]);
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      console.error('Delete room error:', error);
    },
  });

  const sortedRooms = useMemo(() => sortRooms(rooms), [rooms]);

  const floors = useMemo(
    () =>
      Array.from(new Set(sortedRooms.map((room) => getRoomFloor(room.room))))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true })),
    [sortedRooms],
  );

  const filteredRooms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sortedRooms.filter((room) => {
      const matchesSearch = !query || room.room.toLowerCase().includes(query);
      const matchesFloor =
        selectedFloor === '전체' || getRoomFloor(room.room) === selectedFloor;
      return matchesSearch && matchesFloor;
    });
  }, [searchTerm, selectedFloor, sortedRooms]);

  const floorGroups = useMemo(() => {
    const grouped = filteredRooms.reduce(
      (acc, room) => {
        const floor = getRoomFloor(room.room);
        if (!acc[floor]) {
          acc[floor] = [];
        }
        acc[floor].push(room);
        return acc;
      },
      {} as Record<string, RoomResponse[]>,
    );

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true }))
      .map((floor) => ({
        floor,
        rooms: sortRooms(grouped[floor]),
      }));
  }, [filteredRooms]);

  const selectedRoomSet = useMemo(
    () => new Set(selectedRooms),
    [selectedRooms],
  );

  const parseRoomsToCreate = (input: string) => {
    const roomsToCreate: string[] = [];
    const parts = input
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const rangeMatch = part.match(/^(\d+)\s*[~-]\s*(\d+)$/);

      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);

        if (start > end) {
          return { roomsToCreate: [], errorMessage: `잘못된 범위입니다: ${part}` };
        }

        for (let room = start; room <= end; room++) {
          roomsToCreate.push(String(room));
        }
      } else {
        roomsToCreate.push(part);
      }
    }

    return { roomsToCreate, errorMessage: '' };
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoomName.trim()) {
      setError('방 번호를 입력해주세요.');
      return;
    }

    const { roomsToCreate, errorMessage } = parseRoomsToCreate(
      newRoomName.trim(),
    );

    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    if (roomsToCreate.length === 0) {
      setError('올바른 방 번호를 입력해주세요.');
      return;
    }

    if (roomsToCreate.length > 20) {
      setError('한 번에 최대 20개의 방까지만 생성할 수 있습니다.');
      return;
    }

    setError('');
    createMutation.mutate(roomsToCreate);
  };

  const requestDeleteRoom = (roomId: number, roomName: string) => {
    setDeleteTarget({ type: 'single', roomIds: [roomId], roomName });
  };

  const requestDeleteSelected = () => {
    if (selectedRooms.length === 0) return;
    setDeleteTarget({ type: 'selected', roomIds: selectedRooms });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.roomIds);
  };

  const handleToggleRoom = (roomId: number) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId],
    );
  };

  const handleSelectAll = (floorRooms: RoomResponse[]) => {
    const floorRoomIds = floorRooms.map((room) => room.id);
    const allSelected = floorRoomIds.every((id) => selectedRoomSet.has(id));

    if (allSelected) {
      setSelectedRooms((prev) =>
        prev.filter((id) => !floorRoomIds.includes(id)),
      );
    } else {
      setSelectedRooms((prev) => [...new Set([...prev, ...floorRoomIds])]);
    }
  };

  const resetCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewRoomName('');
    setError('');
  };

  const handleCloseModal = () => {
    if (createMutation.isPending) return;

    if (newRoomName.trim()) {
      if (window.confirm('작성 중인 내용이 있습니다. 취소하시겠습니까?')) {
        resetCreateModal();
      }
      return;
    }

    resetCreateModal();
  };

  const deleteMessage =
    deleteTarget?.type === 'single'
      ? `${deleteTarget.roomName} 호실을 삭제하시겠습니까?`
      : `선택한 ${deleteTarget?.roomIds.length ?? 0}개 호실을 삭제하시겠습니까?`;

  return (
    <div className="room-page">
      <div className="room-container">
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
              onClick={() => setIsCreateModalOpen(true)}
            >
              방 추가
            </button>
          </div>

          <div className="room-summary-grid">
            <div className="room-summary-item">
              <span className="summary-label">전체 방</span>
              <strong>{rooms.length}</strong>
            </div>
            <div className="room-summary-item">
              <span className="summary-label">선택됨</span>
              <strong>{selectedRooms.length}</strong>
            </div>
            <div className="room-summary-item">
              <span className="summary-label">층</span>
              <strong>{floors.length}</strong>
            </div>
          </div>

          <div className="room-control-row">
            <label className="room-search-box" htmlFor="room-search">
              <SearchIcon className="room-search-icon" />
              <input
                id="room-search"
                className="room-search-input"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  onClick={() => setSelectedFloor(floor)}
                >
                  {floor === '전체' ? '전체' : `${floor}층`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {selectedRooms.length > 0 && (
          <div className="selection-bar">
            <span>{selectedRooms.length}개 호실 선택됨</span>
            <div className="selection-actions">
              <button
                type="button"
                className="clear-selection-button"
                onClick={() => setSelectedRooms([])}
                disabled={deleteMutation.isPending}
              >
                선택 해제
              </button>
              <button
                type="button"
                className="delete-selected-button"
                onClick={requestDeleteSelected}
                disabled={deleteMutation.isPending}
              >
                선택 삭제
              </button>
            </div>
          </div>
        )}

        {deleteMutation.isError && (
          <div className="room-error-banner">
            방 삭제에 실패했습니다. 다시 시도해주세요.
          </div>
        )}

        {isLoading ? (
          <div className="room-loading">로딩 중...</div>
        ) : rooms.length === 0 ? (
          <div className="room-empty-state">
            <strong>등록된 방이 없습니다.</strong>
            <span>방을 추가하여 학생들을 배정하세요.</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="room-empty-state">
            <strong>조건에 맞는 방이 없습니다.</strong>
            <span>검색어나 층 필터를 다시 확인해주세요.</span>
          </div>
        ) : (
          <div className="floor-sections">
            {floorGroups.map((group) => {
              const allSelected = group.rooms.every((room) =>
                selectedRoomSet.has(room.id),
              );

              return (
                <section key={group.floor} className="floor-section">
                  <div className="floor-header">
                    <div>
                      <h2 className="floor-title">{group.floor}층</h2>
                      <p className="floor-count">{group.rooms.length}개 호실</p>
                    </div>
                    <button
                      type="button"
                      className="select-all-button"
                      onClick={() => handleSelectAll(group.rooms)}
                    >
                      {allSelected ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>

                  <div className="room-grid">
                    {group.rooms.map((room) => {
                      const isSelected = selectedRoomSet.has(room.id);

                      return (
                        <div
                          key={room.id}
                          className={`room-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleRoom(room.id)}
                        >
                          <input
                            type="checkbox"
                            className="room-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRoom(room.id)}
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
                                requestDeleteRoom(room.id, room.room);
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
            })}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <div
          className="room-modal-backdrop"
          onMouseDown={(e) => {
            if (createMutation.isPending) return;
            if (e.target === e.currentTarget) {
              e.currentTarget.setAttribute('data-backdrop-mousedown', 'true');
            }
          }}
          onMouseUp={(e) => {
            if (createMutation.isPending) return;
            if (
              e.target === e.currentTarget &&
              e.currentTarget.getAttribute('data-backdrop-mousedown') === 'true'
            ) {
              handleCloseModal();
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
                onClick={handleCloseModal}
                disabled={createMutation.isPending}
                type="button"
                aria-label="모달 닫기"
              >
                ✕
              </button>
            </div>

            <form className="room-modal-form" onSubmit={handleCreateRoom}>
              <div className="room-form-group">
                <label className="room-form-label" htmlFor="room-name">
                  방 번호 <span className="required">*</span>
                </label>
                <input
                  id="room-name"
                  type="text"
                  className="room-form-input"
                  placeholder="예: 101, 102, 103 또는 301~305"
                  value={newRoomName}
                  onChange={(e) => {
                    setNewRoomName(e.target.value);
                    if (error) setError('');
                  }}
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
                  <span className="char-count">{newRoomName.length}/100</span>
                </div>
              </div>

              <div className="room-modal-actions">
                <button
                  type="button"
                  className="room-cancel-button"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="room-submit-button"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="삭제 확인"
        message={deleteMessage}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isConfirming={deleteMutation.isPending}
      />
    </div>
  );
}
