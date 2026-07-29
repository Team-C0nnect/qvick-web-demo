import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import ConfirmationModal from '../components/ConfirmationModal';
import PhoneBoxCreateModal from '../components/phonebox/PhoneBoxCreateModal';
import PhoneBoxEditModal from '../components/phonebox/PhoneBoxEditModal';
import PhoneBoxGroup from '../components/phonebox/PhoneBoxGroup';
import PhoneBoxStudentModal from '../components/phonebox/PhoneBoxStudentModal';
import type { GenderFilter } from '../components/phonebox/PhoneBoxToolbar';
import PhoneBoxToolbar from '../components/phonebox/PhoneBoxToolbar';
import { phoneBoxService } from '../services/phone-box.service';
import { studentService } from '../services/student.service';
import { sortPhoneBoxes } from '../utils/phone-box';
import '../styles/Room.css';
import '../styles/PhoneBox.css';
import type {
  CreatePhoneBoxRequest,
  PhoneBoxGender,
  PhoneBoxResponse,
} from '../types/api';

const GROUP_ORDER: PhoneBoxGender[] = ['MALE', 'FEMALE', 'ALL'];

type RemoveTarget = {
  boxId: number;
  student: { id: number; name: string };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)
      ?.message;
    if (message) return message;
  }
  return fallback;
};

