// 패치노트 타입 정의

export type PatchNoteStatus = 'draft' | 'published';

export type PatchNoteCategory = 'feature' | 'improvement' | 'bugfix' | 'notice';

export type PatchNoteVisibility = 'public' | 'teacher';

export interface PatchNoteImage {
  id: string;
  url: string; // base64 데이터 URL
  alt: string;
  caption?: string;
}

export interface PatchNote {
  id: string;
  title: string;
  content: string; // Markdown 형식
  version: string; // 예: "1.0.0", "2.1.3"
  category: PatchNoteCategory;
  status: PatchNoteStatus;
  visibility: PatchNoteVisibility; // 공개 대상
  images: PatchNoteImage[]; // 첨부 이미지
  createdAt: string; // ISO 날짜
  updatedAt: string;
  publishedAt?: string;
  author: string;
}

export interface CreatePatchNoteRequest {
  title: string;
  content: string;
  version: string;
  category: PatchNoteCategory;
  visibility?: PatchNoteVisibility;
  images?: PatchNoteImage[];
}

export interface UpdatePatchNoteRequest {
  title?: string;
  content?: string;
  version?: string;
  category?: PatchNoteCategory;
  visibility?: PatchNoteVisibility;
  images?: PatchNoteImage[];
}

// 카테고리 라벨 및 색상
export const CATEGORY_CONFIG: Record<PatchNoteCategory, { label: string; color: string; bgColor: string }> = {
  feature: { label: '새 기능', color: 'var(--app-primary)', bgColor: 'var(--app-primary-soft)' },
  improvement: { label: '개선', color: 'var(--app-info)', bgColor: 'var(--app-info-soft)' },
  bugfix: { label: '버그 수정', color: 'var(--app-danger-strong)', bgColor: 'var(--app-danger-soft)' },
  notice: { label: '공지', color: 'var(--app-success)', bgColor: 'var(--app-success-soft)' },
};

// 공개 대상 라벨
export const VISIBILITY_CONFIG: Record<PatchNoteVisibility, { label: string; icon: string; description: string }> = {
  public: { label: '전체 공개', icon: '🌐', description: '모든 사용자에게 공개됩니다.' },
  teacher: { label: 'Teacher 전용', icon: '🔒', description: 'Teacher 권한 사용자에게만 공개됩니다.' },
};
