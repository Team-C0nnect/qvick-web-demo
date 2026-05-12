export interface Student {
  id: number;
  name: string;
  grade: number;
  classroom: number;
  number: number;
  room: string;
  gender: 'MALE' | 'FEMALE';
}

export interface StudentWithPhone extends Student {
  phoneNumber?: string;
}

export interface DeleteModalState {
  student: Student | null;
  password: string;
  confirmName: string;
  error: string;
}

export type SortColumn =
  | 'id'
  | 'name'
  | 'grade'
  | 'classroom'
  | 'number'
  | 'gender';
export type SortDirection = 'asc' | 'desc';
