import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAttendances } from '../hooks/useApi';
import { studentService } from '../services/student.service';
import { attendanceService } from '../services/attendance.service';
import { legacyAttendanceService, type LegacyUserResponse } from '../services/legacy-attendance.service';
import { exportMergedAttendanceToExcel, type MergedAttendanceMember } from '../services/excel.service';
import { CheckTableSkeleton } from '../components/Skeleton';
import '../styles/Check.css';
import { SearchIcon, ExcelIcon } from '../components/Icons';
import EditStudentModal from '../components/EditStudentModal';
import type { Gender, AttendanceStatus, UpdateAttendancesRequest } from '../types/api';

interface Student {
  id: number | null;
  index: number;
  room: string;
  overnight: boolean;
  name: string;
  status: '출석' | '미출석' | '외박';
  gender: '남' | '여';
  studentId: string;
  grade: number;
  classroom: number;
  number: number;
  time: string;
  phone: string;
  dormitory: string;
  // 병합용 추가 필드
  legacyChecked?: boolean;
  newChecked?: boolean;
}

type SortKey = 'room' | 'name' | 'status' | 'gender' | 'studentId' | 'time';
type SortDirection = 'asc' | 'desc' | null;

// 자동 새로고침 간격 (30초)
const REFRESH_INTERVAL = 30 * 1000;

