// 패치노트 CRUD API 엔드포인트
// Azure Static Web Apps managed functions - 함수 이름으로 접근, 쿼리 파라미터 사용
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getFirestore, admin } from "../lib/firebase-admin";
import type { PatchNote, CreatePatchNoteRequest, UpdatePatchNoteRequest } from "../types/patchnote";

const COLLECTION_NAME = 'patchnotes';

// CORS 헤더
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

// GET /api/getPatchnotes - 모든 패치노트 조회
export async function getPatchnotes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('getPatchnotes function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const notes = snapshot.docs.map((doc) => docToPatchNote(doc.id, doc.data()));
    
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(notes),
    };
  } catch (error) {
    context.error('패치노트 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 조회에 실패했습니다.' }),
    };
  }
}

app.http('getPatchnotes', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: getPatchnotes
});

// GET /api/getPublishedPatchnotes - 발행된 패치노트 조회
export async function getPublishedPatchnotes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('getPublishedPatchnotes function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const db = getFirestore();
    const visibility = request.query.get('visibility');
    
    // 모든 패치노트를 가져와서 필터링 (복합 인덱스 불필요)
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .get();
    
    let notes = snapshot.docs
      .map((doc) => docToPatchNote(doc.id, doc.data()))
      .filter((note) => note.status === 'published')
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });
    
    // visibility 필터링
    if (visibility) {
      notes = notes.filter((note) => 
        note.visibility === visibility || note.visibility === 'public'
      );
    }
    
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(notes),
    };
  } catch (error) {
    context.error('발행된 패치노트 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 조회에 실패했습니다.' }),
    };
  }
}

app.http('getPublishedPatchnotes', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: getPublishedPatchnotes
});

// GET /api/getPatchnoteById?id=xxx - 단일 패치노트 조회
export async function getPatchnoteById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('getPatchnoteById function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const id = request.query.get('id');
    if (!id) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ID가 필요합니다.' }),
      };
    }

    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }
    
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(docToPatchNote(docSnap.id, docSnap.data()!)),
    };
  } catch (error) {
    context.error('패치노트 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 조회에 실패했습니다.' }),
    };
  }
}

app.http('getPatchnoteById', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: getPatchnoteById
});

// POST /api/createPatchnote - 패치노트 생성
export async function createPatchnote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('createPatchnote function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const body = await request.json() as CreatePatchNoteRequest;
    const { title, content, version, category, visibility = 'public', images = [], author } = body;

    if (!title || !content || !version || !category || !author) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '필수 필드가 누락되었습니다.' }),
      };
    }

    const db = getFirestore();
    const now = admin.firestore.Timestamp.now();
    
    const newPatchNote = {
      title,
      content,
      version,
      category,
      visibility,
      images,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      author,
    };

    const docRef = await db.collection(COLLECTION_NAME).add(newPatchNote);
    
    return {
      status: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        id: docRef.id,
        ...newPatchNote,
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString(),
      }),
    };
  } catch (error) {
    context.error('패치노트 생성 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 생성에 실패했습니다.' }),
    };
  }
}

app.http('createPatchnote', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: createPatchnote
});

// POST /api/updatePatchnote?id=xxx - 패치노트 수정
export async function updatePatchnote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('updatePatchnote function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const id = request.query.get('id');
    if (!id) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ID가 필요합니다.' }),
      };
    }

    const body = await request.json() as UpdatePatchNoteRequest;
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }

    const updateData = {
      ...body,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);
    
    const updated = await docRef.get();
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(docToPatchNote(updated.id, updated.data()!)),
    };
  } catch (error) {
    context.error('패치노트 수정 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 수정에 실패했습니다.' }),
    };
  }
}

app.http('updatePatchnote', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: updatePatchnote
});

// POST /api/deletePatchnote?id=xxx - 패치노트 삭제
export async function deletePatchnote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('deletePatchnote function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const id = request.query.get('id');
    if (!id) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ID가 필요합니다.' }),
      };
    }

    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }

    await docRef.delete();
    
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    context.error('패치노트 삭제 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 삭제에 실패했습니다.' }),
    };
  }
}

app.http('deletePatchnote', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: deletePatchnote
});

// POST /api/publishPatchnote?id=xxx - 패치노트 발행
export async function publishPatchnote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('publishPatchnote function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const id = request.query.get('id');
    if (!id) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ID가 필요합니다.' }),
      };
    }

    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }

    const now = admin.firestore.Timestamp.now();
    await docRef.update({
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    });
    
    const updated = await docRef.get();
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(docToPatchNote(updated.id, updated.data()!)),
    };
  } catch (error) {
    context.error('패치노트 발행 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 발행에 실패했습니다.' }),
    };
  }
}

app.http('publishPatchnote', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: publishPatchnote
});

// POST /api/unpublishPatchnote?id=xxx - 패치노트 발행 취소
export async function unpublishPatchnote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('unpublishPatchnote function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const id = request.query.get('id');
    if (!id) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ID가 필요합니다.' }),
      };
    }

    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: '패치노트를 찾을 수 없습니다.' }),
      };
    }

    await docRef.update({
      status: 'draft',
      publishedAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    
    const updated = await docRef.get();
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(docToPatchNote(updated.id, updated.data()!)),
    };
  } catch (error) {
    context.error('패치노트 발행 취소 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '패치노트 발행 취소에 실패했습니다.' }),
    };
  }
}

app.http('unpublishPatchnote', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: unpublishPatchnote
});
