import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStudents, useAttendances } from '../hooks/useApi';
import { studentService } from '../services/student.service';
import { attendanceService } from '../services/attendance.service';
import '../styles/Check.css';
import { SearchIcon, ExcelIcon } from '../components/Icons';
import EditStudentModal from '../components/EditStudentModal';
import type { Gender, AttendanceStatus } from '../types/api';

interface Student {
  id: number;
  room: string;
  overnight: boolean;
  name: string;
  status: '출석' | '미출석';
  gender: '남' | '여';
  studentId: string;
  time: string;
  phone: string;
  dormitory: string;
}

type SortKey = 'room' | 'name' | 'status' | 'gender' | 'studentId' | 'time';
type SortDirection = 'asc' | 'desc' | null;

export default function Check() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'전체' | '출석' | '미출석'>('전체');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>('전체');
  const [overnightFilter, setOvernightFilter] = useState<'전체' | '외박' | '비외박'>('전체');
  const [dormitoryFilter, setDormitoryFilter] = useState<'전체' | '남기숙사' | '여기숙사'>('전체');
  
  const queryClient = useQueryClient();

  // Fetch students and attendances
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ 
    page: 0, 
    size: 100,
    name: searchQuery || undefined 
  });
  
  const { data: attendancesData, isLoading: attendancesLoading } = useAttendances(currentDate);

  const [students, setStudents] = useState<Student[]>([]);

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { gender: Gender; room?: string } }) =>
      studentService.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Export excel mutation
  const exportMutation = useMutation({
    mutationFn: () => attendanceService.exportAttendances(currentDate),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `출석부_${currentDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });

  // Combine students with attendance data
  useEffect(() => {
    if (studentsData && attendancesData) {
      const attendanceMap = new Map(
        attendancesData.map((att) => [att.student.name, att])
      );

      const combinedStudents: Student[] = studentsData.content.map((student) => {
        const attendance = attendanceMap.get(student.name);
        const statusMap: Record<AttendanceStatus, '출석' | '미출석'> = {
          PRESENT: '출석',
          ABSENT: '미출석',
          SLEEPOVER: '출석',
        };

        return {
          id: student.id,
          room: student.room,
          overnight: attendance?.status === 'SLEEPOVER',
          name: student.name,
          status: attendance ? statusMap[attendance.status] : '미출석',
          gender: student.gender === 'MALE' ? '남' : '여',
          studentId: `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`,
          time: attendance?.checkedAt
            ? new Date(attendance.checkedAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '-',
          phone: '010-0000-0000', // Not available in API
          dormitory: student.room.includes('남') ? '남기숙사' : '여기숙사',
        };
      });

      setStudents(combinedStudents);
    }
  }, [studentsData, attendancesData]);

  // Sort function
  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        direction = 'desc';
      } else if (sortDirection === 'desc') {
        direction = null;
        setSortKey(null);
        setSortDirection(null);
        return;
      }
    }
    
    setSortKey(key);
    setSortDirection(direction);
  };

  // Get sorted students
  const getSortedStudents = () => {
    if (!sortKey || !sortDirection) {
      return students;
    }

    return [...students].sort((a, b) => {
      let aValue: string | number = a[sortKey];
      let bValue: string | number = b[sortKey];

      // Handle time sorting
      if (sortKey === 'time') {
        if (aValue === '-') return 1;
        if (bValue === '-') return -1;
      }

      // Handle room number sorting
      if (sortKey === 'room') {
        const aNum = parseInt(aValue.replace(/\D/g, '')) || 0;
        const bNum = parseInt(bValue.replace(/\D/g, '')) || 0;
        aValue = aNum;
        bValue = bNum;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedStudents = getSortedStudents();

  // Apply filters
  const getFilteredStudents = () => {
    return sortedStudents.filter((student) => {
      // Status filter
      if (statusFilter !== '전체' && student.status !== statusFilter) {
        return false;
      }
      
      // Gender filter
      if (genderFilter !== '전체' && student.gender !== genderFilter) {
        return false;
      }
      
      // Overnight filter
      if (overnightFilter === '외박' && !student.overnight) {
        return false;
      }
      if (overnightFilter === '비외박' && student.overnight) {
        return false;
      }
      
      // Dormitory filter
      if (dormitoryFilter !== '전체' && student.dormitory !== dormitoryFilter) {
        return false;
      }
      
      return true;
    });
  };

  const filteredStudents = getFilteredStudents();

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleSaveStudent = (updatedStudent: Student) => {
    const gender: Gender = updatedStudent.gender === '남' ? 'MALE' : 'FEMALE';
    
    updateStudentMutation.mutate({
      id: updatedStudent.id,
      data: {
        gender,
        room: updatedStudent.room,
      },
    });
    
    setStudents(students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  const handleExportExcel = () => {
    exportMutation.mutate();
  };

  const stats = {
    total: filteredStudents.length,
    present: filteredStudents.filter((s) => s.status === '출석').length,
    absent: filteredStudents.filter((s) => s.status === '미출석').length,
  };

  if (studentsLoading || attendancesLoading) {
    return (
      <div className="check-page">
        <div className="loading">데이터를 불러오는 중...</div>
      </div>
    );
  }  return (
    <div className="check-page">
          <div className="controls-section">
            <div className="search-box">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="호실 / 이름으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="stats-section">
              <div className="stat-box">전체 : {stats.total}명</div>
              <div className="stat-box attendance">
                출석 : <span className="positive">{stats.present}</span>명
              </div>
              <div className="stat-box absence">
                미출석 : <span className="negative">{stats.absent}</span>명
              </div>
              <button 
                className="excel-button" 
                onClick={handleExportExcel}
                disabled={exportMutation.isPending}
              >
                <ExcelIcon className="excel-icon" />
                {exportMutation.isPending ? '다운로드 중...' : 'Excel'}
              </button>
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <label className="filter-label">출석 상태:</label>
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${statusFilter === '전체' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('전체')}
                >
                  전체
                </button>
                <button 
                  className={`filter-btn ${statusFilter === '출석' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('출석')}
                >
                  출석
                </button>
                <button 
                  className={`filter-btn ${statusFilter === '미출석' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('미출석')}
                >
                  미출석
                </button>
              </div>
            </div>

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
              <label className="filter-label">외박:</label>
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${overnightFilter === '전체' ? 'active' : ''}`}
                  onClick={() => setOvernightFilter('전체')}
                >
                  전체
                </button>
                <button 
                  className={`filter-btn ${overnightFilter === '외박' ? 'active' : ''}`}
                  onClick={() => setOvernightFilter('외박')}
                >
                  외박
                </button>
                <button 
                  className={`filter-btn ${overnightFilter === '비외박' ? 'active' : ''}`}
                  onClick={() => setOvernightFilter('비외박')}
                >
                  비외박
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">기숙사:</label>
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${dormitoryFilter === '전체' ? 'active' : ''}`}
                  onClick={() => setDormitoryFilter('전체')}
                >
                  전체
                </button>
                <button 
                  className={`filter-btn ${dormitoryFilter === '남기숙사' ? 'active' : ''}`}
                  onClick={() => setDormitoryFilter('남기숙사')}
                >
                  남기숙사
                </button>
                <button 
                  className={`filter-btn ${dormitoryFilter === '여기숙사' ? 'active' : ''}`}
                  onClick={() => setDormitoryFilter('여기숙사')}
                >
                  여기숙사
                </button>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="student-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('room')} className="sortable">
                    호실
                    {sortKey === 'room' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th>외박</th>
                  <th onClick={() => handleSort('name')} className="sortable">
                    이름
                    {sortKey === 'name' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    상태
                    {sortKey === 'status' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('gender')} className="sortable">
                    성별
                    {sortKey === 'gender' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('studentId')} className="sortable">
                    학번
                    {sortKey === 'studentId' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('time')} className="sortable">
                    출석 시간
                    {sortKey === 'time' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th>연락처</th>
                  <th></th>
                  <th>정보 수정</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={index}>
                    <td className="room-cell">{student.room}</td>
                    <td>
                      <input type="checkbox" checked={student.overnight} readOnly />
                    </td>
                    <td>{student.name}</td>
                    <td>
                      <span className={student.status === '출석' ? 'status-present' : 'status-absent'}>
                        {student.status}
                      </span>
                    </td>
                    <td>{student.gender}</td>
                    <td>{student.studentId}</td>
                    <td>{student.time}</td>
                    <td>{student.phone}</td>
                    <td></td>
                    <td>
                      <button className="edit-button" onClick={() => handleEditClick(student)}>
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <EditStudentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            student={selectedStudent}
            onSave={handleSaveStudent}
          />
    </div>
  );
}
