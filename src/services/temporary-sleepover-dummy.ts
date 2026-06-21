import type {
  AttendanceResponse,
  PageSleepoverResponse,
  PageStudentResponse,
  PhoneSubmissionResponse,
  SleepoverResponse,
  Student,
  StudentResponse,
} from '../types/api';

const TEMP_STUDENT_ID = 2417;
const TEMP_STUDENT_NUMBER = '2417';
const TEMP_SLEEP_OVER_REASON = '휴학';

const TEMP_STUDENT: StudentResponse = {
  id: TEMP_STUDENT_ID,
  grade: 2,
  classroom: 4,
  number: 17,
  room: '412',
  name: '황경민',
  gender: 'MALE',
  phoneNumber: '010-9988-1122',
};

const getStudentNumber = (
  student: Pick<Student, 'grade' | 'classroom' | 'number'>,
) => `${student.grade}${student.classroom}${String(student.number).padStart(2, '0')}`;

const isTemporarySleepoverStudent = (
  student: Pick<Student, 'grade' | 'classroom' | 'number' | 'name'>,
) => getStudentNumber(student) === TEMP_STUDENT_NUMBER || student.name === '황경민';

const toAttendanceStudent = (student: StudentResponse): Student => ({
  ...student,
});

export const withTemporarySleepoverStudent = (
  data: PageStudentResponse,
): PageStudentResponse => {
  const hasStudent = data.content.some(isTemporarySleepoverStudent);
  if (hasStudent) return data;

  return {
    ...data,
    totalElements: data.totalElements + 1,
    numberOfElements: data.numberOfElements + 1,
    empty: false,
    content: [...data.content, TEMP_STUDENT],
  };
};

export const withTemporarySleepoverAttendances = (
  data: AttendanceResponse[],
  date?: string,
): AttendanceResponse[] => {
  let hasStudent = false;
  const content = data.map((attendance) => {
    if (!isTemporarySleepoverStudent(attendance.student)) return attendance;

    hasStudent = true;
    return {
      ...attendance,
      nightCheckStatus: 'SLEEPOVER' as const,
      status: 'SLEEPOVER' as const,
      phoneSubmissionStatus: 'SLEEPOVER' as const,
      checkedAt: undefined,
      morningCheckedAt: undefined,
      nightCheckedAt: undefined,
    };
  });

  if (hasStudent) return content;

  return [
    ...content,
    {
      student: toAttendanceStudent(TEMP_STUDENT),
      date: date ?? new Date().toISOString().split('T')[0],
      status: 'SLEEPOVER',
      nightCheckStatus: 'SLEEPOVER',
      phoneSubmissionStatus: 'SLEEPOVER',
      nightStudyAttendance: null,
    },
  ];
};

export const withTemporarySleepoverPhoneSubmissions = (
  data: PhoneSubmissionResponse[],
  date?: string,
): PhoneSubmissionResponse[] => {
  let hasStudent = false;
  const content = data.map((submission) => {
    if (!isTemporarySleepoverStudent(submission.student)) return submission;

    hasStudent = true;
    return {
      ...submission,
      status: 'SLEEPOVER' as const,
      checkedAt: undefined,
    };
  });

  if (hasStudent) return content;

  return [
    ...content,
    {
      student: toAttendanceStudent(TEMP_STUDENT),
      date: date ?? new Date().toISOString().split('T')[0],
      status: 'SLEEPOVER',
    },
  ];
};

export const withTemporarySleepoverPage = (
  data: PageSleepoverResponse,
  date: string,
): PageSleepoverResponse => {
  let hasStudent = false;
  const content = data.content.map((sleepover) => {
    if (!isTemporarySleepoverStudent(sleepover.student)) return sleepover;

    hasStudent = true;
    return {
      ...sleepover,
      sleepoverReason: TEMP_SLEEP_OVER_REASON,
    };
  });

  if (hasStudent) {
    return {
      ...data,
      content,
    };
  }

  const temporarySleepover: SleepoverResponse = {
    student: TEMP_STUDENT,
    date,
    sleepoverReason: TEMP_SLEEP_OVER_REASON,
  };

  return {
    ...data,
    totalElements: data.totalElements + 1,
    numberOfElements: data.numberOfElements + 1,
    empty: false,
    content: [...content, temporarySleepover],
  };
};
