// API Response Types based on OpenAPI spec

export type Gender = 'MALE' | 'FEMALE';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'SLEEPOVER';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'MANAGER';

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface JwtPayload {
  accessToken: string;
  refreshToken: string;
}

export interface ReissueRequest {
  refreshToken: string;
}

// User Types
export interface MyUserResponse {
  name: string;
  email: string;
  avatarUrl: string;
  roles: UserRole[];
}

export interface UpdateMyUserRequest {
  name?: string;
  avatarUrl?: string;
}

export interface UpdateMyUserPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Student Types
export interface Student {
  id: number;
  name: string;
  grade: number;
  classroom: number;
  number: number;
  room: string;
  gender: Gender;
}

export interface StudentResponse {
  id: number;
  grade: number;
  classroom: number;
  number: number;
  room: string;
  name: string;
  gender: Gender;
}

export interface TeacherUpdateStudentRequest {
  grade?: number;
  classroom?: number;
  number?: number;
  room?: string;
  phoneNumber?: string;
  gender: Gender;
}

export interface PageStudentResponse {
  totalElements: number;
  totalPages: number;
  pageable: PageableObject;
  numberOfElements: number;
  size: number;
  content: StudentResponse[];
  number: number;
  sort: SortObject;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Attendance Types
export interface AttendanceResponse {
  student: Student;
  date: string; // format: date (YYYY-MM-DD)
  checkedAt?: string; // format: date-time
  status: AttendanceStatus;
}

export interface UpdateAttendanceRequest {
  studentId: number;
  status: AttendanceStatus;
}

export interface UpdateAttendancesRequest {
  date: string; // format: date
  attendances: UpdateAttendanceRequest[];
}

export interface MyAttendanceResponse {
  date: string;
  checkedAt?: string;
  status: AttendanceStatus;
}

// Attendance Schedule Types
export interface AttendanceScheduleResponse {
  id: number;
  date: string; // format: date
  startTime: string;
  endTime: string;
}

export interface TeacherCreateAttendanceScheduleRequest {
  date: string; // format: date
  startTime: string;
  endTime: string;
}

export interface TeacherUpdateAttendanceScheduleRequest {
  startTime?: string;
  endTime?: string;
}

// Announcement Types
export interface AnnouncementAuthorResponse {
  name: string;
  avatarUrl: string;
}

export interface AnnouncementResponse {
  id: number;
  title: string;
  author: AnnouncementAuthorResponse;
  isPinned: boolean;
  createdAt: string; // format: date-time
  updatedAt: string; // format: date-time
}

export interface AnnouncementDetailResponse {
  id: number;
  title: string;
  content: string;
  author: AnnouncementAuthorResponse;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
}

export interface TeacherUpdateAnnouncementRequest {
  title?: string;
  content?: string;
}

export interface PageAnnouncementResponse {
  totalElements: number;
  totalPages: number;
  pageable: PageableObject;
  numberOfElements: number;
  size: number;
  content: AnnouncementResponse[];
  number: number;
  sort: SortObject;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Room Types
export interface RoomResponse {
  id: number;
  room: string;
}

export interface CreateRoomRequest {
  room: string;
}

// Pagination Types
export interface PageableObject {
  pageNumber: number;
  paged: boolean;
  pageSize: number;
  unpaged: boolean;
  offset: number;
  sort: SortObject;
}

export interface SortObject {
  unsorted: boolean;
  sorted: boolean;
  empty: boolean;
}

// Query Parameters
export interface StudentQueryParams {
  page?: number;
  size?: number;
  grade?: number;
  classroom?: number;
  room?: string;
  name?: string;
}

export interface AnnouncementQueryParams {
  page?: number;
  size?: number;
}
