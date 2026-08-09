// 패치노트 CRUD API 엔드포인트
// Azure Static Web Apps managed functions - 함수 이름으로 접근, 쿼리 파라미터 사용
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentData,
} from "../lib/firebase-admin";
import { requireRoles } from "../lib/auth";
import {
  readJsonBody,
  RequestValidationError,
  validationErrorResponse,
} from "../lib/request-security";
import type {
  PatchNote,
  PatchNoteCategory,
  PatchNoteImage,
  PatchNoteVisibility,
  UpdatePatchNoteRequest,
} from "../types/patchnote";

const COLLECTION_NAME = 'patchnotes';
const PATCHNOTE_BODY_LIMIT_BYTES = 900 * 1024;
const PATCHNOTE_CATEGORIES: PatchNoteCategory[] = ['feature', 'improvement', 'bugfix', 'notice'];
const PATCHNOTE_VISIBILITIES: PatchNoteVisibility[] = ['public', 'teacher'];
const SAFE_DATA_IMAGE_PATTERN =
  /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

function validateRequiredText(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new RequestValidationError(`${fieldName} 항목이 필요합니다.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new RequestValidationError(`${fieldName} 항목이 너무 깁니다.`);
  }
  return trimmed;
}

function validateImages(value: unknown): PatchNoteImage[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5) {
    throw new RequestValidationError('이미지는 최대 5개까지 첨부할 수 있습니다.');
  }

  return value.map((image) => {
    if (!image || typeof image !== 'object') {
      throw new RequestValidationError('이미지 정보가 올바르지 않습니다.');
    }

    const candidate = image as Partial<PatchNoteImage>;
    const id = validateRequiredText(candidate.id, '이미지 ID', 100);
    const url = validateRequiredText(candidate.url, '이미지 URL', PATCHNOTE_BODY_LIMIT_BYTES);
    const alt = validateRequiredText(candidate.alt, '이미지 설명', 200);
    const caption = candidate.caption === undefined
      ? undefined
      : validateRequiredText(candidate.caption, '이미지 캡션', 500);

    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      throw new RequestValidationError('이미지 ID 형식이 올바르지 않습니다.');
    }
    if (!/^https:\/\//i.test(url) && !SAFE_DATA_IMAGE_PATTERN.test(url)) {
      throw new RequestValidationError('이미지 URL 형식이 올바르지 않습니다.');
    }

    return { id, url, alt, caption };
  });
}

function isValidDocumentId(id: string | null): id is string {
  return Boolean(id && /^[A-Za-z0-9_-]{1,128}$/.test(id));
}

// CORS 헤더
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

// GET /api/getPatchnotes - 모든 패치노트 조회
export async function getPatchnotes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('getPatchnotes function processed a request.');

  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

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
    const visibility = request.query.get('visibility') || 'public';

    if (visibility !== 'public' && visibility !== 'teacher') {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '올바르지 않은 공개 범위입니다.' }),
      };
    }

    if (visibility === 'teacher') {
      const auth = await requireRoles(request, ['TEACHER', 'ADMIN', 'MANAGER'], context);
      if ('response' in auth) return auth.response;
    }
    
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
    
    notes = notes.filter((note) => note.visibility === visibility);
    
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
    if (!isValidDocumentId(id)) {
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

    const note = docToPatchNote(docSnap.id, docSnap.data()!);
    if (
      note.status !== 'published' ||
      (note.visibility !== 'public' && note.visibility !== 'teacher')
    ) {
      const auth = await requireRoles(request, ['ADMIN'], context);
      if ('response' in auth) return auth.response;
    } else if (note.visibility === 'teacher') {
      const auth = await requireRoles(request, ['TEACHER', 'ADMIN', 'MANAGER'], context);
      if ('response' in auth) return auth.response;
    }
    
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(note),
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

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const rawBody = await readJsonBody<unknown>(request, PATCHNOTE_BODY_LIMIT_BYTES);
    if (!rawBody || typeof rawBody !== 'object') {
      throw new RequestValidationError('요청 본문이 올바르지 않습니다.');
    }
    const body = rawBody as Record<string, unknown>;
    const title = validateRequiredText(body.title, '제목', 200);
    const content = validateRequiredText(body.content, '내용', 100_000);
    const version = validateRequiredText(body.version, '버전', 50);
    const category = body.category;
    const visibility = body.visibility ?? 'public';
    const images = validateImages(body.images);

    if (!PATCHNOTE_CATEGORIES.includes(category as PatchNoteCategory)) {
      throw new RequestValidationError('패치노트 분류가 올바르지 않습니다.');
    }
    if (!PATCHNOTE_VISIBILITIES.includes(visibility as PatchNoteVisibility)) {
      throw new RequestValidationError('공개 범위가 올바르지 않습니다.');
    }
    if (!/^[0-9A-Za-z._-]+$/.test(version)) {
      throw new RequestValidationError('버전 형식이 올바르지 않습니다.');
    }

    const db = getFirestore();
    const now = Timestamp.now();
    
    const newPatchNote = {
      title,
      content,
      version,
      category: category as PatchNoteCategory,
      visibility: visibility as PatchNoteVisibility,
      images,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      author: auth.user.name,
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
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return { ...validationResponse, headers: corsHeaders };

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

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const id = request.query.get('id');
    if (!isValidDocumentId(id)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ID가 필요합니다.' }),
      };
    }

    const rawBody = await readJsonBody<unknown>(request, PATCHNOTE_BODY_LIMIT_BYTES);
    if (!rawBody || typeof rawBody !== 'object') {
      throw new RequestValidationError('요청 본문이 올바르지 않습니다.');
    }
    const body = rawBody as UpdatePatchNoteRequest;
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

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (body.title !== undefined) {
      updateData.title = validateRequiredText(body.title, '제목', 200);
    }
    if (body.content !== undefined) {
      updateData.content = validateRequiredText(body.content, '내용', 100_000);
    }
    if (body.version !== undefined) {
      const version = validateRequiredText(body.version, '버전', 50);
      if (!/^[0-9A-Za-z._-]+$/.test(version)) {
        throw new RequestValidationError('버전 형식이 올바르지 않습니다.');
      }
      updateData.version = version;
    }
    if (body.category !== undefined) {
      if (!PATCHNOTE_CATEGORIES.includes(body.category)) {
        throw new RequestValidationError('패치노트 분류가 올바르지 않습니다.');
      }
      updateData.category = body.category;
    }
    if (body.visibility !== undefined) {
      if (!PATCHNOTE_VISIBILITIES.includes(body.visibility)) {
        throw new RequestValidationError('공개 범위가 올바르지 않습니다.');
      }
      updateData.visibility = body.visibility;
    }
    if (body.images !== undefined) {
      updateData.images = validateImages(body.images);
    }

    await docRef.update(updateData);
    
    const updated = await docRef.get();
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(docToPatchNote(updated.id, updated.data()!)),
    };
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return { ...validationResponse, headers: corsHeaders };

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

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const id = request.query.get('id');
    if (!isValidDocumentId(id)) {
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

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const id = request.query.get('id');
    if (!isValidDocumentId(id)) {
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

    const now = Timestamp.now();
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

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const id = request.query.get('id');
    if (!isValidDocumentId(id)) {
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
      publishedAt: FieldValue.delete(),
      updatedAt: Timestamp.now(),
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
