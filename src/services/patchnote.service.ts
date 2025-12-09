// 패치노트 서비스 (localStorage 기반)
import type { 
  PatchNote, 
  CreatePatchNoteRequest, 
  UpdatePatchNoteRequest,
  PatchNoteStatus,
  PatchNoteVisibility,
  PatchNoteImage
} from '../types/patchnote';

const STORAGE_KEY = 'qvick_patchnotes';

// UUID 생성
function generateId(): string {
  return `pn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 이미지 ID 생성
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// localStorage에서 패치노트 목록 조회
function getPatchNotesFromStorage(): PatchNote[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const notes = JSON.parse(stored);
    // 기존 데이터에 visibility, images 필드가 없으면 추가
    return notes.map((note: PatchNote) => ({
      ...note,
      visibility: note.visibility || 'public',
      images: note.images || [],
    }));
  } catch {
    return [];
  }
}

// localStorage에 패치노트 목록 저장
function savePatchNotesToStorage(patchNotes: PatchNote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patchNotes));
}

export const patchNoteService = {
  // 모든 패치노트 조회 (관리자용)
  getAllPatchNotes(): PatchNote[] {
    return getPatchNotesFromStorage().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  // 발행된 패치노트만 조회 (공개용)
  getPublishedPatchNotes(visibility?: PatchNoteVisibility): PatchNote[] {
    return getPatchNotesFromStorage()
      .filter((note) => {
        if (note.status !== 'published') return false;
        if (visibility && note.visibility !== visibility && note.visibility !== 'public') return false;
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime());
  },

  // 단일 패치노트 조회
  getPatchNoteById(id: string): PatchNote | null {
    const patchNotes = getPatchNotesFromStorage();
    return patchNotes.find((note) => note.id === id) || null;
  },

  // 패치노트 생성 (초안으로 생성)
  createPatchNote(request: CreatePatchNoteRequest, author: string): PatchNote {
    const now = new Date().toISOString();
    const newPatchNote: PatchNote = {
      id: generateId(),
      title: request.title,
      content: request.content,
      version: request.version,
      category: request.category,
      visibility: request.visibility || 'public',
      images: [],
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      author,
    };

    const patchNotes = getPatchNotesFromStorage();
    patchNotes.push(newPatchNote);
    savePatchNotesToStorage(patchNotes);

    return newPatchNote;
  },

  // 패치노트 수정
  updatePatchNote(id: string, request: UpdatePatchNoteRequest): PatchNote | null {
    const patchNotes = getPatchNotesFromStorage();
    const index = patchNotes.findIndex((note) => note.id === id);
    
    if (index === -1) return null;

    const updatedPatchNote: PatchNote = {
      ...patchNotes[index],
      ...request,
      updatedAt: new Date().toISOString(),
    };

    patchNotes[index] = updatedPatchNote;
    savePatchNotesToStorage(patchNotes);

    return updatedPatchNote;
  },

  // 패치노트 발행
  publishPatchNote(id: string): PatchNote | null {
    const patchNotes = getPatchNotesFromStorage();
    const index = patchNotes.findIndex((note) => note.id === id);
    
    if (index === -1) return null;

    const now = new Date().toISOString();
    const publishedPatchNote: PatchNote = {
      ...patchNotes[index],
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    };

    patchNotes[index] = publishedPatchNote;
    savePatchNotesToStorage(patchNotes);

    return publishedPatchNote;
  },

  // 패치노트 발행 취소 (초안으로 변경)
  unpublishPatchNote(id: string): PatchNote | null {
    const patchNotes = getPatchNotesFromStorage();
    const index = patchNotes.findIndex((note) => note.id === id);
    
    if (index === -1) return null;

    const unpublishedPatchNote: PatchNote = {
      ...patchNotes[index],
      status: 'draft',
      publishedAt: undefined,
      updatedAt: new Date().toISOString(),
    };

    patchNotes[index] = unpublishedPatchNote;
    savePatchNotesToStorage(patchNotes);

    return unpublishedPatchNote;
  },

  // 패치노트 삭제
  deletePatchNote(id: string): boolean {
    const patchNotes = getPatchNotesFromStorage();
    const index = patchNotes.findIndex((note) => note.id === id);
    
    if (index === -1) return false;

    patchNotes.splice(index, 1);
    savePatchNotesToStorage(patchNotes);

    return true;
  },

  // 이미지 추가
  addImage(id: string, image: PatchNoteImage): PatchNote | null {
    const patchNotes = getPatchNotesFromStorage();
    const index = patchNotes.findIndex((note) => note.id === id);
    
    if (index === -1) return null;

    const updatedPatchNote: PatchNote = {
      ...patchNotes[index],
      images: [...(patchNotes[index].images || []), image],
      updatedAt: new Date().toISOString(),
    };

    patchNotes[index] = updatedPatchNote;
    savePatchNotesToStorage(patchNotes);

    return updatedPatchNote;
  },

  // 이미지 삭제
  removeImage(id: string, imageId: string): PatchNote | null {
    const patchNotes = getPatchNotesFromStorage();
    const index = patchNotes.findIndex((note) => note.id === id);
    
    if (index === -1) return null;

    const updatedPatchNote: PatchNote = {
      ...patchNotes[index],
      images: (patchNotes[index].images || []).filter((img) => img.id !== imageId),
      updatedAt: new Date().toISOString(),
    };

    patchNotes[index] = updatedPatchNote;
    savePatchNotesToStorage(patchNotes);

    return updatedPatchNote;
  },

  // 상태별 개수 조회
  getStatusCounts(): Record<PatchNoteStatus, number> {
    const patchNotes = getPatchNotesFromStorage();
    return {
      draft: patchNotes.filter((note) => note.status === 'draft').length,
      published: patchNotes.filter((note) => note.status === 'published').length,
    };
  },

  // 이미지 업로드 (Base64로 변환)
  uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error('이미지 읽기 실패'));
      };
      reader.readAsDataURL(file);
    });
  },
};
