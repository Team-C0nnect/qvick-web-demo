// 패치노트 API 엔드포인트
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getFirestore, admin } from '../lib/firebase-admin';
import type { PatchNote, CreatePatchNoteRequest, UpdatePatchNoteRequest } from '../types/patchnote';

const COLLECTION_NAME = 'patchnotes';

// Firestore 문서를 PatchNote 객체로 변환
function docToPatchNote(id: string, data: FirebaseFirestore.DocumentData): PatchNote {
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

// CORS 헤더
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// OPTIONS 요청 처리 (CORS preflight)
async function handleOptions(): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: corsHeaders(),
  };
}

// GET /api/patchnotes - 모든 패치노트 조회 (관리자용)
async function getAllPatchNotes(): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const notes = snapshot.docs.map((doc) => docToPatchNote(doc.id, doc.data()));
    
    return {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(notes),
    };
  } catch (error) {
    console.error('패치노트 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 조회에 실패했습니다.' }),
    };
  }
}

// GET /api/patchnotes/published?visibility=public|teacher - 발행된 패치노트 조회
async function getPublishedPatchNotes(visibility?: string): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .get();
    
    let notes = snapshot.docs.map((doc) => docToPatchNote(doc.id, doc.data()));
    
    // visibility 필터링
    if (visibility) {
      notes = notes.filter((note) => 
        note.visibility === visibility || note.visibility === 'public'
      );
    }
    
    return {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(notes),
    };
  } catch (error) {
    console.error('발행된 패치노트 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 조회에 실패했습니다.' }),
    };
  }
}

// GET /api/patchnotes/:id - 단일 패치노트 조회
async function getPatchNoteById(id: string): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }
    
    return {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(docToPatchNote(docSnap.id, docSnap.data()!)),
    };
  } catch (error) {
    console.error('패치노트 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 조회에 실패했습니다.' }),
    };
  }
}

// POST /api/patchnotes - 패치노트 생성
async function createPatchNote(request: CreatePatchNoteRequest): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const now = admin.firestore.Timestamp.now();
    
    const newPatchNote = {
      title: request.title,
      content: request.content,
      version: request.version,
      category: request.category,
      visibility: request.visibility || 'public',
      images: request.images || [],
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      author: request.author,
    };

    const docRef = await db.collection(COLLECTION_NAME).add(newPatchNote);
    
    return {
      status: 201,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: docRef.id,
        ...newPatchNote,
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString(),
      }),
    };
  } catch (error) {
    console.error('패치노트 생성 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 생성에 실패했습니다.' }),
    };
  }
}

// PUT /api/patchnotes/:id - 패치노트 수정
async function updatePatchNote(id: string, request: UpdatePatchNoteRequest): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }

    const updateData = {
      ...request,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);
    
    const updated = await docRef.get();
    return {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(docToPatchNote(updated.id, updated.data()!)),
    };
  } catch (error) {
    console.error('패치노트 수정 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 수정에 실패했습니다.' }),
    };
  }
}

// POST /api/patchnotes/:id/publish - 패치노트 발행
async function publishPatchNote(id: string): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const now = admin.firestore.Timestamp.now();
    
    await docRef.update({
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    });

    const updated = await docRef.get();
    return {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(docToPatchNote(updated.id, updated.data()!)),
    };
  } catch (error) {
    console.error('패치노트 발행 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 발행에 실패했습니다.' }),
    };
  }
}

// POST /api/patchnotes/:id/unpublish - 패치노트 발행 취소
async function unpublishPatchNote(id: string): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    
    await docRef.update({
      status: 'draft',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const updated = await docRef.get();
    return {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(docToPatchNote(updated.id, updated.data()!)),
    };
  } catch (error) {
    console.error('패치노트 발행 취소 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 발행 취소에 실패했습니다.' }),
    };
  }
}

// DELETE /api/patchnotes/:id - 패치노트 삭제
async function deletePatchNote(id: string): Promise<HttpResponseInit> {
  try {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }
    
    await docRef.delete();
    
    return {
      status: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('패치노트 삭제 실패:', error);
    return {
      status: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: '패치노트 삭제에 실패했습니다.' }),
    };
  }
}

// 메인 핸들러
async function patchnotesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const method = request.method;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // OPTIONS (CORS preflight)
  if (method === 'OPTIONS') {
    return handleOptions();
  }
  
  // /api/patchnotes
  if (pathParts.length === 2 && pathParts[1] === 'patchnotes') {
    if (method === 'GET') {
      return getAllPatchNotes();
    }
    if (method === 'POST') {
      const body = await request.json() as CreatePatchNoteRequest;
      return createPatchNote(body);
    }
  }
  
  // /api/patchnotes/published
  if (pathParts.length === 3 && pathParts[2] === 'published') {
    if (method === 'GET') {
      const visibility = url.searchParams.get('visibility') || undefined;
      return getPublishedPatchNotes(visibility);
    }
  }
  
  // /api/patchnotes/:id
  if (pathParts.length === 3 && pathParts[1] === 'patchnotes') {
    const id = pathParts[2];
    
    if (method === 'GET') {
      return getPatchNoteById(id);
    }
    if (method === 'PUT') {
      const body = await request.json() as UpdatePatchNoteRequest;
      return updatePatchNote(id, body);
    }
    if (method === 'DELETE') {
      return deletePatchNote(id);
    }
  }
  
  // /api/patchnotes/:id/publish
  if (pathParts.length === 4 && pathParts[3] === 'publish') {
    const id = pathParts[2];
    if (method === 'POST') {
      return publishPatchNote(id);
    }
  }
  
  // /api/patchnotes/:id/unpublish
  if (pathParts.length === 4 && pathParts[3] === 'unpublish') {
    const id = pathParts[2];
    if (method === 'POST') {
      return unpublishPatchNote(id);
    }
  }
  
  return {
    status: 404,
    headers: corsHeaders(),
    body: JSON.stringify({ error: 'Not found' }),
  };
}

// Azure Functions 등록
app.http('patchnotes', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'patchnotes/{*restOfPath}',
  handler: patchnotesHandler,
});

// 기본 patchnotes 엔드포인트
app.http('patchnotes-root', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'patchnotes',
  handler: patchnotesHandler,
});
