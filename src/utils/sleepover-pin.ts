import { isAxiosError } from 'axios';
import type { SleepoverPinResponse } from '../types/api';

export type SleepoverPinStatus = 'ACTIVE' | 'UPCOMING' | 'ENDED';

export const SLEEPOVER_PIN_STATUS_LABEL: Record<SleepoverPinStatus, string> = {
  ACTIVE: '진행 중',
  UPCOMING: '예정',
  ENDED: '종료',
};

/** 오늘 날짜(YYYY-MM-DD) 기준 고정 외박 진행 상태 */
export const getSleepoverPinStatus = (
  pin: Pick<SleepoverPinResponse, 'startDate' | 'endDate'>,
  today: string,
): SleepoverPinStatus => {
  if (today < pin.startDate) return 'UPCOMING';
  if (today > pin.endDate) return 'ENDED';
  return 'ACTIVE';
};

/** 서버 규칙과 동일하게 시작일이 종료일보다 앞서야 합니다. */
export const isValidSleepoverPinRange = (startDate: string, endDate: string) =>
  Boolean(startDate && endDate) && startDate < endDate;

/** 2026-07-23 -> 26.07.23 */
export const formatPinDate = (date: string) => date.slice(2).replace(/-/g, '.');

const SLEEPOVER_PIN_ERROR_MESSAGE: Record<string, string> = {
  STUDENT_NOT_FOUND: '존재하지 않는 학생입니다. 목록을 새로고침했어요.',
  SLEEPOVER_PIN_NOT_FOUND:
    '이미 삭제되었거나 존재하지 않는 고정 외박입니다. 목록을 새로고침했어요.',
  INVALID_DATE_RANGE: '종료일은 시작일 이후여야 합니다.',
  SLEEPOVER_PIN_OVERLAP: '해당 학생의 기존 고정 외박과 기간이 겹칩니다.',
  SLEEPOVER_PIN_ATTENDANCE_CONFLICT:
    '기간 중 이미 출석(정상·지각) 처리된 날이 있어 외박으로 고정할 수 없습니다.',
};

/** 목록을 다시 불러와야 하는 오류 (대상이 사라진 경우) */
const STALE_TARGET_ERROR_CODES = new Set([
  'STUDENT_NOT_FOUND',
  'SLEEPOVER_PIN_NOT_FOUND',
]);

/** 서버 오류 응답 형식: { code, status, message } (message는 영문) */
const getErrorCode = (error: unknown): string | null => {
  if (!isAxiosError<{ code?: unknown }>(error)) return null;

  const code = error.response?.data?.code;
  return typeof code === 'string' && code in SLEEPOVER_PIN_ERROR_MESSAGE
    ? code
    : null;
};

export const getSleepoverPinErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const code = getErrorCode(error);
  return code ? SLEEPOVER_PIN_ERROR_MESSAGE[code] : fallback;
};

export const isStaleSleepoverPinError = (error: unknown) => {
  const code = getErrorCode(error);
  return code !== null && STALE_TARGET_ERROR_CODES.has(code);
};
