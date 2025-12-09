// 패치노트 서비스 (Azure Functions API 기반)
import type { 
  PatchNote, 
  CreatePatchNoteRequest, 
  UpdatePatchNoteRequest,
  PatchNoteVisibility
} from '../types/patchnote';

// Azure Static Web Apps는 /api를 Functions로 자동 라우팅
const API_BASE_URL = '/api';

// 이미지 ID 생성
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const patchNoteService = {
  // 모든 패치노트 조회 (관리자용)
  async getAllPatchNotes(): Promise<PatchNote[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/patchnotes`);
      if (!response.ok) {
        throw new Error('패치노트 조회 실패');
      }
      return await response.json();
    } catch (error) {
      console.error('패치노트 조회 실패:', error);
      return [];
    }
  },

  // 발행된 패치노트만 조회 (공개용)
  async getPublishedPatchNotes(visibility?: PatchNoteVisibility): Promise<PatchNote[]> {
    try {
      const url = visibility 
        ? `${API_BASE_URL}/patchnotes/published?visibility=${visibility}`
        : `${API_BASE_URL}/patchnotes/published`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('발행된 패치노트 조회 실패');
      }
      return await response.json();
    } catch (error) {
      console.error('발행된 패치노트 조회 실패:', error);
      return [];
    }
  },

  // 단일 패치노트 조회
  async getPatchNoteById(id: string): Promise<PatchNote | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/patchnotes/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('패치노트 조회 실패');
      }
      return await response.json();
    } catch (error) {
      console.error('패치노트 조회 실패:', error);
      return null;
    }
  },

  // 패치노트 생성 (초안으로 생성)
  async createPatchNote(request: CreatePatchNoteRequest, author: string): Promise<PatchNote> {
    const response = await fetch(`${API_BASE_URL}/patchnotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, author }),
    });
    
    if (!response.ok) {
      throw new Error('패치노트 생성 실패');
    }
    
    return await response.json();
  },

  // 패치노트 수정
  async updatePatchNote(id: string, request: UpdatePatchNoteRequest): Promise<PatchNote | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/patchnotes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('패치노트 수정 실패');
      }
      
      return await response.json();
    } catch (error) {
      console.error('패치노트 수정 실패:', error);
      return null;
    }
  },

  // 패치노트 발행
  async publishPatchNote(id: string): Promise<PatchNote | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/patchnotes/${id}/publish`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('패치노트 발행 실패');
      }
      
      return await response.json();
    } catch (error) {
      console.error('패치노트 발행 실패:', error);
      return null;
    }
  },

  // 패치노트 발행 취소 (초안으로 변경)
  async unpublishPatchNote(id: string): Promise<PatchNote | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/patchnotes/${id}/unpublish`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('패치노트 발행 취소 실패');
      }
      
      return await response.json();
    } catch (error) {
      console.error('패치노트 발행 취소 실패:', error);
      return null;
    }
  },

  // 패치노트 삭제
  async deletePatchNote(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/patchnotes/${id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('패치노트 삭제 실패:', error);
      return false;
    }
  },

  // 상태별 개수 조회
  async getStatusCounts(): Promise<{ draft: number; published: number; total: number }> {
    try {
      const notes = await this.getAllPatchNotes();
      const draft = notes.filter((n) => n.status === 'draft').length;
      const published = notes.filter((n) => n.status === 'published').length;
      return { draft, published, total: notes.length };
    } catch (error) {
      console.error('상태별 개수 조회 실패:', error);
      return { draft: 0, published: 0, total: 0 };
    }
  },

  // 이미지 업로드 (Base64로 변환 - 임시 방안)
  // TODO: Azure Blob Storage 연동 시 변경 필요
  async uploadImage(file: File): Promise<string> {
    // 파일 크기 체크 (1MB 제한)
    if (file.size > 1024 * 1024) {
      throw new Error('이미지 크기는 1MB 이하여야 합니다.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string); // Base64 URL
      };
      reader.onerror = () => reject(new Error('이미지 읽기 실패'));
      reader.readAsDataURL(file);
    });
  },
};
