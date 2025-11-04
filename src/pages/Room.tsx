import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomService } from '../services/room.service';
import Header from '../components/Header';
import '../styles/Room.css';

export default function Room() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

  // 방 목록 조회
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomService.getRooms,
  });

  // 방 생성
  const createMutation = useMutation({
    mutationFn: roomService.createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsCreateModalOpen(false);
      setNewRoomName('');
      setError('');
    },
    onError: (error: Error) => {
      console.error('Create room error:', error);
      setError('방 생성에 실패했습니다. 다시 시도해주세요.');
    },
  });

  // 방 삭제
  const deleteMutation = useMutation({
    mutationFn: async (roomIds: number[]) => {
      // 모든 삭제 요청을 병렬로 실행
      await Promise.all(roomIds.map(id => roomService.deleteRoom(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSelectedRooms([]);
    },
    onError: (error: Error) => {
      console.error('Delete room error:', error);
      alert('방 삭제에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRoomName.trim()) {
      setError('방 번호를 입력해주세요.');
      return;
    }

    setError('');
    
    // 입력값 파싱: 쉼표로 구분된 여러 방 또는 범위
    const input = newRoomName.trim();
    const roomsToCreate: string[] = [];

    // 쉼표로 분리
    const parts = input.split(',').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      // 범위 형식 확인 (예: 301~303, 101-105)
      const rangeMatch = part.match(/^(\d+)\s*[~-]\s*(\d+)$/);
      
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        
        if (start > end) {
          setError(`잘못된 범위입니다: ${part}`);
          return;
        }
        
        // 범위 내의 모든 방 번호 생성
        for (let i = start; i <= end; i++) {
          roomsToCreate.push(i.toString());
        }
      } else {
        // 단일 방 번호
        roomsToCreate.push(part);
      }
    }

    if (roomsToCreate.length === 0) {
      setError('올바른 방 번호를 입력해주세요.');
      return;
    }

    // 20개 제한
    if (roomsToCreate.length > 20) {
      setError('한 번에 최대 20개의 방까지만 생성할 수 있습니다.');
      return;
    }

    // 각 방을 순차적으로 생성
    const createRooms = async () => {
      for (const room of roomsToCreate) {
        await roomService.createRoom({ room });
      }
    };

    createRooms()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        setIsCreateModalOpen(false);
        setNewRoomName('');
        setError('');
      })
      .catch((error) => {
        console.error('Create rooms error:', error);
        setError('일부 방 생성에 실패했습니다. 다시 시도해주세요.');
      });
  };

  const handleDeleteRoom = (roomId: number, roomName: string) => {
    if (window.confirm(`${roomName} 호실을 삭제하시겠습니까?`)) {
      deleteMutation.mutate([roomId]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRooms.length === 0) {
      alert('삭제할 방을 선택해주세요.');
      return;
    }
    
    if (window.confirm(`선택한 ${selectedRooms.length}개의 호실을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(selectedRooms);
    }
  };

  const handleToggleRoom = (roomId: number) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleSelectAll = (floorRooms: typeof rooms) => {
    const floorRoomIds = floorRooms.map(r => r.id);
    const allSelected = floorRoomIds.every(id => selectedRooms.includes(id));
    
    if (allSelected) {
      // 현재 층의 방들을 선택 해제
      setSelectedRooms(prev => prev.filter(id => !floorRoomIds.includes(id)));
    } else {
      // 현재 층의 방들을 선택
      setSelectedRooms(prev => [...new Set([...prev, ...floorRoomIds])]);
    }
  };

  const handleCloseModal = () => {
    if (newRoomName) {
      if (window.confirm('작성 중인 내용이 있습니다. 취소하시겠습니까?')) {
        setIsCreateModalOpen(false);
        setNewRoomName('');
        setError('');
      }
    } else {
      setIsCreateModalOpen(false);
      setNewRoomName('');
      setError('');
    }
  };

  // 방을 층별로 그룹핑
  const groupRoomsByFloor = () => {
    const grouped = rooms.reduce((acc, room) => {
      // 방 번호에서 첫 글자를 층으로 사용
      const floor = room.room.charAt(0);
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(room);
      return acc;
    }, {} as Record<string, typeof rooms>);

    // 층을 오름차순으로 정렬
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(floor => ({
        floor,
        rooms: grouped[floor].sort((a, b) => a.room.localeCompare(b.room))
      }));
  };

  const floorGroups = groupRoomsByFloor();

  return (
    <div className="room-page">
      <Header />
      
      <div className="room-container">
        <div className="room-header">
          <h1 className="room-title">방 관리</h1>
          <div className="header-actions">
            {selectedRooms.length > 0 && (
              <button
                className="delete-selected-button"
                onClick={handleDeleteSelected}
                disabled={deleteMutation.isPending}
              >
                선택 삭제 ({selectedRooms.length})
              </button>
            )}
            <button
              className="create-room-button"
              onClick={() => setIsCreateModalOpen(true)}
            >
              + 방 추가
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading">로딩 중...</div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <p>등록된 방이 없습니다.</p>
            <p>방을 추가하여 학생들을 배정하세요.</p>
          </div>
        ) : (
          <div className="floor-sections">
            {floorGroups.map((group) => (
              <div key={group.floor} className="floor-section">
                <div className="floor-header">
                  <h2 className="floor-title">{group.floor}층</h2>
                  <button
                    className="select-all-button"
                    onClick={() => handleSelectAll(group.rooms)}
                  >
                    {group.rooms.every(r => selectedRooms.includes(r.id)) ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="room-grid">
                  {group.rooms.map((room) => (
                    <div 
                      key={room.id} 
                      className={`room-card ${selectedRooms.includes(room.id) ? 'selected' : ''}`}
                      onClick={() => handleToggleRoom(room.id)}
                    >
                      <div className="room-card-header">
                        <input
                          type="checkbox"
                          className="room-checkbox"
                          checked={selectedRooms.includes(room.id)}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <h3 className="room-name">{room.room}</h3>
                        <button
                          className="delete-room-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id, room.room);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 방 생성 모달 */}
      {isCreateModalOpen && (
        <div 
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.currentTarget.setAttribute('data-backdrop-mousedown', 'true');
            }
          }}
          onMouseUp={(e) => {
            if (
              e.target === e.currentTarget &&
              e.currentTarget.getAttribute('data-backdrop-mousedown') === 'true'
            ) {
              handleCloseModal();
            }
            e.currentTarget.removeAttribute('data-backdrop-mousedown');
          }}
        >
          <div className="modal-container room-modal">
            <div className="modal-header">
              <h2 className="modal-title">방 추가</h2>
              <button
                className="modal-close-button"
                onClick={handleCloseModal}
                disabled={createMutation.isPending}
                type="button"
              >
                ✕
              </button>
            </div>

            <form className="modal-form" onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label className="form-label" htmlFor="room-name">
                  방 번호 <span className="required">*</span>
                </label>
                <input
                  id="room-name"
                  type="text"
                  className="form-input"
                  placeholder="예: 101, 102, 103 또는 301~305"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={100}
                  autoFocus
                  required
                />
                <div className="input-helper">
                  여러 방을 쉼표(,)로 구분하거나 범위(~)로 입력하세요
                </div>
                <div className="input-footer">
                  {error && <span className="error-text">{error}</span>}
                  <span className="char-count">{newRoomName.length}/100</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
