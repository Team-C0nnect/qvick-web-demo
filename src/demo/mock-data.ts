import type {
  MyUserResponse,
  AttendanceResponse,
  PageStudentResponse,
  StudentResponse,
  PageAnnouncementResponse,
  AnnouncementDetailResponse,
  AttendanceScheduleResponse,
  RoomResponse,
} from '../types/api';

// ──────────────────────────── 유저 ────────────────────────────
export const mockUser: MyUserResponse = {
  name: '김선생',
  email: 'demo@qvick.xyz',
  avatarUrl: '',
  roles: ['ADMIN'],
};

// ──────────────────────────── 학생 ────────────────────────────
const studentNames = [
  { name: '김민준', gender: 'MALE' as const },
  { name: '이서준', gender: 'MALE' as const },
  { name: '박도윤', gender: 'MALE' as const },
  { name: '최하준', gender: 'MALE' as const },
  { name: '정은우', gender: 'MALE' as const },
  { name: '강시우', gender: 'MALE' as const },
  { name: '조예준', gender: 'MALE' as const },
  { name: '윤지호', gender: 'MALE' as const },
  { name: '장현우', gender: 'MALE' as const },
  { name: '임서진', gender: 'MALE' as const },
  { name: '김서연', gender: 'FEMALE' as const },
  { name: '이하은', gender: 'FEMALE' as const },
  { name: '박지유', gender: 'FEMALE' as const },
  { name: '최수아', gender: 'FEMALE' as const },
  { name: '정채원', gender: 'FEMALE' as const },
  { name: '강지윤', gender: 'FEMALE' as const },
  { name: '조윤서', gender: 'FEMALE' as const },
  { name: '윤민지', gender: 'FEMALE' as const },
  { name: '장소희', gender: 'FEMALE' as const },
  { name: '임예진', gender: 'FEMALE' as const },
];

const maleRooms = ['301', '302', '303', '304', '305'];
const femaleRooms = ['401', '402', '403', '404', '405'];

export const mockStudents: StudentResponse[] = studentNames.map((s, i) => ({
  id: i + 1,
  name: s.name,
  grade: i < 10 ? 1 : 2,
  classroom: (i % 4) + 1,
  number: (i % 10) + 1,
  room: s.gender === 'MALE' ? maleRooms[i % 5] : femaleRooms[i % 5],
  gender: s.gender,
}));

export const mockStudentPage: PageStudentResponse = {
  totalElements: mockStudents.length,
  totalPages: 1,
  pageable: { pageNumber: 0, paged: true, pageSize: 100, unpaged: false, offset: 0, sort: { unsorted: true, sorted: false, empty: true } },
  numberOfElements: mockStudents.length,
  size: 100,
  content: mockStudents,
  number: 0,
  sort: { unsorted: true, sorted: false, empty: true },
  first: true,
  last: true,
  empty: false,
};

// ──────────────────────────── 출석 ────────────────────────────
const today = new Date().toISOString().split('T')[0];

const statuses: ('PRESENT' | 'ABSENT' | 'SLEEPOVER')[] = [
  'PRESENT','PRESENT','PRESENT','PRESENT','PRESENT',
  'PRESENT','PRESENT','PRESENT','ABSENT','PRESENT',
  'PRESENT','PRESENT','ABSENT','PRESENT','PRESENT',
  'PRESENT','SLEEPOVER','PRESENT','PRESENT','PRESENT',
];

export const mockAttendances: AttendanceResponse[] = mockStudents.map((s, i) => ({
  student: {
    name: s.name,
    grade: s.grade,
    classroom: s.classroom,
    number: s.number,
    room: s.room,
    gender: s.gender,
  },
  date: today,
  checkedAt: statuses[i] === 'PRESENT' ? `${today}T21:${String(30 + (i % 20)).padStart(2, '0')}:00` : undefined,
  status: statuses[i],
}));

