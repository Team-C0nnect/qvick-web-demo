import React, { useState, useEffect } from 'react';
import '../styles/EditStudentModal.css';

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

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSave: (student: Student) => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, student, onSave }) => {
  const [formData, setFormData] = useState<Student>({
    id: 0,
    room: '',
    overnight: false,
    name: '',
    status: '출석',
    gender: '남',
    studentId: '',
    time: '',
    phone: '',
    dormitory: '',
  });

  useEffect(() => {
    if (student) {
      setFormData(student);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-title-row">
            <h2 className="student-name">{student.name}</h2>
            <p className="subtitle">학생의 정보 수정</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label className="field-label">이름</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="student-id-row">
            <div className="form-field flex-grow">
              <label className="field-label">학번</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="input-field"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                />
              </div>
            </div>
            <button
              type="button"
              className={`gender-button ${formData.gender === '남' ? 'male' : 'female'}`}
              onClick={() => setFormData({ ...formData, gender: formData.gender === '남' ? '여' : '남' })}
            >
              {formData.gender}
            </button>
          </div>

          <div className="form-field">
            <label className="field-label">연락처</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="input-field"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="submit-button">
            수정 완료
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
