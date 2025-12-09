// 패치노트 타입 정의

export type PatchNoteCategory = 'feature' | 'improvement' | 'bugfix' | 'notice';
export type PatchNoteStatus = 'draft' | 'published';
export type PatchNoteVisibility = 'public' | 'teacher';

export interface PatchNoteImage {
  id: string;
  url: string;
  alt: string;
  caption?: string;
}

export interface PatchNote {
  id: string;
  title: string;
  content: string;
  version: string;
  category: PatchNoteCategory;
  status: PatchNoteStatus;
  visibility: PatchNoteVisibility;
  images: PatchNoteImage[];
  createdAt: string;
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
  author: string;
}

export interface UpdatePatchNoteRequest {
  title?: string;
  content?: string;
  version?: string;
  category?: PatchNoteCategory;
  visibility?: PatchNoteVisibility;
  images?: PatchNoteImage[];
}