// ──────────────────────────── 공지사항 ────────────────────────────
const announcementItems = [
  { id: 1, title: '3월 기숙사 점호 시간 변경 안내', isPinned: true, days: 0 },
  { id: 2, title: '기숙사 외박 신청 절차 안내', isPinned: true, days: 1 },
  { id: 3, title: '기숙사 Wi-Fi 비밀번호 변경 안내', isPinned: false, days: 3 },
  { id: 4, title: '이번 주 야간자율학습 일정 공지', isPinned: false, days: 5 },
  { id: 5, title: '기숙사 청소 점검 안내', isPinned: false, days: 7 },
  { id: 6, title: '주말 외출 시 유의사항', isPinned: false, days: 10 },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const mockAnnouncementPage: PageAnnouncementResponse = {
  totalElements: announcementItems.length,
  totalPages: 1,
  pageable: { pageNumber: 0, paged: true, pageSize: 20, unpaged: false, offset: 0, sort: { unsorted: true, sorted: false, empty: true } },
  numberOfElements: announcementItems.length,
  size: 20,
  content: announcementItems.map((a) => ({
    id: a.id,
    title: a.title,
    author: { name: '김선생', avatarUrl: '' },
    isPinned: a.isPinned,
    createdAt: daysAgo(a.days),
    updatedAt: daysAgo(a.days),
  })),
  number: 0,
  sort: { unsorted: true, sorted: false, empty: true },
  first: true,
  last: true,
  empty: false,
};

const announcementContents: Record<number, string> = {
  1: `# 3월 기숙사 점호 시간 변경 안내\n\n안녕하세요, 기숙사 관리 담당입니다.\n\n3월부터 점호 시간이 아래와 같이 변경됩니다.\n\n| 구분 | 기존 | 변경 |\n|------|------|------|\n| 남기숙사 | 22:00 | 22:30 |\n| 여기숙사 | 22:00 | 22:30 |\n\n변경된 시간에 맞춰 점호에 참석해 주시기 바랍니다.\n\n감사합니다.`,
  2: `# 기숙사 외박 신청 절차 안내\n\n외박 신청은 **최소 3일 전**까지 담임선생님과 기숙사 사감에게 모두 승인을 받아야 합니다.\n\n## 절차\n1. 외박 신청서 작성\n2. 담임선생님 승인\n3. 기숙사 사감 승인\n4. 외박 당일 퇴실 시 사감에게 보고\n\n미승인 외박은 규정 위반으로 처리됩니다.`,
  3: `# Wi-Fi 비밀번호 변경\n\n보안 강화를 위해 기숙사 Wi-Fi 비밀번호가 변경되었습니다.\n\n변경된 비밀번호는 각 층 게시판을 확인해 주세요.`,
  4: `# 이번 주 야간자율학습 일정\n\n- **월~목**: 19:00 ~ 21:30\n- **금요일**: 자율학습 없음\n\n자습실 이용 시 정숙을 유지해 주세요.`,
  5: `# 기숙사 청소 점검\n\n이번 주 금요일 오후 5시에 기숙사 청소 점검이 예정되어 있습니다.\n\n점검 항목:\n- 침대 정리\n- 바닥 청소\n- 화장실 청결\n- 개인 물품 정리`,
  6: `# 주말 외출 시 유의사항\n\n1. 외출 시 반드시 외출부에 기록\n2. 귀사 시간 엄수 (일요일 21:00)\n3. 음주 및 흡연 절대 금지\n4. 외출 중 연락 가능한 상태 유지`,
};

export function getMockAnnouncementDetail(id: number): AnnouncementDetailResponse {
  const item = announcementItems.find((a) => a.id === id) || announcementItems[0];
  return {
    id: item.id,
    title: item.title,
    content: announcementContents[item.id] || '공지사항 내용입니다.',
    author: { name: '김선생', avatarUrl: '' },
    isPinned: item.isPinned,
    createdAt: daysAgo(item.days),
    updatedAt: daysAgo(item.days),
  };
}

// ──────────────────────────── 일정 ────────────────────────────
export function getMockMonthSchedules(year: number, month: number): AttendanceScheduleResponse[] {
  const schedules: AttendanceScheduleResponse[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let id = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    // 주말 제외
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    schedules.push({ id: id++, date: dateStr, gender: 'MALE', startTime: '22:00', endTime: '22:30' });
    schedules.push({ id: id++, date: dateStr, gender: 'FEMALE', startTime: '22:00', endTime: '22:30' });
  }
  return schedules;
}

// ──────────────────────────── 방 ────────────────────────────
export const mockRooms: RoomResponse[] = [
  ...maleRooms.map((r, i) => ({ id: i + 1, room: r })),
  ...femaleRooms.map((r, i) => ({ id: i + 6, room: r })),
];
