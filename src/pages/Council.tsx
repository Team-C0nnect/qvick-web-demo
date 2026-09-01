import { Fragment, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from '../components/ConfirmationModal';
import CouncilAddModal from '../components/CouncilAddModal';
import { SearchIcon } from '../components/Icons';
import { TableRowSkeleton } from '../components/Skeleton';
import { useGenderView } from '../context/GenderViewContext';
import { studentService } from '../services/student.service';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import '../styles/Check.css';
import '../styles/Council.css';
import type { StudentResponse } from '../types/api';

type RevokeTarget = { id: number; name: string } | null;

const getStudentNumber = (s: StudentResponse) =>
  `${s.grade}${s.classroom}${String(s.number).padStart(2, '0')}`;

export default function Council() {
  const queryClient = useQueryClient();
  const { genderView } = useGenderView();
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>(
    genderView,
  );
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget>(null);

  useEffect(() => {
    setGenderFilter(genderView);
  }, [genderView]);

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
        const gradeDiff = a.grade - b.grade;
        if (gradeDiff !== 0) return gradeDiff;

        const roomDiff = a.room.localeCompare(b.room, 'ko-KR', {
          numeric: true,
        });
        if (roomDiff !== 0) return roomDiff;
        return getStudentNumber(a).localeCompare(getStudentNumber(b), 'ko-KR', {
          numeric: true,
        });
      })
      .filter((s) => {
        if (query) {
          const isMatched =
            matchesKoreanNameSearch(s.name, searchQuery) ||
            s.room.toLowerCase().includes(query) ||
            getStudentNumber(s).includes(query);

          if (!isMatched) return false;
        }

        if (genderFilter !== '전체') {
          const gender = s.gender === 'MALE' ? '남' : '여';
          if (gender !== genderFilter) return false;
        }

        if (gradeFilter !== '전체' && s.grade !== gradeFilter) return false;

        return true;
      });
  }, [councilMembers, genderFilter, gradeFilter, searchQuery]);

  const isActionPending = grantMutation.isPending || revokeMutation.isPending;
  const hasRequestError = grantMutation.isError || revokeMutation.isError;

  return (
    <div className="check-page council-page">
      {hasRequestError && (
        <div className="council-message council-message-error">
          요청 처리에 실패했습니다. 다시 시도해주세요.
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

          <div className="council-filter-action">
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

        <div className="table-container">
          <table className="student-table student-table-council">
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
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={5} />
                ))
              ) : filteredCouncil.length > 0 ? (
                filteredCouncil.map((student, index) => {
                  const isNewGrade =
                    index === 0 ||
                    filteredCouncil[index - 1].grade !== student.grade;

                  return (
                    <Fragment key={student.id}>
                      {isNewGrade && (
                        <tr className="council-grade-divider">
                          <td colSpan={5}>{student.grade}학년</td>
                        </tr>
                      )}
                      <tr>
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
                              setRevokeTarget({
                                id: student.id,
                                name: student.name,
                              })
                            }
                            disabled={isActionPending}
                          >
                            해제
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })
              ) : (
                <tr className="council-empty-row">
                  <td colSpan={5} className="council-empty-cell">
                    {searchQuery ||
                    genderFilter !== '전체' ||
                    gradeFilter !== '전체'
                      ? '조건에 맞는 자치위원이 없습니다.'
                      : '자치위원이 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
