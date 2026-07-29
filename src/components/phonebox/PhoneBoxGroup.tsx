import { PencilIcon, TrashIcon } from '../Icons';
import { PHONE_BOX_GENDER_LABEL, sortStudents } from '../../utils/phone-box';
import type { PhoneBoxGender, PhoneBoxResponse } from '../../types/api';

const PREVIEW_LIMIT = 4;

interface PhoneBoxGroupProps {
  gender: PhoneBoxGender;
  boxes: PhoneBoxResponse[];
  onManageStudents: (box: PhoneBoxResponse) => void;
  onRenameBox: (box: PhoneBoxResponse) => void;
  onDeleteBox: (box: PhoneBoxResponse) => void;
}

export default function PhoneBoxGroup({
  gender,
  boxes,
  onManageStudents,
  onRenameBox,
  onDeleteBox,
}: PhoneBoxGroupProps) {
  const totalStudents = boxes.reduce((sum, box) => sum + box.students.length, 0);

  return (
    <section className="floor-section">
      <div className="floor-header">
        <div>
          <h2 className="floor-title">{PHONE_BOX_GENDER_LABEL[gender]}</h2>
          <p className="floor-count">
            {boxes.length}개 제출함 · {totalStudents}명 배정
          </p>
        </div>
      </div>

      <div className="phonebox-grid">
        {boxes.map((box) => {
          const students = sortStudents(box.students);
          const preview = students.slice(0, PREVIEW_LIMIT);
          const restCount = students.length - preview.length;

          return (
            <article key={box.id} className="phonebox-card">
              <div className="phonebox-card-head">
                <h3 className="phonebox-card-name">{box.name}</h3>
                <span className={`phonebox-gender-badge ${box.gender.toLowerCase()}`}>
                  {PHONE_BOX_GENDER_LABEL[box.gender]}
                </span>
              </div>

              <p className="phonebox-card-count">
                등록 학생 <strong>{students.length}</strong>명
              </p>

              <div className="phonebox-card-preview">
                {preview.length > 0 ? (
                  <>
                    {preview.map((student) => (
                      <span key={student.id} className="phonebox-student-chip">
                        {student.room}호 {student.name}
                      </span>
                    ))}
                    {restCount > 0 && (
                      <span className="phonebox-student-chip more">
                        외 {restCount}명
                      </span>
                    )}
                  </>
                ) : (
                  <span className="phonebox-empty-preview">
                    배정된 학생이 없습니다.
                  </span>
                )}
              </div>

              <div className="phonebox-card-actions">
                <button
                  type="button"
                  className="phonebox-manage-button"
                  onClick={() => onManageStudents(box)}
                >
                  학생 관리
                </button>
                <button
                  type="button"
                  className="phonebox-icon-button"
                  aria-label={`${box.name} 이름 수정`}
                  onClick={() => onRenameBox(box)}
                >
                  <PencilIcon className="phonebox-action-icon" />
                </button>
                <button
                  type="button"
                  className="phonebox-icon-button danger"
                  aria-label={`${box.name} 삭제`}
                  onClick={() => onDeleteBox(box)}
                >
                  <TrashIcon className="phonebox-action-icon" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
