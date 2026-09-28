import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from './ConfirmationModal';
import SleepoverPinCreateModal from './SleepoverPinCreateModal';
import { SearchIcon } from './Icons';
import { TableRowSkeleton } from './Skeleton';
import { useToast } from '../hooks/useToast';
import { useGenderView } from '../context/GenderViewContext';
import { sleepoverService } from '../services/sleepover.service';
import { formatLocalDate } from '../utils/date';
import { matchesKoreanNameSearch } from '../utils/korean-search';
import { getStudentNumber, sortStudents } from '../utils/phone-box';
import {
  SLEEPOVER_PIN_REASON_ETC,
  SLEEPOVER_PIN_REASON_OPTIONS,
  SLEEPOVER_PIN_STATUS_LABEL,
  formatPinDate,
  isPastSleepoverPinDate,
  getSleepoverPinErrorMessage,
  getSleepoverPinStatus,
  isPresetSleepoverPinReason,
  isStaleSleepoverPinError,
  isValidSleepoverPinRange,
  type SleepoverPinStatus,
} from '../utils/sleepover-pin';
import type {
  CreateSleepoverPinRequest,
  SleepoverPinResponse,
  StudentResponse,
  UpdateSleepoverPinItem,
} from '../types/api';

interface SleepoverPinPanelProps {
  students: StudentResponse[];
  isStudentsLoading: boolean;
  defaultStartDate: string;
}

type PinDraft = Pick<SleepoverPinResponse, 'startDate' | 'endDate'> & {
  reason: string;
  /** '기타'를 골라 사유를 직접 입력하는 중인지 (reason이 비어 있어도 구분되어야 함) */
  isEtc: boolean;
};

type PinRow = SleepoverPinResponse & {
  student: StudentResponse | null;
  status: SleepoverPinStatus;
};

type DeleteTarget = {
  pinId: number;
  studentName: string;
  period: string;
} | null;

const STATUS_ORDER: Record<SleepoverPinStatus, number> = {
  ACTIVE: 0,
  UPCOMING: 1,
  ENDED: 2,
};

const STATUS_FILTERS = ['전체', 'ACTIVE', 'UPCOMING', 'ENDED'] as const;

/** 과거 날짜로 저장된 항목은 그대로 유지할 수 있게 원래 값까지 허용합니다. */
const minPinDate = (originalDate: string) => {
  const today = formatLocalDate();
  return originalDate < today ? originalDate : today;
};

const toDraft = (pin: SleepoverPinResponse): PinDraft => ({
  startDate: pin.startDate,
  endDate: pin.endDate,
  reason: pin.reason ?? '',
  // 선택지에 없는 기존 사유는 '기타'(직접 입력)로 열어 둡니다.
  isEtc: Boolean(pin.reason) && !isPresetSleepoverPinReason(pin.reason ?? ''),
});

/** 원본과 비교해 바뀐 필드만 담은 수정 항목을 만듭니다. 변경이 없으면 null */
const toUpdateItem = (
  pin: SleepoverPinResponse,
  draft: PinDraft,
): UpdateSleepoverPinItem | null => {
  const item: UpdateSleepoverPinItem = { pinId: pin.pinId };
  const reason = draft.reason.trim() || null;

  if (draft.startDate !== pin.startDate) item.startDate = draft.startDate;
  if (draft.endDate !== pin.endDate) item.endDate = draft.endDate;
  if (reason !== (pin.reason ?? null)) item.reason = reason;

  return Object.keys(item).length > 1 ? item : null;
};

