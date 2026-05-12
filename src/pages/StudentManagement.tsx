import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services/student.service';
import { authService } from '../services/auth.service';
import apiClient from '../lib/api-client';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { SearchIcon } from '../components/Icons';
import DeleteStudentModal from '../components/DeleteStudentModal';
import type { MyUserResponse } from '../types/api';
import type {
  Student,
  StudentWithPhone,
  SortColumn,
  SortDirection,
} from '../types/student-management';
import '../styles/StudentManagement.css';

export default function StudentManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>(
    '전체',
  );
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');
  const [deleteModal, setDeleteModal] = useState({
    student: null as Student | null,
    password: '',
    confirmName: '',
    error: '',
  });
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // 학생 목록 조회
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
  });

  const { data: user } = useQuery<MyUserResponse>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<MyUserResponse>('/users/my');
      return response.data;
    },
  });

  const allStudents = (studentsData?.content || []) as StudentWithPhone[];

  // 학생 삭제
  const deleteMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await studentService.deleteStudent(studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-all'] });
      setDeleteModal({
        student: null,
        password: '',
        confirmName: '',
        error: '',
      });
    },
    onError: (error: Error) => {
      console.error('Delete student error:', error);
      setDeleteModal((prev) => ({
        ...prev,
        error: error.message || '학생 삭제에 실패했습니다.',
      }));
    },
  });

  // Get sorted students - 선택된 칼럼으로 정렬
  const getSortedStudents = () => {
    return [...allStudents].sort((a, b) => {
      // sortColumn이 null이면 기본 정렬: 학년 → 반 → 번호
      if (sortColumn === null) {
        if (a.grade !== b.grade) {
          return a.grade - b.grade;
        }
        if (a.classroom !== b.classroom) {
          return a.classroom - b.classroom;
        }
        return a.number - b.number;
      }

      let compareA: number | string = '';
      let compareB: number | string = '';

      switch (sortColumn) {
        case 'id':
          compareA = a.id;
          compareB = b.id;
          break;
        case 'name':
          compareA = a.name;
          compareB = b.name;
          break;
        case 'grade':
          compareA = a.grade;
          compareB = b.grade;
          break;
        case 'classroom':
          compareA = a.classroom;
          compareB = b.classroom;
          break;
        case 'number':
          compareA = a.number;
          compareB = b.number;
          break;
        case 'gender':
          compareA = a.gender;
          compareB = b.gender;
          break;
        default:
          return 0;
      }

      if (typeof compareA === 'number' && typeof compareB === 'number') {
        return sortDirection === 'asc'
          ? compareA - compareB
          : compareB - compareA;
      }

      const strA = String(compareA).toLowerCase();
      const strB = String(compareB).toLowerCase();
      if (sortDirection === 'asc') {
        return strA.localeCompare(strB, 'ko-KR');
      } else {
        return strB.localeCompare(strA, 'ko-KR');
      }
    });
  };

  const sortedStudents = getSortedStudents();

  // Apply filters
  const getFilteredStudents = () => {
    return sortedStudents.filter((student) => {
      // Search query filter
      if (
        searchTerm.trim() &&
        !matchesKoreanNameSearch(student.name, searchTerm)
      ) {
        return false;
      }

      // Gender filter
      if (genderFilter !== '전체') {
        const displayGender = student.gender === 'MALE' ? '남' : '여';
        if (displayGender !== genderFilter) {
          return false;
        }
      }

      // Grade filter
      if (gradeFilter !== '전체' && student.grade !== gradeFilter) {
        return false;
      }

      return true;
    });
  };

  const filteredStudents = getFilteredStudents();

  const handleDeleteClick = (student: Student) => {
    setDeleteModal({
      student,
      password: '',
      confirmName: '',
      error: '',
    });
  };

  const handlePasswordChange = (password: string) => {
    setDeleteModal((prev) => ({
      ...prev,
      password,
      error: '', // 입력 시 에러 초기화
    }));
  };

  const handleConfirmNameChange = (confirmName: string) => {
    setDeleteModal((prev) => ({
      ...prev,
      confirmName,
      error: '', // 입력 시 에러 초기화
    }));
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '010-0000-0000';
    // 숫자만 추출
    const digits = phone.replace(/\D/g, '');
    // 010-XXXX-XXXX 형식
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.student) return;

    // 학생 이름 확인
    if (!deleteModal.confirmName) {
      setDeleteModal((prev) => ({
        ...prev,
        error: '학생 이름을 입력해주세요.',
      }));
      return;
    }

    if (deleteModal.confirmName !== deleteModal.student.name) {
      setDeleteModal((prev) => ({
        ...prev,
        error: `학생 이름이 일치하지 않습니다. (입력: ${deleteModal.confirmName}, 실제: ${deleteModal.student!.name})`,
      }));
      return;
    }

    if (!deleteModal.password) {
      setDeleteModal((prev) => ({
        ...prev,
        error: '비밀번호를 입력해주세요.',
      }));
      return;
    }

    if (!user?.email) {
      setDeleteModal((prev) => ({
        ...prev,
        error: '현재 로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.',
      }));
      return;
    }

    setIsVerifyingPassword(true);

    try {
      await authService.verifyPassword({
        email: user.email,
        password: deleteModal.password,
      });
      await deleteMutation.mutateAsync(deleteModal.student.id);
    } catch (error) {
      console.error('Verify password or delete student error:', error);
      setDeleteModal((prev) => ({
        ...prev,
        error: '로그인 비밀번호가 올바르지 않거나 학생 삭제에 실패했습니다.',
      }));
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ student: null, password: '', confirmName: '', error: '' });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        // 아래 누르면 desc로 변경
        setSortDirection('desc');
      } else {
        // desc 누르면 초기 상태로 (학년→반→번호 정렬)
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      // 다른 컬럼을 누르면 그 컬럼으로 정렬 (asc)
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="student-management">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="student-management">
      <div className="student-management-container">
        {/* 검색 섹션 */}
        <div className="toolbar-section">
          <div className="search-box">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="학생명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* 필터 섹션 */}
        <div className="filter-section">
          <div className="filter-group">
            <label className="filter-label">성별:</label>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${genderFilter === '전체' ? 'active' : ''}`}
                onClick={() => setGenderFilter('전체')}
              >
                전체
              </button>
              <button
                className={`filter-btn ${genderFilter === '남' ? 'active' : ''}`}
                onClick={() => setGenderFilter('남')}
              >
                남
              </button>
              <button
                className={`filter-btn ${genderFilter === '여' ? 'active' : ''}`}
                onClick={() => setGenderFilter('여')}
              >
                여
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">학년:</label>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${gradeFilter === '전체' ? 'active' : ''}`}
                onClick={() => setGradeFilter('전체')}
              >
                전체
              </button>
              <button
                className={`filter-btn ${gradeFilter === 1 ? 'active' : ''}`}
                onClick={() => setGradeFilter(1)}
              >
                1학년
              </button>
              <button
                className={`filter-btn ${gradeFilter === 2 ? 'active' : ''}`}
                onClick={() => setGradeFilter(2)}
              >
                2학년
              </button>
              <button
                className={`filter-btn ${gradeFilter === 3 ? 'active' : ''}`}
                onClick={() => setGradeFilter(3)}
              >
                3학년
              </button>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="table-container">
          <table className="student-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className={`sortable ${sortColumn === 'id' ? 'active' : ''}`}
                >
                  ID
                  {sortColumn === 'id' && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className={`sortable ${sortColumn === 'name' ? 'active' : ''}`}
                >
                  이름
                  {sortColumn === 'name' && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('grade')}
                  className={`sortable ${sortColumn === 'grade' ? 'active' : ''}`}
                >
                  학년
                  {sortColumn === 'grade' && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('classroom')}
                  className={`sortable ${sortColumn === 'classroom' ? 'active' : ''}`}
                >
                  반
                  {sortColumn === 'classroom' && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('number')}
                  className={`sortable ${sortColumn === 'number' ? 'active' : ''}`}
                >
                  번호
                  {sortColumn === 'number' && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('gender')}
                  className={`sortable ${sortColumn === 'gender' ? 'active' : ''}`}
                >
                  성별
                  {sortColumn === 'gender' && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th>전화번호</th>
                <th></th>
              </tr>
            </thead>
            {filteredStudents.length > 0 && (
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="student-row">
                    <td>
                      <span className="spoiler-number">{student.id}</span>
                    </td>
                    <td>{student.name}</td>
                    <td className="grade-classroom-number">{student.grade}</td>
                    <td className="grade-classroom-number">
                      {student.classroom}
                    </td>
                    <td className="grade-classroom-number">{student.number}</td>
                    <td>{student.gender === 'MALE' ? '남' : '여'}</td>
                    <td>{formatPhoneNumber(student.phoneNumber)}</td>
                    <td className="action-cell">
                      <button
                        className="delete-student-btn"
                        onClick={() => handleDeleteClick(student)}
                        disabled={deleteMutation.isPending || isVerifyingPassword}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {filteredStudents.length === 0 && (
            <div className="empty-table-state">해당하는 학생이 없습니다.</div>
          )}
        </div>

        <div className="student-count">
          총 <strong>{filteredStudents.length}</strong>명
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteModal.student && (
        <DeleteStudentModal
          deleteModal={deleteModal}
          isPending={deleteMutation.isPending || isVerifyingPassword}
          onConfirmNameChange={handleConfirmNameChange}
          onPasswordChange={handlePasswordChange}
          onConfirmDelete={handleConfirmDelete}
          onClose={handleCloseDeleteModal}
        />
      )}
    </div>
  );
}
