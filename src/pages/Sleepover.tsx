import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from '../components/ConfirmationModal';
import SleepoverCreateModal from '../components/SleepoverCreateModal';
import { SearchIcon } from '../components/Icons';
import { sleepoverService } from '../services/sleepover.service';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import '../styles/Check.css';
import '../styles/Sleepover.css';
import type { SleepoverResponse } from '../types/api';

type DeleteTarget = {
  studentId: number;
  studentName: string;
} | null;

const getStudentNumber = (student: SleepoverResponse['student']) =>
  `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

export default function Sleepover() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [syncMessage, setSyncMessage] = useState('');

  const { data: sleepoversData, isLoading } = useQuery({
    queryKey: ['sleepovers', currentDate],
    queryFn: () => sleepoverService.getSleepovers(currentDate),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: ({
      studentId,
      sleepoverReason,
    }: {
      studentId: number;
      sleepoverReason: string;
    }) =>
      sleepoverService.createSleepover({
        studentId,
        date: currentDate,
        sleepoverReason,
      }),
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setSyncMessage('');
      queryClient.invalidateQueries({ queryKey: ['sleepovers'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => sleepoverService.syncSleepovers(currentDate),
    onSuccess: async () => {
      const refreshedData = await queryClient.fetchQuery({
        queryKey: ['sleepovers', currentDate],
        queryFn: () => sleepoverService.getSleepovers(currentDate),
      });

      setSyncMessage(
        `외박자 명단이 새로고침되었어요. (총 인원: ${refreshedData.totalElements}명)`,
      );
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (studentId: number) =>
      sleepoverService.deleteSleepover(studentId, currentDate),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['sleepovers'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  const sleepovers = useMemo(() => sleepoversData?.content ?? [], [sleepoversData]);

  const filteredSleepovers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...sleepovers]
      .sort((a, b) => {
        const roomDiff = a.student.room.localeCompare(b.student.room, 'ko-KR', {
          numeric: true,
        });
        if (roomDiff !== 0) return roomDiff;
        return getStudentNumber(a.student).localeCompare(
          getStudentNumber(b.student),
          'ko-KR',
          { numeric: true },
        );
      })
      .filter((sleepover) => {
        if (!query) return true;

        const studentNumber = getStudentNumber(sleepover.student);
        return (
          matchesKoreanNameSearch(sleepover.student.name, searchQuery) ||
          sleepover.student.room.toLowerCase().includes(query) ||
          studentNumber.includes(query)
        );
      });
  }, [searchQuery, sleepovers]);

  const stats = {
    total: filteredSleepovers.length,
    male: filteredSleepovers.filter((item) => item.student.gender === 'MALE')
      .length,
    female: filteredSleepovers.filter((item) => item.student.gender === 'FEMALE')
      .length,
  };

  const isActionPending =
    createMutation.isPending || syncMutation.isPending || deleteMutation.isPending;
  const hasRequestError =
    syncMutation.isError || createMutation.isError || deleteMutation.isError;

  return (
    <div className="check-page sleepover-page">
      <div className="controls-section">
        <div className="controls-left">
          <div className="date-picker">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                setCurrentDate(e.target.value);
                setSyncMessage('');
              }}
            />
          </div>
          <div className="search-box">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="호실 / 이름 / 학번으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-box">전체 : {stats.total}명</div>
          <div className="stat-box attendance">
            남 : <span className="positive">{stats.male}</span>명
          </div>
          <div className="stat-box absence">
            여 : <span className="negative">{stats.female}</span>명
          </div>
          <button
            type="button"
            className="sleepover-secondary-button"
            onClick={() => syncMutation.mutate()}
            disabled={isActionPending}
          >
            {syncMutation.isPending ? '동기화 중...' : '외부 동기화'}
          </button>
          <button
            type="button"
            className="sleepover-primary-button"
            onClick={() => {
              setSyncMessage('');
              setIsCreateModalOpen(true);
            }}
            disabled={isActionPending}
          >
            외박자 추가
          </button>
        </div>
      </div>

      {(syncMessage || hasRequestError) && (
        <div
          className={`sleepover-message ${hasRequestError ? 'error' : ''}`}
        >
          {hasRequestError
            ? '요청 처리에 실패했습니다. 다시 시도해주세요.'
            : syncMessage}
        </div>
      )}

      <div className="table-container">
        <table className="student-table">
          <thead>
            <tr>
              <th>호실</th>
              <th>이름</th>
              <th>성별</th>
              <th>학번</th>
              <th>외박 사유</th>
              <th>날짜</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="sleepover-empty-cell">
                  외박자 목록을 불러오는 중입니다.
                </td>
              </tr>
            ) : filteredSleepovers.length > 0 ? (
              filteredSleepovers.map((sleepover) => {
                const student = sleepover.student;

                return (
                  <tr key={`${sleepover.date}-${student.id}`}>
                    <td className="room-cell" data-label="호실">
                      {student.room}
                    </td>
                    <td data-label="이름">{student.name}</td>
                    <td data-label="성별">
                      {student.gender === 'MALE' ? '남' : '여'}
                    </td>
                    <td data-label="학번">{getStudentNumber(student)}</td>
                    <td data-label="외박 사유" className="sleepover-reason-cell">
                      {sleepover.sleepoverReason}
                    </td>
                    <td data-label="날짜">{sleepover.date}</td>
                    <td data-label="삭제">
                      <button
                        type="button"
                        className="sleepover-delete-button"
                        onClick={() =>
                          setDeleteTarget({
                            studentId: student.id,
                            studentName: student.name,
                          })
                        }
                        disabled={isActionPending}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="sleepover-empty-cell">
                  외박자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
        <SleepoverCreateModal
          students={studentsData?.content ?? []}
          isPending={createMutation.isPending}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(studentId, sleepoverReason) =>
            createMutation.mutate({ studentId, sleepoverReason })
          }
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        eyebrow="Delete sleepover"
        title="외박자를 삭제할까요?"
        message={`${deleteTarget?.studentName ?? ''} 학생의 ${currentDate} 외박 정보를 삭제합니다.`}
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.studentId);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
