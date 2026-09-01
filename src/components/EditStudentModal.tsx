import React, { useEffect, useState } from 'react';
import '../styles/EditStudentModal.css';

interface Student {
  id: number | null;
  index: number;
  room: string;
  overnight: boolean;
  name: string;
  status: '출석' | '미출석' | '외박' | '지연출석';
  gender: '남' | '여';
  studentId: string;
  grade: number;
  classroom: number;
  number: number;
  time: string;
  phone: string;
  dormitory: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSave: (student: Student) => void;
}

const EMPTY_STUDENT: Student = {
  id: null,
  index: 0,
  room: '',
  overnight: false,
  name: '',
  status: '출석',
  gender: '남',
  studentId: '',
  grade: 0,
  classroom: 0,
  number: 0,
  time: '',
  phone: '',
  dormitory: '',
};

const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave,
}) => {
  const [formData, setFormData] = useState<Student>(EMPTY_STUDENT);

  useEffect(() => {
    if (student) setFormData(student);
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="student-edit-backdrop" onClick={handleOverlayClick}>
      <div
        className="student-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-edit-title"
      >
        <header className="student-edit-header">
          <div>
            <span className="student-edit-kicker">학생 관리</span>
            <h2 id="student-edit-title">학생 정보 수정</h2>
          </div>
          <button
            type="button"
            className="student-edit-close-button"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="student-edit-form">
          <div className="student-edit-body">
            <div className="student-edit-summary">
              <div>
                <span>이름</span>
                <strong>{formData.name}</strong>
              </div>
              <div>
                <span>학번</span>
                <strong>{formData.studentId}</strong>
              </div>
            </div>

            <section className="student-edit-group">
              <h3>학적 정보</h3>
              <div className="student-edit-grid three-columns">
                <div className="student-edit-field">
                  <label htmlFor="edit-student-grade">학년</label>
                  <input
                    id="edit-student-grade"
                    type="number"
                    className="student-edit-input"
                    value={formData.grade}
                    min={1}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        grade: Number(event.target.value),
                      })
                    }
                  />
                </div>
                <div className="student-edit-field">
                  <label htmlFor="edit-student-classroom">반</label>
                  <input
                    id="edit-student-classroom"
                    type="number"
                    className="student-edit-input"
                    value={formData.classroom}
                    min={1}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        classroom: Number(event.target.value),
                      })
                    }
                  />
                </div>
                <div className="student-edit-field">
                  <label htmlFor="edit-student-number">번호</label>
                  <input
                    id="edit-student-number"
                    type="number"
                    className="student-edit-input"
                    value={formData.number}
                    min={1}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        number: Number(event.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="student-edit-group">
              <h3>생활 정보</h3>
              <div className="student-edit-grid two-columns">
                <div className="student-edit-field">
                  <label htmlFor="edit-student-room">호실</label>
                  <input
                    id="edit-student-room"
                    type="text"
                    className="student-edit-input"
                    value={formData.room}
                    onChange={(event) =>
                      setFormData({ ...formData, room: event.target.value })
                    }
                  />
                </div>
                <div className="student-edit-field">
                  <label>성별</label>
                  <div
                    className="student-edit-gender-switcher"
                    role="group"
                    aria-label="성별 선택"
                  >
                    <button
                      type="button"
                      className={`student-edit-gender-option male ${
                        formData.gender === '남' ? 'active' : ''
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, gender: '남' })
                      }
                    >
                      남학생
                    </button>
                    <button
                      type="button"
                      className={`student-edit-gender-option female ${
                        formData.gender === '여' ? 'active' : ''
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, gender: '여' })
                      }
                    >
                      여학생
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="student-edit-group">
              <h3>연락처</h3>
              <div className="student-edit-field">
                <label htmlFor="edit-student-phone">전화번호</label>
                <input
                  id="edit-student-phone"
                  type="text"
                  className="student-edit-input"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData({ ...formData, phone: event.target.value })
                  }
                />
              </div>
            </section>
          </div>

          <footer className="student-edit-actions">
            <button
              type="button"
              className="student-edit-cancel-button"
              onClick={onClose}
            >
              취소
            </button>
            <button type="submit" className="student-edit-submit-button">
              저장
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
