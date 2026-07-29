import type { Gender, PhoneBoxGender, PhoneBoxResponse } from '../types/api';

export const PHONE_BOX_GENDER_LABEL: Record<PhoneBoxGender, string> = {
  MALE: '남기숙사',
  FEMALE: '여기숙사',
  ALL: '공용',
};

export const GENDER_SHORT_LABEL: Record<Gender, string> = {
  MALE: '남',
  FEMALE: '여',
};

/** 학번 (예: 1학년 2반 3번 -> 1203) */
export const getStudentNumber = (student: {
  grade: number;
  classroom: number;
  number: number;
}) =>
  `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

/** 제출함 성별과 학생 성별이 맞는지 검사 (공용 제출함은 모든 학생 허용) */
export const canAssignStudent = (
  boxGender: PhoneBoxGender,
  studentGender: Gender,
) => boxGender === 'ALL' || boxGender === studentGender;

export const sortPhoneBoxes = (boxes: PhoneBoxResponse[]) =>
  [...boxes].sort((a, b) =>
    a.name.localeCompare(b.name, 'ko-KR', { numeric: true }),
  );

export const sortStudents = <
  T extends { room: string; grade: number; classroom: number; number: number },
>(
  students: T[],
) =>
  [...students].sort((a, b) => {
    const roomDiff = a.room.localeCompare(b.room, 'ko-KR', { numeric: true });
    if (roomDiff !== 0) return roomDiff;
    return getStudentNumber(a).localeCompare(getStudentNumber(b), 'ko-KR', {
      numeric: true,
    });
  });
