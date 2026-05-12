import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services/student.service';
import Header from '../components/Header';
import { SearchIcon } from '../components/Icons';
import '../styles/StudentManagement.css';

interface Student {
  id: number;
  name: string;
  grade: number;
  classroom: number;
  number: number;
  room: string;
  gender: 'MALE' | 'FEMALE';
}

interface StudentWithPhone extends Student {
  phoneNumber?: string;
}

interface DeleteModalState {
  student: Student | null;
  password: string;
  error: string;
}

export default function StudentManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>(
    '전체',
  );
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    student: null,
    password: '',
    error: '',
  });

  // 학생 목록 조회
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
  });

  const allStudents = (studentsData?.content || []) as StudentWithPhone[];

  // 학생 삭제
  const deleteMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await studentService.deleteStudent(studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-all'] });
      setDeleteModal({ student: null, password: '', error: '' });
    },
    onError: (error: Error) => {
      console.error('Delete student error:', error);
      setDeleteModal((prev) => ({
        ...prev,
        error: error.message || '학생 삭제에 실패했습니다.',
      }));
    },
  });

  // Get sorted students - 학년, 반, 번호 순서로 정렬 (고정)
  const getSortedStudents = () => {
    return [...allStudents].sort((a, b) => {
      // 학년으로 정렬
      if (a.grade !== b.grade) {
        return a.grade - b.grade;
      }
      // 같은 학년이면 반으로 정렬
      if (a.classroom !== b.classroom) {
        return a.classroom - b.classroom;
      }
      // 같은 반이면 번호로 정렬
      return a.number - b.number;
    });
  };

  const sortedStudents = getSortedStudents();

  // Apply filters
  const getFilteredStudents = () => {
    return sortedStudents.filter((student) => {
      // Search query filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!student.name.toLowerCase().includes(query)) {
          return false;
        }
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

    if (!deleteModal.password) {
      setDeleteModal((prev) => ({
        ...prev,
        error: '비밀번호를 입력해주세요.',
      }));
      return;
    }

    // 비밀번호 검증
    if (deleteModal.password !== 'qvick2026!!') {
      setDeleteModal((prev) => ({
        ...prev,
        error: '비밀번호가 올바르지 않습니다.',
      }));
      return;
    }

    deleteMutation.mutate(deleteModal.student.id);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ student: null, password: '', error: '' });
  };

  if (isLoading) {
    return (
      <div className="student-management">
        <Header />
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="student-management">
      <Header />

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
                <th>ID</th>
                <th>이름</th>
                <th className="grade-header">학년</th>
                <th>반</th>
                <th>번호</th>
                <th>성별</th>
                <th>전화번호</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">
                    해당하는 학생이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="student-row">
                    <td>{student.id}</td>
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
                        disabled={deleteMutation.isPending}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="student-count">
          총 <strong>{filteredStudents.length}</strong>명
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteModal.student && (
        <div className="modal-overlay" onClick={handleCloseDeleteModal}>
          <div
            className="modal-container delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">학생 삭제</h2>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseDeleteModal}
                aria-label="모달 닫기"
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-content">
              <p className="delete-warning">다음 학생을 삭제하시겠습니까?</p>
              <div className="student-info-card">
                <div className="info-row">
                  <span className="info-label">이름</span>
                  <span className="info-value">{deleteModal.student.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">학년/반/번호</span>
                  <span className="info-value">
                    {deleteModal.student.grade}학년{' '}
                    {deleteModal.student.classroom}반{' '}
                    {deleteModal.student.number}번
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">성별</span>
                  <span className="info-value">
                    {deleteModal.student.gender === 'MALE' ? '남' : '여'}
                  </span>
                </div>
              </div>

              <div className="password-section">
                <label htmlFor="delete-password" className="password-label">
                  비밀번호 입력 (확인)
                </label>
                <input
                  id="delete-password"
                  type="password"
                  placeholder="비밀번호를 입력해주세요"
                  value={deleteModal.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="password-input"
                  disabled={deleteMutation.isPending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmDelete();
                    }
                  }}
                />
                {deleteModal.error && (
                  <div className="error-message">{deleteModal.error}</div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn cancel-btn"
                onClick={handleCloseDeleteModal}
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                className="modal-btn delete-btn"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending || !deleteModal.password}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
