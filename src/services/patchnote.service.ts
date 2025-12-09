// 패치노트 서비스 (Firebase Firestore 기반)
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { 
  PatchNote, 
  CreatePatchNoteRequest, 
  UpdatePatchNoteRequest,
  PatchNoteStatus,
  PatchNoteVisibility,
  PatchNoteImage
} from '../types/patchnote';

const COLLECTION_NAME = 'patchnotes';

// Firestore 문서를 PatchNote 객체로 변환
function docToPatchNote(id: string, data: DocumentData): PatchNote {
  return {
    id,
    title: data.title || '',
    content: data.content || '',
    version: data.version || '',
    category: data.category || 'feature',
    status: data.status || 'draft',
    visibility: data.visibility || 'public',
    images: data.images || [],
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
    publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
    author: data.author || 'Unknown',
  };
}

// 이미지 ID 생성
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const patchNoteService = {
  // 모든 패치노트 조회 (관리자용)
  async getAllPatchNotes(): Promise<PatchNote[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => docToPatchNote(doc.id, doc.data()));
    } catch (error) {
      console.error('패치노트 조회 실패:', error);
      return [];
    }
  },

  // 발행된 패치노트만 조회 (공개용)
  async getPublishedPatchNotes(visibility?: PatchNoteVisibility): Promise<PatchNote[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const notes = snapshot.docs.map((doc) => docToPatchNote(doc.id, doc.data()));
      
      // visibility 필터링
      if (visibility) {
        return notes.filter((note) => 
          note.visibility === visibility || note.visibility === 'public'
        );
      }
      return notes;
    } catch (error) {
      console.error('발행된 패치노트 조회 실패:', error);
      return [];
    }
  },

  // 단일 패치노트 조회
  async getPatchNoteById(id: string): Promise<PatchNote | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      return docToPatchNote(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('패치노트 조회 실패:', error);
      return null;
    }
  },

  // 패치노트 생성 (초안으로 생성)
  async createPatchNote(request: CreatePatchNoteRequest, author: string): Promise<PatchNote> {
    const now = Timestamp.now();
    const newPatchNote = {
      title: request.title,
      content: request.content,
      version: request.version,
      category: request.category,
      visibility: request.visibility || 'public',
      images: request.images || [],
      status: 'draft' as PatchNoteStatus,
      createdAt: now,
      updatedAt: now,
      author,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newPatchNote);
    
    return {
      id: docRef.id,
      ...newPatchNote,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
  },

  // 패치노트 수정
  async updatePatchNote(id: string, request: UpdatePatchNoteRequest): Promise<PatchNote | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;

      const updateData = {
        ...request,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);
      
      const updated = await getDoc(docRef);
      return docToPatchNote(updated.id, updated.data()!);
    } catch (error) {
      console.error('패치노트 수정 실패:', error);
      return null;
    }
  },

  // 패치노트 발행
  async publishPatchNote(id: string): Promise<PatchNote | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const now = Timestamp.now();
      
      await updateDoc(docRef, {
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      });

      const updated = await getDoc(docRef);
      return docToPatchNote(updated.id, updated.data()!);
    } catch (error) {
      console.error('패치노트 발행 실패:', error);
      return null;
    }
  },

  // 패치노트 발행 취소 (초안으로 변경)
  async unpublishPatchNote(id: string): Promise<PatchNote | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      
      await updateDoc(docRef, {
        status: 'draft',
        publishedAt: null,
        updatedAt: Timestamp.now(),
      });

      const updated = await getDoc(docRef);
      return docToPatchNote(updated.id, updated.data()!);
    } catch (error) {
      console.error('패치노트 발행 취소 실패:', error);
      return null;
    }
  },

  // 패치노트 삭제
  async deletePatchNote(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('패치노트 삭제 실패:', error);
      return false;
    }
  },

  // 이미지 추가
  async addImage(id: string, image: PatchNoteImage): Promise<PatchNote | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;

      const currentImages = docSnap.data().images || [];
      
      await updateDoc(docRef, {
        images: [...currentImages, image],
        updatedAt: Timestamp.now(),
      });

      const updated = await getDoc(docRef);
      return docToPatchNote(updated.id, updated.data()!);
    } catch (error) {
      console.error('이미지 추가 실패:', error);
      return null;
    }
  },

  // 이미지 삭제
  async removeImage(id: string, imageId: string): Promise<PatchNote | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;

      const currentImages = (docSnap.data().images || []) as PatchNoteImage[];
      const filteredImages = currentImages.filter((img) => img.id !== imageId);
      
      await updateDoc(docRef, {
        images: filteredImages,
        updatedAt: Timestamp.now(),
      });

      const updated = await getDoc(docRef);
      return docToPatchNote(updated.id, updated.data()!);
    } catch (error) {
      console.error('이미지 삭제 실패:', error);
      return null;
    }
  },

  // 상태별 개수 조회
  async getStatusCounts(): Promise<Record<PatchNoteStatus, number>> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const notes = snapshot.docs.map((doc) => doc.data());
      
      return {
        draft: notes.filter((note) => note.status === 'draft').length,
        published: notes.filter((note) => note.status === 'published').length,
      };
    } catch (error) {
      console.error('상태 개수 조회 실패:', error);
      return { draft: 0, published: 0 };
    }
  },

  // 이미지 업로드 (Base64로 변환 - Firestore에 직접 저장)
  uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // 파일 크기 체크 (1MB 제한 - Firestore 문서 크기 제한 고려)
      if (file.size > 1024 * 1024) {
        reject(new Error('이미지 크기는 1MB 이하여야 합니다.'));
        return;
      }

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