export default function SleepoverPinPanel({
  students,
  isStudentsLoading,
  defaultStartDate,
}: SleepoverPinPanelProps) {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const { genderView } = useGenderView();
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'전체' | '남' | '여'>(
    genderView,
  );
  const [gradeFilter, setGradeFilter] = useState<'전체' | 1 | 2 | 3>('전체');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('전체');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [drafts, setDrafts] = useState<Record<number, PinDraft> | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const isEditing = drafts !== null;

  useEffect(() => {
    setGenderFilter(genderView);
  }, [genderView]);

  const { data: pinsData, isLoading: isPinsLoading } = useQuery({
    queryKey: ['sleepover-pins'],
    queryFn: () => sleepoverService.getAllSleepoverPins(),
  });

  const invalidateSleepoverQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['sleepover-pins'] });
    queryClient.invalidateQueries({ queryKey: ['sleepovers'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['device-submissions'] });
  };

  const handleMutationError = (error: unknown, fallback: string) => {
    showError(getSleepoverPinErrorMessage(error, fallback));
    if (isStaleSleepoverPinError(error)) {
      queryClient.invalidateQueries({ queryKey: ['sleepover-pins'] });
      queryClient.invalidateQueries({ queryKey: ['students-all'] });
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({
      studentIds,
      data,
    }: {
      studentIds: number[];
      data: Omit<CreateSleepoverPinRequest, 'studentId'>;
    }) => {
      const failedRequests: Array<{ studentId: number; error: unknown }> = [];

      for (let offset = 0; offset < studentIds.length; offset += 5) {
        const batchStudentIds = studentIds.slice(offset, offset + 5);
        const results = await Promise.allSettled(
          batchStudentIds.map((studentId) =>
            sleepoverService.createSleepoverPin({ studentId, ...data }),
          ),
        );

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            failedRequests.push({
              studentId: batchStudentIds[index],
              error: result.reason,
            });
          }
        });
      }

      return failedRequests;
    },
    onSuccess: (failedRequests, { studentIds }) => {
      const failedStudentIds = failedRequests.map(({ studentId }) => studentId);
      const succeededCount = studentIds.length - failedStudentIds.length;
      if (succeededCount > 0) invalidateSleepoverQueries();

      const fallback = '고정 외박 등록에 실패했습니다.';
      const handledErrorMessages = new Set<string>();
      failedRequests.forEach(({ error }) => {
        const errorMessage = getSleepoverPinErrorMessage(error, fallback);
        if (handledErrorMessages.has(errorMessage)) return;

        handledErrorMessages.add(errorMessage);
        handleMutationError(error, fallback);
      });

      if (failedStudentIds.length === 0) {
        setIsCreateModalOpen(false);
        showSuccess(`고정 외박 ${succeededCount}명을 등록했어요.`);
      }
    },
    onError: (error) =>
      handleMutationError(error, '고정 외박 등록에 실패했습니다.'),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (pins: UpdateSleepoverPinItem[]) =>
      sleepoverService.bulkUpdateSleepoverPins({ pins }),
    onSuccess: (_, pins) => {
      setDrafts(null);
      showSuccess(`고정 외박 ${pins.length}건을 수정했어요.`);
      invalidateSleepoverQueries();
    },
    // 전체 요청이 반영되지 않으므로 편집 중인 내용은 그대로 둡니다.
    onError: (error) =>
      handleMutationError(
        error,
        '고정 외박 수정에 실패했습니다. 변경 사항은 반영되지 않았어요.',
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (pinId: number) => sleepoverService.deleteSleepoverPin(pinId),
    onSuccess: () => {
      setDeleteTarget(null);
      showSuccess('고정 외박을 삭제했어요.');
      invalidateSleepoverQueries();
    },
    onError: (error) => {
      setDeleteTarget(null);
      handleMutationError(error, '고정 외박 삭제에 실패했습니다.');
    },
  });

  const pins = useMemo(() => pinsData?.content ?? [], [pinsData]);

  const rows = useMemo<PinRow[]>(() => {
    const today = formatLocalDate();
    const studentById = new Map(students.map((student) => [student.id, student]));

    return pins.map((pin) => ({
      ...pin,
      student: studentById.get(pin.studentId) ?? null,
      status: getSleepoverPinStatus(pin, today),
    }));
  }, [pins, students]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sortedStudentIds = new Map(
      sortStudents(students).map((student, index) => [student.id, index]),
    );

    return rows
      .filter((row) => {
        if (statusFilter !== '전체' && row.status !== statusFilter) return false;

        const { student } = row;
        if (!student) {
          return !query && genderFilter === '전체' && gradeFilter === '전체';
        }

        if (query) {
          const isMatched =
            matchesKoreanNameSearch(student.name, searchQuery) ||
            student.room.toLowerCase().includes(query) ||
            getStudentNumber(student).includes(query) ||
            (row.reason ?? '').toLowerCase().includes(query);

          if (!isMatched) return false;
        }

        const gender = student.gender === 'MALE' ? '남' : '여';
        if (genderFilter !== '전체' && gender !== genderFilter) return false;
        if (gradeFilter !== '전체' && student.grade !== gradeFilter) return false;

        return true;
      })
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;

        const studentDiff =
          (sortedStudentIds.get(a.studentId) ?? Infinity) -
          (sortedStudentIds.get(b.studentId) ?? Infinity);
        if (studentDiff !== 0) return studentDiff;

        return a.startDate.localeCompare(b.startDate);
      });
  }, [genderFilter, gradeFilter, rows, searchQuery, statusFilter, students]);

  const pendingUpdates = useMemo(() => {
    if (!drafts) return [];

    return pins.flatMap((pin) => {
      const draft = drafts[pin.pinId];
      const item = draft ? toUpdateItem(pin, draft) : null;
      return item ? [item] : [];
    });
  }, [drafts, pins]);

  const invalidPinIds = useMemo(() => {
    if (!drafts) return new Set<number>();

    const today = formatLocalDate();

    return new Set(
      pins
        .filter((pin) => {
          const draft = drafts[pin.pinId];
          if (!draft) return false;

          if (!isValidSleepoverPinRange(draft.startDate, draft.endDate)) {
            return true;
          }

          // 서버는 오늘 이후만 수정할 수 있으므로, 과거로 "바꾼" 날짜만 오류로 봅니다.
          // (원래 과거 날짜였던 항목을 그대로 두는 것은 전송되지 않으므로 허용)
          return (
            (draft.startDate !== pin.startDate &&
              isPastSleepoverPinDate(draft.startDate, today)) ||
            (draft.endDate !== pin.endDate &&
              isPastSleepoverPinDate(draft.endDate, today))
          );
        })
        .map((pin) => pin.pinId),
    );
  }, [drafts, pins]);

  /** '기타'를 골라 놓고 사유를 비워 둔 행 */
  const emptyEtcPinIds = useMemo(() => {
    if (!drafts) return new Set<number>();

    return new Set(
      Object.entries(drafts)
        .filter(([, draft]) => draft.isEtc && !draft.reason.trim())
        .map(([pinId]) => Number(pinId)),
    );
  }, [drafts]);

  const isActionPending =
    createMutation.isPending ||
    bulkUpdateMutation.isPending ||
    deleteMutation.isPending;
  const isLoading = isPinsLoading || isStudentsLoading;

  const startEditing = () => {
    setDrafts(Object.fromEntries(pins.map((pin) => [pin.pinId, toDraft(pin)])));
  };

  const updateDraft = (pin: SleepoverPinResponse, patch: Partial<PinDraft>) => {
    setDrafts((current) => {
      if (!current) return current;
      const draft = current[pin.pinId] ?? toDraft(pin);
      return { ...current, [pin.pinId]: { ...draft, ...patch } };
    });
  };

  const requestCancelEditing = () => {
    if (pendingUpdates.length > 0) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    setDrafts(null);
  };

  const saveDrafts = () => {
    if (pendingUpdates.length === 0) {
      setDrafts(null);
      return;
    }

    if (pendingUpdates.some((item) => invalidPinIds.has(item.pinId))) {
      showError(
        '기간을 확인해주세요. 종료일은 시작일 이후, 오늘 이후 날짜만 수정할 수 있습니다.',
      );
      return;
    }

    if (emptyEtcPinIds.size > 0) {
      showError('기타 사유를 입력해주세요. 표시된 항목을 확인해주세요.');
      return;
    }

    bulkUpdateMutation.mutate(pendingUpdates);
  };

  return (
    <>
      <div className="table-panel">
        <div className="table-toolbar">
          <div className="search-box">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="호실 / 이름 / 학번 / 사유로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-filters">
          <div className="filter-group">
            <label className="filter-label">성별:</label>
            <div className="filter-buttons">
              {(['전체', '남', '여'] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  className={`filter-btn ${genderFilter === gender ? 'active' : ''}`}
                  onClick={() => setGenderFilter(gender)}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">학년:</label>
            <div className="filter-buttons">
              {(['전체', 1, 2, 3] as const).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  className={`filter-btn ${gradeFilter === grade ? 'active' : ''}`}
                  onClick={() => setGradeFilter(grade)}
                >
                  {grade === '전체' ? '전체' : `${grade}학년`}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">상태:</label>
            <div className="filter-buttons">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === '전체' ? '전체' : SLEEPOVER_PIN_STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="sleepover-filter-actions">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="sleepover-secondary-button"
                  onClick={requestCancelEditing}
                  disabled={bulkUpdateMutation.isPending}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="sleepover-primary-button"
                  onClick={saveDrafts}
                  disabled={bulkUpdateMutation.isPending}
                >
                  {bulkUpdateMutation.isPending
                    ? '저장 중...'
                    : `저장${pendingUpdates.length > 0 ? ` (${pendingUpdates.length})` : ''}`}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="sleepover-secondary-button"
                  onClick={startEditing}
                  disabled={isActionPending || pins.length === 0}
                >
                  일괄 수정
                </button>
                <button
                  type="button"
                  className="sleepover-primary-button"
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={isActionPending}
                >
                  고정 외박 등록
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <p className="sleepover-pin-edit-hint">
            기간과 사유만 수정할 수 있어요. 학생을 바꾸려면 삭제 후 다시
            등록해주세요. 한 건이라도 실패하면 전체가 반영되지 않습니다.
          </p>
        )}

        <div className="table-container">
          <table className="student-table sleepover-pin-table">
            <colgroup>
              <col className="sleepover-pin-column-room" />
              <col className="sleepover-pin-column-name" />
              <col className="sleepover-pin-column-gender" />
              <col className="sleepover-pin-column-student-id" />
              <col className="sleepover-pin-column-period" />
              <col className="sleepover-pin-column-reason" />
              <col className="sleepover-pin-column-status" />
              <col className="sleepover-pin-column-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>호실</th>
                <th>이름</th>
                <th>성별</th>
                <th>학번</th>
                <th>기간</th>
                <th>외박 사유</th>
                <th>상태</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={8} />
                ))
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const { student } = row;
                  const draft = drafts?.[row.pinId] ?? toDraft(row);
                  const isInvalid = invalidPinIds.has(row.pinId);
                  const isEmptyEtc = emptyEtcPinIds.has(row.pinId);
                  const isChanged = pendingUpdates.some(
                    (item) => item.pinId === row.pinId,
                  );
                  const studentName = student?.name ?? `알 수 없는 학생 (#${row.studentId})`;

                  return (
                    <tr
                      key={row.pinId}
                      className={`${isChanged ? 'sleepover-pin-row-changed' : ''} ${
                        isInvalid ? 'sleepover-pin-row-invalid' : ''
                      } ${isEmptyEtc ? 'sleepover-pin-row-reason-invalid' : ''}`}
                    >
                      <td className="room-cell" data-label="호실">
                        {student?.room ?? '-'}
                      </td>
                      <td data-label="이름">{studentName}</td>
                      <td data-label="성별">
                        {student ? (student.gender === 'MALE' ? '남' : '여') : '-'}
                      </td>
                      <td data-label="학번">
                        {student ? getStudentNumber(student) : '-'}
                      </td>
                      <td data-label="기간">
                        {isEditing ? (
                          <div className="sleepover-pin-period-inputs">
                            <input
                              type="date"
                              className="sleepover-pin-input"
                              aria-label={`${studentName} 고정 외박 시작일`}
                              value={draft.startDate}
                              min={minPinDate(row.startDate)}
                              max={draft.endDate || undefined}
                              onChange={(e) =>
                                updateDraft(row, { startDate: e.target.value })
                              }
                              disabled={bulkUpdateMutation.isPending}
                            />
                            <span aria-hidden="true">~</span>
                            <input
                              type="date"
                              className="sleepover-pin-input"
                              aria-label={`${studentName} 고정 외박 종료일`}
                              value={draft.endDate}
                              min={draft.startDate || minPinDate(row.endDate)}
                              onChange={(e) =>
                                updateDraft(row, { endDate: e.target.value })
                              }
                              disabled={bulkUpdateMutation.isPending}
                            />
                          </div>
                        ) : (
                          <span className="sleepover-pin-period">
                            {formatPinDate(row.startDate)} ~{' '}
                            {formatPinDate(row.endDate)}
                          </span>
                        )}
                      </td>
                      <td
                        data-label="외박 사유"
                        className="sleepover-reason-cell"
                      >
                        {isEditing ? (
                          <div className="sleepover-pin-reason-fields">
                            <select
                              className="sleepover-pin-input sleepover-pin-reason-input"
                              aria-label={`${studentName} 고정 외박 사유`}
                              value={
                                draft.isEtc
                                  ? SLEEPOVER_PIN_REASON_ETC
                                  : draft.reason
                              }
                              onChange={(e) => {
                                const { value } = e.target;
                                const isEtc = value === SLEEPOVER_PIN_REASON_ETC;

                                updateDraft(row, {
                                  isEtc,
                                  // '기타'로 바꿀 때 직접 입력했던 사유는 살려 둡니다.
                                  reason: isEtc
                                    ? isPresetSleepoverPinReason(draft.reason)
                                      ? ''
                                      : draft.reason
                                    : value,
                                });
                              }}
                              disabled={bulkUpdateMutation.isPending}
                            >
                              <option value="">사유 없음</option>
                              {SLEEPOVER_PIN_REASON_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                              <option value={SLEEPOVER_PIN_REASON_ETC}>
                                {SLEEPOVER_PIN_REASON_ETC} (직접 입력)
                              </option>
                            </select>
                            {draft.isEtc && (
                              <input
                                type="text"
                                className="sleepover-pin-input sleepover-pin-reason-input"
                                aria-label={`${studentName} 기타 외박 사유`}
                                placeholder="사유를 입력해주세요"
                                value={draft.reason}
                                maxLength={100}
                                onChange={(e) =>
                                  updateDraft(row, { reason: e.target.value })
                                }
                                disabled={bulkUpdateMutation.isPending}
                              />
                            )}
                          </div>
                        ) : (
                          row.reason || (
                            <span className="sleepover-pin-empty-reason">
                              사유 없음
                            </span>
                          )
                        )}
                      </td>
                      <td data-label="상태">
                        <span
                          className={`sleepover-pin-status ${row.status.toLowerCase()}`}
                        >
                          {SLEEPOVER_PIN_STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td data-label="삭제">
                        <button
                          type="button"
                          className="sleepover-delete-button"
                          onClick={() =>
                            setDeleteTarget({
                              pinId: row.pinId,
                              studentName,
                              period: `${row.startDate} ~ ${row.endDate}`,
                            })
                          }
                          disabled={isActionPending || isEditing}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="sleepover-empty-row">
                  <td colSpan={8} className="sleepover-empty-cell">
                    {pins.length === 0
                      ? '등록된 고정 외박이 없습니다.'
                      : '조건에 맞는 고정 외박이 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <SleepoverPinCreateModal
          students={students}
          defaultStartDate={defaultStartDate}
          isPending={createMutation.isPending}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={async (studentIds, data) => {
            const failedRequests = await createMutation.mutateAsync({
              studentIds,
              data,
            });
            return failedRequests.map(({ studentId }) => studentId);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        eyebrow="Delete pinned sleepover"
        title="고정 외박을 삭제할까요?"
        message={`${deleteTarget?.studentName ?? ''} 학생의 고정 외박(${deleteTarget?.period ?? ''})을 삭제합니다.`}
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.pinId);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmationModal
        isOpen={isDiscardConfirmOpen}
        eyebrow="Discard changes"
        title="수정 내용을 버릴까요?"
        message={`변경한 고정 외박 ${pendingUpdates.length}건이 저장되지 않습니다.`}
        confirmText="버리기"
        cancelText="계속 수정"
        confirmVariant="danger"
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          setDrafts(null);
        }}
        onCancel={() => setIsDiscardConfirmOpen(false)}
      />
    </>
  );
}
