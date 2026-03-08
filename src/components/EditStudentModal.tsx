import React, { useState, useEffect } from 'react';
import '../styles/EditStudentModal.css';

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
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSave: (student: Student) => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, student, onSave }) => {
  const [formData, setFormData] = useState<Student>({
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
  });

  useEffect(() => {
    if (student) {
      setFormData(student);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const profileInitial = formData.name.trim().charAt(0) || '?';

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
          <div className="modal-header-copy">
            <span className="modal-eyebrow">Student Profile</span>
            <div className="modal-title-row">
              <h2 className="student-name">{formData.name}</h2>
              <p className="subtitle">학생 정보 수정</p>
            </div>
            <p className="modal-description">출석 관리에 필요한 기본 정보를 이 화면에서 바로 정리할 수 있습니다.</p>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="모달 닫기">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="student-summary-card">
            <div className="student-avatar">{profileInitial}</div>
            <div className="student-summary-content">
              <div className="student-summary-top">
                <strong className="summary-name">{formData.name}</strong>
                <span className={`summary-status ${formData.status === '출석' ? 'present' : formData.status === '외박' ? 'sleepover' : 'absent'}`}>
                  {formData.status}
                </span>
              </div>
              <div className="summary-meta-list">
                <span className="summary-chip">학번 {formData.studentId}</span>
                <span className="summary-chip">{formData.dormitory || '기숙사 정보 없음'}</span>
                <span className="summary-chip">호실 {formData.room || '-'}</span>
              </div>
            </div>
          </div>

          <section className="modal-section">
            <div className="section-heading">
              <h3 className="section-title">기본 정보</h3>
              <p className="section-description">변경되지 않는 학생 식별 정보입니다.</p>
            </div>

            <div className="readonly-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="edit-student-name">이름</label>
                <div className="input-wrapper readonly">
                  <input
                    id="edit-student-name"
                    type="text"
                    className="input-field"
                    value={formData.name}
                    disabled
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="edit-student-id">학번</label>
                <div className="input-wrapper readonly">
                  <input
                    id="edit-student-id"
                    type="text"
                    className="input-field"
                    value={formData.studentId}
                    disabled
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="modal-section">
            <div className="section-heading">
              <h3 className="section-title">학적 및 생활 정보</h3>
              <p className="section-description">학년, 반, 번호와 생활 정보를 함께 관리합니다.</p>
            </div>

            <div className="form-grade-row compact-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="edit-student-grade">학년</label>
                <div className="input-wrapper">
                  <input
                    id="edit-student-grade"
                    type="number"
                    className="input-field"
                    value={formData.grade}
                    min={1}
                    onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="edit-student-classroom">반</label>
                <div className="input-wrapper">
                  <input
                    id="edit-student-classroom"
                    type="number"
                    className="input-field"
                    value={formData.classroom}
                    min={1}
                    onChange={(e) => setFormData({ ...formData, classroom: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="edit-student-number">번호</label>
                <div className="input-wrapper">
                  <input
                    id="edit-student-number"
                    type="number"
                    className="input-field"
                    value={formData.number}
                    min={1}
                    onChange={(e) => setFormData({ ...formData, number: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="form-grid two-column-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="edit-student-room">호실</label>
                <div className="input-wrapper">
                  <input
                    id="edit-student-room"
                    type="text"
                    className="input-field"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">성별</label>
                <div className="gender-switcher" role="group" aria-label="성별 선택">
                  <button
                    type="button"
                    className={`gender-option ${formData.gender === '남' ? 'active male' : ''}`}
                    onClick={() => setFormData({ ...formData, gender: '남' })}
                  >
                    남학생
                  </button>
                  <button
                    type="button"
                    className={`gender-option ${formData.gender === '여' ? 'active female' : ''}`}
                    onClick={() => setFormData({ ...formData, gender: '여' })}
                  >
                    여학생
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="modal-section">
            <div className="section-heading">
              <h3 className="section-title">연락처</h3>
              <p className="section-description">비상 연락 및 확인용 번호를 최신 상태로 유지합니다.</p>
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="edit-student-phone">연락처</label>
              <div className="input-wrapper">
                <input
                  id="edit-student-phone"
                  type="text"
                  className="input-field"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </section>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="submit-button">
              변경 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
