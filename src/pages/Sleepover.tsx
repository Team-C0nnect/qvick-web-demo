import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from '../components/ConfirmationModal';
import SleepoverCreateModal from '../components/SleepoverCreateModal';
import { SearchIcon } from '../components/Icons';
import DonutChart from '../components/DonutChart';
import { RollingNumber } from '../components/RollingNumber';
import { TableRowSkeleton } from '../components/Skeleton';
import { sleepoverService } from '../services/sleepover.service';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import '../styles/Check.css';
import '../styles/Sleepover.css';
import type { SleepoverResponse } from '../types/api';
import { useSelectedDate } from '../context/SelectedDateContext';

type DeleteTarget = {
  studentId: number;
  studentName: string;
} | null;

const getStudentNumber = (student: SleepoverResponse['student']) =>
  `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

const toPercent = (value: number, total: number): string =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';

export default function Sleepover() {
  const queryClient = useQueryClient();
  const { selectedDate: currentDate } = useSelectedDate();
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>(
    '전체',
  );
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [syncMessage, setSyncMessage] = useState('');

  const { data: sleepoversData, isLoading } = useQuery({
    queryKey: ['sleepovers', currentDate],
    queryFn: () => sleepoverService.getAllSleepovers(currentDate),
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
        queryFn: () => sleepoverService.getAllSleepovers(currentDate),
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
        if (query) {
          const studentNumber = getStudentNumber(sleepover.student);
          const isMatched =
            matchesKoreanNameSearch(sleepover.student.name, searchQuery) ||
            sleepover.student.room.toLowerCase().includes(query) ||
            studentNumber.includes(query);

          if (!isMatched) return false;
        }

        const gender = sleepover.student.gender === 'MALE' ? '남' : '여';
        if (genderFilter !== '전체' && gender !== genderFilter) return false;

        if (gradeFilter !== '전체' && sleepover.student.grade !== gradeFilter) {
          return false;
        }

        return true;
      });
  }, [genderFilter, gradeFilter, searchQuery, sleepovers]);

  const genderStats = sleepovers.reduce(
    (acc, sleepover) => {
      if (sleepover.student.gender === 'MALE') acc.male += 1;
      else acc.female += 1;
      return acc;
    },
    { male: 0, female: 0 },
  );
  const gradeStats = sleepovers.reduce(
    (acc, sleepover) => {
      if (sleepover.student.grade === 1) acc.first += 1;
      if (sleepover.student.grade === 2) acc.second += 1;
      if (sleepover.student.grade === 3) acc.third += 1;
      return acc;
    },
    { first: 0, second: 0, third: 0 },
  );
  const sleepoverTotal = sleepovers.length;

  const isActionPending =
    createMutation.isPending || syncMutation.isPending || deleteMutation.isPending;
  const hasRequestError =
    syncMutation.isError || createMutation.isError || deleteMutation.isError;

  return (
    <div className="check-page sleepover-page">
      <div className="controls-section">
        <div className="donut-cards sleepover-donut-cards">
          <div className="donut-card sleepover-donut-card">
            <h3 className="donut-card-title">외박자 성별 구성</h3>
            <div className="donut-card-body">
              <DonutChart
                key={`${genderStats.male}-${genderStats.female}`}
                className="donut-card-chart"
                total={sleepoverTotal}
                label="외박자 성별 인원 비율"
                segments={[
                  { key: 'male', color: '#3b82f6', value: genderStats.male },
                  {
                    key: 'female',
                    color: '#ec4899',
                    value: genderStats.female,
                  },
                ]}
              >
                <span>전체 외박</span>
                <strong>
                  <RollingNumber value={sleepoverTotal} />명
                </strong>
              </DonutChart>
              <ul className="donut-legend">
                {[
                  { label: '남학생', value: genderStats.male, tone: 'male' },
                  { label: '여학생', value: genderStats.female, tone: 'female' },
                ].map((item) => (
                  <li key={item.tone}>
                    <span className="legend-label">
                      <i className={`legend-dot ${item.tone}`} />
                      {item.label}
                    </span>
                    <span className="legend-value">
                      <RollingNumber value={item.value} />명{' '}
                      <em>({toPercent(item.value, sleepoverTotal)})</em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="donut-card sleepover-donut-card">
            <h3 className="donut-card-title">학년별 외박 현황</h3>
            <div className="donut-card-body">
              <DonutChart
                key={`${gradeStats.first}-${gradeStats.second}-${gradeStats.third}`}
                className="donut-card-chart"
                total={sleepoverTotal}
                label="외박자 학년별 인원 비율"
                segments={[
                  { key: 'first', color: '#6d23ed', value: gradeStats.first },
                  {
                    key: 'second',
                    color: '#3b82f6',
                    value: gradeStats.second,
                  },
                  { key: 'third', color: '#f59e0b', value: gradeStats.third },
                ]}
              >
                <span>전체 외박</span>
                <strong>
                  <RollingNumber value={sleepoverTotal} />명
                </strong>
              </DonutChart>
              <ul className="donut-legend">
                {[
                  { label: '1학년', value: gradeStats.first, tone: 'first' },
                  { label: '2학년', value: gradeStats.second, tone: 'second' },
                  { label: '3학년', value: gradeStats.third, tone: 'third' },
                ].map((item) => (
                  <li key={item.tone}>
                    <span className="legend-label">
                      <i className={`legend-dot ${item.tone}`} />
                      {item.label}
                    </span>
                    <span className="legend-value">
                      <RollingNumber value={item.value} />명{' '}
                      <em>({toPercent(item.value, sleepoverTotal)})</em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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

      <div className="table-panel">
        <div className="table-toolbar">
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

        <div className="table-filters">
          <div className="filter-group">
            <label className="filter-label">성별:</label>
            <div className="filter-buttons">
              {(['전체', '남', '여'] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  className={`filter-btn ${genderFilter === gender ? 'active' : ''}`}
                  onClick={() => setGenderFilter(gender)}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">학년:</label>
            <div className="filter-buttons">
              {(['전체', 1, 2, 3] as const).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  className={`filter-btn ${gradeFilter === grade ? 'active' : ''}`}
                  onClick={() => setGradeFilter(grade)}
                >
                  {grade === '전체' ? '전체' : `${grade}학년`}
                </button>
              ))}
            </div>
          </div>

          <div className="sleepover-filter-actions">
            <button
              type="button"
              className="sleepover-secondary-button"
              onClick={() => syncMutation.mutate()}
              disabled={isActionPending}
            >
              <span className="sleepover-sync-icon" aria-hidden="true">↻</span>
              <span>{syncMutation.isPending ? '동기화 중...' : '외부 동기화'}</span>
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

        <div className="table-container">
          <table className="student-table">
            <colgroup>
              <col className="sleepover-column-room" />
              <col className="sleepover-column-name" />
              <col className="sleepover-column-gender" />
              <col className="sleepover-column-student-id" />
              <col className="sleepover-column-reason" />
              <col className="sleepover-column-date" />
              <col className="sleepover-column-actions" />
            </colgroup>
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
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={7} />
                ))
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
                      <td
                        data-label="외박 사유"
                        className="sleepover-reason-cell"
                      >
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
                <tr className="sleepover-empty-row">
                  <td colSpan={7} className="sleepover-empty-cell">
                    외박자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
