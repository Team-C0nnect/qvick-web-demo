import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from '../components/ConfirmationModal';
import CouncilAddModal from '../components/CouncilAddModal';
import { SearchIcon } from '../components/Icons';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import '../styles/Check.css';
import '../styles/Sleepover.css';
import '../styles/Council.css';
import type { StudentResponse } from '../types/api';

type RevokeTarget = { id: number; name: string } | null;

const getStudentNumber = (s: StudentResponse) =>
  `${s.grade}${s.classroom}${String(s.number).padStart(2, '0')}`;

export default function Council() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget>(null);

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const councilMembers = useMemo(
    () => studentsData?.content.filter((s) => s.isCouncil) ?? [],
    [studentsData],
  );
  const nonCouncilStudents = useMemo(
    () => studentsData?.content.filter((s) => !s.isCouncil) ?? [],
    [studentsData],
  );

  const grantMutation = useMutation({
    mutationFn: (studentId: number) => studentService.grantCouncil(studentId),
    onSuccess: () => {
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['students-all'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (studentId: number) => studentService.revokeCouncil(studentId),
    onSuccess: () => {
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ['students-all'] });
    },
  });

  const filteredCouncil = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...councilMembers]
      .sort((a, b) => {
        const roomDiff = a.room.localeCompare(b.room, 'ko-KR', { numeric: true });
        if (roomDiff !== 0) return roomDiff;
        return getStudentNumber(a).localeCompare(getStudentNumber(b), 'ko-KR', {
          numeric: true,
        });
      })
      .filter((s) => {
        if (!query) return true;
        return (
          matchesKoreanNameSearch(s.name, searchQuery) ||
          s.room.toLowerCase().includes(query) ||
          getStudentNumber(s).includes(query)
        );
      });
  }, [councilMembers, searchQuery]);

  const stats = {
    total: filteredCouncil.length,
    male: filteredCouncil.filter((s) => s.gender === 'MALE').length,
    female: filteredCouncil.filter((s) => s.gender === 'FEMALE').length,
  };

  const isActionPending = grantMutation.isPending || revokeMutation.isPending;
  const hasRequestError = grantMutation.isError || revokeMutation.isError;

  return (
    <div className="check-page council-page">
      <div className="controls-section">
        <div className="controls-left">
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
            className="council-add-button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={isActionPending || isLoading}
          >
            자치위원 추가
          </button>
        </div>
      </div>

      {hasRequestError && (
        <div className="sleepover-message error">
          요청 처리에 실패했습니다. 다시 시도해주세요.
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
              <th>권한 해제</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="council-empty-cell">
                  자치위원 목록을 불러오는 중입니다.
                </td>
              </tr>
            ) : filteredCouncil.length > 0 ? (
              filteredCouncil.map((student) => (
                <tr key={student.id}>
                  <td className="room-cell" data-label="호실">
                    {student.room}
                  </td>
                  <td data-label="이름">{student.name}</td>
                  <td data-label="성별">
                    {student.gender === 'MALE' ? '남' : '여'}
                  </td>
                  <td data-label="학번">{getStudentNumber(student)}</td>
                  <td data-label="권한 해제">
                    <button
                      type="button"
                      className="council-revoke-button"
                      onClick={() =>
                        setRevokeTarget({ id: student.id, name: student.name })
                      }
                      disabled={isActionPending}
                    >
                      해제
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="council-empty-cell">
                  {searchQuery ? '검색 결과가 없습니다.' : '자치위원이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <CouncilAddModal
          students={nonCouncilStudents}
          isPending={grantMutation.isPending}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(studentId) => grantMutation.mutate(studentId)}
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(revokeTarget)}
        eyebrow="Revoke council role"
        title="자치위원 권한을 해제할까요?"
        message={`${revokeTarget?.name ?? ''} 학생의 자치위원 권한을 해제합니다.`}
        confirmText="해제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={revokeMutation.isPending}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.id);
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