export default function Check() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sortKey, setSortKey] = useState<SortKey | null>('room');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'전체' | '출석' | '미출석' | '외박'>('전체');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>('전체');
  
  const queryClient = useQueryClient();

  // 신버전 출석 데이터 (자동 새로고침)
  const { data: attendancesData, isLoading: attendancesLoading } = useAttendances(currentDate);
  
  // 구버전 출석 데이터
  const { data: legacyData } = useQuery({
    queryKey: ['legacy-attendances'],
    queryFn: legacyAttendanceService.getUserList,
    staleTime: 30 * 1000,
    refetchInterval: REFRESH_INTERVAL,
  });
  
  // 학생 목록 (ID 매핑용)
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const [students, setStudents] = useState<Student[]>([]);

  // 외박 상태 업데이트 mutation
  const updateAttendancesMutation = useMutation({
    mutationFn: (data: UpdateAttendancesRequest) => attendanceService.updateAttendances(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  // 학생 정보 수정 mutation
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { gender: Gender; room?: string } }) =>
      studentService.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  // 자동 새로고침 설정
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['legacy-attendances'] });
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [queryClient]);

  // 기존 서버 엑셀 export (주석처리)
  // const exportMutation = useMutation({
  //   mutationFn: () => attendanceService.exportAttendances(currentDate),
  //   onSuccess: (blob) => {
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = `출석부_${currentDate}.xlsx`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     window.URL.revokeObjectURL(url);
  //   },
  // });

  // 외박 상태 토글 핸들러
  const handleOvernightToggle = useCallback((student: Student) => {
    if (!student.id) {
      console.error('학생 ID를 찾을 수 없습니다.');
      return;
    }
    
    // 외박 → 외박 취소 시 미출석(ABSENT)으로, 미출석/출석 → 외박 시 SLEEPOVER로
    const newStatus: AttendanceStatus = student.overnight ? 'ABSENT' : 'SLEEPOVER';
    
    updateAttendancesMutation.mutate({
      date: currentDate,
      attendances: [{ studentId: student.id, status: newStatus }],
    });
    
    // 로컬 상태 즉시 업데이트
    setStudents(prev => prev.map(s => 
      s.studentId === student.studentId 
        ? { 
            ...s, 
            overnight: !s.overnight,
            status: newStatus === 'SLEEPOVER' ? '외박' : '미출석'
          }
        : s
    ));
  }, [currentDate, updateAttendancesMutation]);

  // 엑셀 내보내기 (병합된 데이터 사용)
  const handleExportExcel = useCallback(() => {
    setIsExporting(true);
    
    try {
      // 병합된 데이터를 excel.ts 형식으로 변환
      const mergedData: MergedAttendanceMember[] = students.map(s => ({
        room: s.room,
        stdId: s.studentId,
        name: s.name,
        checked: s.status === '출석',
        checkedDate: s.time !== '-' ? s.time : '',
        isSleepover: s.overnight,
      }));
      
      exportMergedAttendanceToExcel(mergedData);
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      alert('엑셀 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  }, [students]);

  // 구버전과 신버전 출석 데이터 병합
  useEffect(() => {
    // 학번 → ID 매핑
    const studentIdMap = new Map<string, number>();
    if (studentsData?.content) {
      studentsData.content.forEach((s) => {
        const studentIdStr = `${s.grade}${s.classroom}${String(s.number).padStart(2, '0')}`;
        studentIdMap.set(studentIdStr, s.id);
      });
    }
    
    // 구버전 데이터를 학번 기준으로 맵핑
    const legacyMap = new Map<string, LegacyUserResponse>();
    if (legacyData) {
      legacyData.forEach((user) => {
        if (user.stdId && user.stdId !== '0000' && user.stdId !== '') {
          legacyMap.set(user.stdId, user);
        }
      });
    }
    
    // 신버전 학생 학번 Set (중복 체크용)
    const newStudentIds = new Set<string>();
    
    // 신버전 학생 목록 먼저 처리
    const mappedStudents: Student[] = [];
    
    if (attendancesData) {
      attendancesData.forEach((att, index) => {
        const student = att.student;
        const studentIdStr = `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;
        newStudentIds.add(studentIdStr);
        const actualId = studentIdMap.get(studentIdStr) || null;
        
        // 구버전 데이터 조회
        const legacyUser = legacyMap.get(studentIdStr);
        const legacyChecked = legacyUser?.checked ?? false;
        
        // 신버전 출석 여부
        const newChecked = att.status === 'PRESENT' || att.status === 'SLEEPOVER';
        
        // 외박 여부
        const isOvernight = att.status === 'SLEEPOVER';
        
        // 둘 중 하나라도 출석이면 출석으로 처리 (외박 제외)
        const isChecked = (att.status === 'PRESENT') || legacyChecked;
        
        // 상태 결정: 외박 > 출석 > 미출석
        let displayStatus: '출석' | '미출석' | '외박' = '미출석';
        if (isOvernight) {
          displayStatus = '외박';
        } else if (isChecked) {
          displayStatus = '출석';
        }
        
        // 출석 시간 (신버전 우선, 없으면 구버전)
        let checkedTime = '-';
        if (att.checkedAt) {
          const date = new Date(att.checkedAt);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          checkedTime = `${hours}:${minutes}`;
        } else if (legacyUser?.checked && legacyUser?.checkedDate) {
          checkedTime = legacyUser.checkedDate.substring(11, 16);
        }

        mappedStudents.push({
          id: actualId,
          index: index,
          room: student.room,
          overnight: isOvernight,
          name: student.name,
          status: displayStatus,
          gender: student.gender === 'MALE' ? '남' : '여',
          studentId: studentIdStr,
          grade: student.grade,
          classroom: student.classroom,
          number: student.number,
          time: checkedTime,
          phone: legacyUser?.phoneNum || '010-0000-0000',
          dormitory: student.room.startsWith('2') ? '여기숙사' : '남기숙사',
          legacyChecked,
          newChecked,
        });
      });
    }
    
    // 구버전에만 있는 학생 추가
    if (legacyData) {
      legacyData.forEach((legacyUser, index) => {
        // 이미 신버전에 있는 학생은 스킵
        if (newStudentIds.has(legacyUser.stdId)) return;
        // TEACHER, ADMIN 제외
        if (legacyUser.userRole !== 'USER') return;
        // 유효하지 않은 학번 제외
        if (!legacyUser.stdId || legacyUser.stdId === '0000' || legacyUser.stdId === '') return;
        
        const studentIdStr = legacyUser.stdId;
        const actualId = studentIdMap.get(studentIdStr) || null;
        
        // 학번에서 학년, 반, 번호 파싱 (예: "3417" -> 3학년 4반 17번)
        const grade = parseInt(studentIdStr.charAt(0)) || 0;
        const classroom = parseInt(studentIdStr.charAt(1)) || 0;
        const number = parseInt(studentIdStr.substring(2)) || 0;
        
        // 구버전 출석 여부
        const isChecked = legacyUser.checked ?? false;
        
        // 출석 시간
        let checkedTime = '-';
        if (isChecked && legacyUser.checkedDate) {
          checkedTime = legacyUser.checkedDate.substring(11, 16);
        }

        mappedStudents.push({
          id: actualId,
          index: mappedStudents.length + index,
          room: legacyUser.room || '',
          overnight: false, // 구버전에서는 외박 정보 없음
          name: legacyUser.name,
          status: isChecked ? '출석' : '미출석',
          gender: legacyUser.gender === 'MALE' ? '남' : '여',
          studentId: studentIdStr,
          grade,
          classroom,
          number,
          time: checkedTime,
          phone: legacyUser.phoneNum || '010-0000-0000',
          dormitory: legacyUser.room?.startsWith('2') ? '여기숙사' : '남기숙사',
          legacyChecked: isChecked,
          newChecked: false,
        });
      });
    }

    setStudents(mappedStudents);
  }, [attendancesData, studentsData, legacyData]);

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
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!student.name.toLowerCase().includes(query) && !student.room.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter (출석, 미출석, 외박)
      if (statusFilter !== '전체' && student.status !== statusFilter) {
        return false;
      }

      // Gender filter
      if (genderFilter !== '전체' && student.gender !== genderFilter) {
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
    if (!updatedStudent.id) {
      console.error('학생 ID를 찾을 수 없습니다.');
      return;
    }
    
    const gender: Gender = updatedStudent.gender === '남' ? 'MALE' : 'FEMALE';
    
    updateStudentMutation.mutate({
      id: updatedStudent.id,
      data: {
        gender,
        room: updatedStudent.room,
      },
    });
    
    setStudents(students.map((s) => (s.studentId === updatedStudent.studentId ? updatedStudent : s)));
  };

  // 기존 handleExportExcel은 위에서 useCallback으로 정의됨

  const stats = {
    total: filteredStudents.length,
    present: filteredStudents.filter((s) => s.status === '출석').length,
    absent: filteredStudents.filter((s) => s.status === '미출석').length,
  };

  if (attendancesLoading) {
    return (
      <div className="check-page">
        <CheckTableSkeleton />
      </div>
    );
  }  return (
    <div className="check-page">
          <div className="controls-section">
            <div className="controls-left">
              <div className="date-picker">
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                />
              </div>
              <div className="search-box">
                <SearchIcon className="search-icon" />
                <input
                  type="text"
                  placeholder="호실 / 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
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
                disabled={isExporting}
              >
                <ExcelIcon className="excel-icon" />
                {isExporting ? '다운로드 중...' : 'Excel'}
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
                <button
                  className={`filter-btn ${statusFilter === '외박' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('외박')}
                >
                  외박
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
                      <input 
                        type="checkbox" 
                        checked={student.overnight} 
                        onChange={() => handleOvernightToggle(student)}
                        disabled={updateAttendancesMutation.isPending}
                        title={student.overnight ? '외박 해제' : '외박 설정'}
                      />
                    </td>
                    <td>{student.name}</td>
                    <td>
                      <span className={
                        student.status === '출석' ? 'status-present' : 
                        student.status === '외박' ? 'status-sleepover' : 'status-absent'
                      }>
                        {student.status}
                      </span>
                    </td>
                    <td>{student.gender}</td>
                    <td>{student.studentId}</td>
                    <td>{student.time}</td>
                    <td>{student.phone}</td>
                    <td></td>
                    <td>
                      <button className="edit-button" onClick={() => handleEditClick(student)} disabled>
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
