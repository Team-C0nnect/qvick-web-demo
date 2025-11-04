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

export default function Check() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  
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
          gender: student.grade && student.classroom ? '여' : '남', // Default mapping
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
    total: students.length,
    present: students.filter((s) => s.status === '출석').length,
    absent: students.filter((s) => s.status === '미출석').length,
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

          <div className="table-container">
            <table className="student-table">
              <thead>
                <tr>
                  <th>호실</th>
                  <th>외박</th>
                  <th>이름</th>
                  <th>상태</th>
                  <th>성별</th>
                  <th>학번</th>
                  <th>출석 시간</th>
                  <th>연락처</th>
                  <th></th>
                  <th>정보 수정</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
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