export default function PhoneBox() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ALL_BOXES');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [manageTargetId, setManageTargetId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PhoneBoxResponse | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const genderParam = genderFilter === 'ALL_BOXES' ? undefined : genderFilter;

  const {
    data: boxes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['phone-boxes', genderParam ?? 'all'],
    queryFn: () => phoneBoxService.getPhoneBoxes(genderParam),
  });

  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentService.getStudents({ page: 0, size: 1000 }),
    staleTime: 5 * 60 * 1000,
    enabled: manageTargetId !== null,
  });

  const invalidatePhoneBoxes = () =>
    queryClient.invalidateQueries({ queryKey: ['phone-boxes'] });

  const createMutation = useMutation({
    mutationFn: (data: CreatePhoneBoxRequest) =>
      phoneBoxService.createPhoneBox(data),
    onSuccess: () => {
      invalidatePhoneBoxes();
      setIsCreateModalOpen(false);
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ boxId, name }: { boxId: number; name: string }) =>
      phoneBoxService.updatePhoneBoxName(boxId, { name }),
    onSuccess: () => {
      invalidatePhoneBoxes();
      setEditTargetId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (boxId: number) => phoneBoxService.deletePhoneBox(boxId),
    onSuccess: (_, boxId) => {
      invalidatePhoneBoxes();
      setDeleteTarget(null);
      if (manageTargetId === boxId) setManageTargetId(null);
    },
  });

  const addStudentsMutation = useMutation({
    mutationFn: ({ boxId, studentIds }: { boxId: number; studentIds: number[] }) =>
      phoneBoxService.addStudents(boxId, { studentIds }),
    onSuccess: () => invalidatePhoneBoxes(),
  });

  const removeStudentsMutation = useMutation({
    mutationFn: ({ boxId, studentIds }: { boxId: number; studentIds: number[] }) =>
      phoneBoxService.removeStudents(boxId, { studentIds }),
    onSuccess: () => {
      invalidatePhoneBoxes();
      setRemoveTarget(null);
    },
  });

  const filteredBoxes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const sorted = sortPhoneBoxes(boxes);

    if (!query) return sorted;

    return sorted.filter(
      (box) =>
        box.name.toLowerCase().includes(query) ||
        box.students.some((student) =>
          `${student.room} ${student.name}`.toLowerCase().includes(query),
        ),
    );
  }, [boxes, searchTerm]);

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((gender) => ({
        gender,
        boxes: filteredBoxes.filter((box) => box.gender === gender),
      })).filter((group) => group.boxes.length > 0),
    [filteredBoxes],
  );

  const editTarget = boxes.find((box) => box.id === editTargetId) ?? null;
  const manageTarget = boxes.find((box) => box.id === manageTargetId) ?? null;

  const listErrorMessage = isError
    ? '휴대폰 제출함 목록을 불러오지 못했습니다. 다시 시도해주세요.'
    : deleteMutation.isError
      ? getErrorMessage(
          deleteMutation.error,
          '제출함 삭제에 실패했습니다. 다시 시도해주세요.',
        )
      : '';

  const studentModalError = addStudentsMutation.isError
    ? getErrorMessage(
        addStudentsMutation.error,
        '학생 추가에 실패했습니다. 다시 시도해주세요.',
      )
    : removeStudentsMutation.isError
      ? getErrorMessage(
          removeStudentsMutation.error,
          '학생 제거에 실패했습니다. 다시 시도해주세요.',
        )
      : '';

  const handleCloseStudentModal = () => {
    setManageTargetId(null);
    addStudentsMutation.reset();
    removeStudentsMutation.reset();
  };

  return (
    <div className="room-page phonebox-page">
      <div className="room-container">
        <PhoneBoxToolbar
          searchTerm={searchTerm}
          selectedGender={genderFilter}
          onSearchChange={setSearchTerm}
          onGenderChange={setGenderFilter}
          onCreateBox={() => {
            createMutation.reset();
            setIsCreateModalOpen(true);
          }}
        />

        {listErrorMessage && (
          <div className="room-error-banner">{listErrorMessage}</div>
        )}

        {isLoading ? (
          <div className="room-loading">로딩 중...</div>
        ) : boxes.length === 0 ? (
          <div className="room-empty-state">
            <strong>등록된 휴대폰 제출함이 없습니다.</strong>
            <span>제출함을 추가하여 학생들을 배정하세요.</span>
          </div>
        ) : filteredBoxes.length === 0 ? (
          <div className="room-empty-state">
            <strong>조건에 맞는 제출함이 없습니다.</strong>
            <span>검색어나 기숙사 필터를 다시 확인해주세요.</span>
          </div>
        ) : (
          <div className="floor-sections">
            {groups.map((group) => (
              <PhoneBoxGroup
                key={group.gender}
                gender={group.gender}
                boxes={group.boxes}
                onManageStudents={(box) => {
                  addStudentsMutation.reset();
                  removeStudentsMutation.reset();
                  setManageTargetId(box.id);
                }}
                onRenameBox={(box) => {
                  renameMutation.reset();
                  setEditTargetId(box.id);
                }}
                onDeleteBox={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <PhoneBoxCreateModal
          defaultGender={genderParam ?? 'MALE'}
          isPending={createMutation.isPending}
          requestError={
            createMutation.isError
              ? getErrorMessage(
                  createMutation.error,
                  '제출함 생성에 실패했습니다. 다시 시도해주세요.',
                )
              : ''
          }
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}

      {editTarget && (
        <PhoneBoxEditModal
          box={editTarget}
          isPending={renameMutation.isPending}
          requestError={
            renameMutation.isError
              ? getErrorMessage(
                  renameMutation.error,
                  '이름 수정에 실패했습니다. 다시 시도해주세요.',
                )
              : ''
          }
          onClose={() => setEditTargetId(null)}
          onSubmit={(name) =>
            renameMutation.mutate({ boxId: editTarget.id, name })
          }
        />
      )}

      {manageTarget && (
        <PhoneBoxStudentModal
          box={manageTarget}
          students={studentsData?.content ?? []}
          isStudentsLoading={isStudentsLoading}
          isAdding={addStudentsMutation.isPending}
          isRemoving={removeStudentsMutation.isPending}
          requestError={studentModalError}
          onClose={handleCloseStudentModal}
          onAddStudents={async (studentIds) => {
            await addStudentsMutation.mutateAsync({
              boxId: manageTarget.id,
              studentIds,
            });
          }}
          onRemoveStudent={(student) =>
            setRemoveTarget({ boxId: manageTarget.id, student })
          }
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        eyebrow="Confirm action"
        title="제출함 삭제"
        message={`${deleteTarget?.name ?? ''} 제출함을 삭제하시겠습니까? 배정된 학생 ${
          deleteTarget?.students.length ?? 0
        }명도 함께 해제됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmationModal
        isOpen={Boolean(removeTarget)}
        eyebrow="Remove student"
        title="학생 제거"
        message={`${removeTarget?.student.name ?? ''} 학생을 제출함에서 제거하시겠습니까?`}
        confirmText="제거"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={removeStudentsMutation.isPending}
        onConfirm={() => {
          if (removeTarget) {
            removeStudentsMutation.mutate({
              boxId: removeTarget.boxId,
              studentIds: [removeTarget.student.id],
            });
          }
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
