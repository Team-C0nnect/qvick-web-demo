import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from '../components/ConfirmationModal';
import FloorSection from '../components/room/FloorSection';
import RoomCreateModal from '../components/room/RoomCreateModal';
import RoomToolbar from '../components/room/RoomToolbar';
import SelectionBar from '../components/room/SelectionBar';
import { roomService } from '../services/room.service';
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
      resetCreateModal();
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
        if (!acc[floor]) acc[floor] = [];
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

  const resetCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewRoomName('');
    setError('');
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

  const handleToggleRoom = (roomId: number) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId],
    );
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

  const handleRoomNameChange = (value: string) => {
    setNewRoomName(value);
    if (error) setError('');
  };

  const deleteMessage =
    deleteTarget?.type === 'single'
      ? `${deleteTarget.roomName} 호실을 삭제하시겠습니까?`
      : `선택한 ${deleteTarget?.roomIds.length ?? 0}개 호실을 삭제하시겠습니까?`;

  return (
    <div className="room-page">
      <div className="room-container">
        <RoomToolbar
          floors={floors}
          searchTerm={searchTerm}
          selectedFloor={selectedFloor}
          onSearchChange={setSearchTerm}
          onFloorChange={setSelectedFloor}
          onCreateRoom={() => setIsCreateModalOpen(true)}
        />

        <SelectionBar
          selectedCount={selectedRooms.length}
          isDeleting={deleteMutation.isPending}
          onClearSelection={() => setSelectedRooms([])}
          onDeleteSelected={requestDeleteSelected}
        />

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
            {floorGroups.map((group) => (
              <FloorSection
                key={group.floor}
                floor={group.floor}
                rooms={group.rooms}
                selectedRoomSet={selectedRoomSet}
                onSelectAll={handleSelectAll}
                onToggleRoom={handleToggleRoom}
                onDeleteRoom={requestDeleteRoom}
              />
            ))}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <RoomCreateModal
          roomName={newRoomName}
          error={error}
          isPending={createMutation.isPending}
          onRoomNameChange={handleRoomNameChange}
          onClose={handleCloseModal}
          onSubmit={handleCreateRoom}
        />
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
