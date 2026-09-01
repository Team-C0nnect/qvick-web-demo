import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../services/student.service';
import '../styles/CheckStudentDetail.css';

const formatPhoneNumber = (phoneNumber?: string) => {
  if (!phoneNumber) return '-';

  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phoneNumber;
};

export default function CheckStudentDetail() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const studentId = Number(userId);
  const isValidStudentId = Number.isInteger(studentId) && studentId > 0;

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getStudent(studentId),
    enabled: isValidStudentId,
  });

  if (isLoading) {
    return (
      <div className="check-student-detail loading">
        학생 정보를 불러오는 중입니다.
      </div>
    );
  }

  if (!isValidStudentId || isError || !student) {
    return (
      <div className="check-student-detail empty">
        <p>학생 정보를 찾을 수 없습니다.</p>
        <button type="button" onClick={() => navigate('/check')}>
          인원 확인으로 돌아가기
        </button>
      </div>
    );
  }

  const studentNumber = `${student.grade}${student.classroom}${String(
    student.number,
  ).padStart(2, '0')}`;
  const gender = student.gender === 'MALE' ? '남학생' : '여학생';

  return (
    <main className="check-student-detail">
      <button
        type="button"
        className="check-student-back-button"
        onClick={() => navigate('/check')}
      >
        ← 인원 확인으로 돌아가기
      </button>

      <section
        className="check-student-profile"
        aria-label={`${student.name} 학생 정보`}
      >
        <div className="check-student-profile-heading">
          <span>STUDENT PROFILE</span>
          <h1>{student.name}</h1>
          <p>
            {studentNumber} · {gender}
          </p>
        </div>

        <dl className="check-student-info-grid">
          <div>
            <dt>학번</dt>
            <dd>{studentNumber}</dd>
          </div>
          <div>
            <dt>호실</dt>
            <dd>{student.room}호</dd>
          </div>
          <div>
            <dt>학급</dt>
            <dd>
              {student.grade}학년 {student.classroom}반 {student.number}번
            </dd>
          </div>
          <div>
            <dt>성별</dt>
            <dd>{gender}</dd>
          </div>
          <div>
            <dt>연락처</dt>
            <dd>{formatPhoneNumber(student.phoneNumber)}</dd>
          </div>
          <div>
            <dt>자치위원</dt>
            <dd>{student.isCouncil ? '설정됨' : '미설정'}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
