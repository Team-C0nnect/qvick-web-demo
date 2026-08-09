// 문의 API 엔드포인트
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getFirestore } from "../lib/firebase-admin";
import { requireRoles } from "../lib/auth";
import {
  checkRateLimit,
  getClientIdentifier,
  readJsonBody,
  RequestValidationError,
  validationErrorResponse,
} from "../lib/request-security";

type InquiryType = 'bug' | 'feature' | 'other';
type InquiryStatus = 'pending' | 'in-progress' | 'resolved' | 'closed';
type InquiryPriority = 'low' | 'medium' | 'high' | 'critical';

interface CreateInquiryBody {
  type?: InquiryType;
  studentId?: string;
  name?: string;
  email?: string;
  title?: string;
  description?: string;
  errorPage?: string;
  errorTime?: string;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  deviceInfo?: unknown;
  featureCategory?: string;
  featureBenefit?: string;
  attachments?: string[];
}

interface InquiryDocument {
  id: string;
  status?: InquiryStatus;
  type?: InquiryType;
  [key: string]: unknown;
}

interface UpdateInquiryBody {
  status?: InquiryStatus;
  priority?: InquiryPriority;
  adminNote?: string | null;
  assignedTo?: string | null;
}

type InquiryUpdateData = Record<string, string | null>;

const CREATE_BODY_LIMIT_BYTES = 32 * 1024;
const UPDATE_BODY_LIMIT_BYTES = 8 * 1024;
const INQUIRY_TYPES: InquiryType[] = ['bug', 'feature', 'other'];
const INQUIRY_STATUSES: InquiryStatus[] = ['pending', 'in-progress', 'resolved', 'closed'];
const INQUIRY_PRIORITIES: InquiryPriority[] = ['low', 'medium', 'high', 'critical'];

function validateText(
  value: unknown,
  fieldName: string,
  maxLength: number,
  required = false,
): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new RequestValidationError(`${fieldName} 항목이 필요합니다.`);
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new RequestValidationError(`${fieldName} 형식이 올바르지 않습니다.`);
  }

  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new RequestValidationError(`${fieldName} 항목이 필요합니다.`);
  }
  if (trimmed.length > maxLength) {
    throw new RequestValidationError(`${fieldName} 항목이 너무 깁니다.`);
  }
  return trimmed || undefined;
}

function isValidDocumentId(id: string | null): id is string {
  return Boolean(id && /^[A-Za-z0-9_-]{1,128}$/.test(id));
}

// CORS 헤더
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 문의 생성 (로그인 불필요)
async function createInquiry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const rateLimitResponse = checkRateLimit(
      'create-inquiry',
      getClientIdentifier(request),
      5,
      10 * 60 * 1000,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await readJsonBody<CreateInquiryBody>(request, CREATE_BODY_LIMIT_BYTES);
    
    // 필수 필드 검증
    if (!body.type || !INQUIRY_TYPES.includes(body.type)) {
      throw new RequestValidationError('문의 유형이 올바르지 않습니다.');
    }

    const studentId = validateText(body.studentId, '학번', 4, true)!;
    const name = validateText(body.name, '이름', 50, true)!;
    const title = validateText(body.title, '제목', 120, true)!;
    const description = validateText(body.description, '내용', 5_000, true)!;
    const email = validateText(body.email, '이메일', 254);

    // 학번 형식 검증 (4자리 숫자)
    if (!/^\d{4}$/.test(studentId)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '학번은 4자리 숫자로 입력해주세요.' }),
      };
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new RequestValidationError('이메일 형식이 올바르지 않습니다.');
    }

    if (body.attachments !== undefined) {
      if (
        !Array.isArray(body.attachments) ||
        body.attachments.length > 3 ||
        body.attachments.some((url) => typeof url !== 'string' || !/^https:\/\//i.test(url) || url.length > 1_000)
      ) {
        throw new RequestValidationError('첨부 자료 형식이 올바르지 않습니다.');
      }
    }

    if (body.deviceInfo && JSON.stringify(body.deviceInfo).length > 2_000) {
      throw new RequestValidationError('기기 정보가 너무 큽니다.');
    }

    const now = new Date().toISOString();
    const inquiryData = {
      type: body.type,
      status: 'pending',
      priority: body.type === 'bug' ? 'medium' : 'low',
      
      studentId,
      name,
      email: email || null,
      
      title,
      description,
      
      // 오류 제보용
      errorPage: validateText(body.errorPage, '오류 페이지', 500) || null,
      errorTime: validateText(body.errorTime, '오류 시간', 100) || null,
      reproductionSteps: validateText(body.reproductionSteps, '재현 방법', 3_000) || null,
      expectedBehavior: validateText(body.expectedBehavior, '예상 동작', 2_000) || null,
      actualBehavior: validateText(body.actualBehavior, '실제 동작', 2_000) || null,
      deviceInfo: body.deviceInfo || null,
      
      // 기능 제안용
      featureCategory: validateText(body.featureCategory, '기능 분류', 100) || null,
      featureBenefit: validateText(body.featureBenefit, '기대 효과', 2_000) || null,
      
      attachments: body.attachments || [],
      
      adminNote: null,
      assignedTo: null,
      resolvedAt: null,
      
      createdAt: now,
      updatedAt: now,
    };

    const db = getFirestore();
    const docRef = await db.collection('inquiries').add(inquiryData);
    
    return {
      status: 201,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        id: docRef.id,
        message: '문의가 성공적으로 접수되었습니다.',
      }),
    };
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return { ...validationResponse, headers: corsHeaders };

    context.error('문의 생성 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '문의 접수에 실패했습니다.' }),
    };
  }
}

// 문의 목록 조회 (관리자용)
async function getInquiries(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const db = getFirestore();
    const status = request.query.get('status');
    const type = request.query.get('type');

    if (status && !INQUIRY_STATUSES.includes(status as InquiryStatus)) {
      throw new RequestValidationError('문의 상태가 올바르지 않습니다.');
    }
    if (type && !INQUIRY_TYPES.includes(type as InquiryType)) {
      throw new RequestValidationError('문의 유형이 올바르지 않습니다.');
    }
    
    const query = db.collection('inquiries').orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    let inquiries: InquiryDocument[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 필터링 (클라이언트 사이드)
    if (status) {
      inquiries = inquiries.filter((i) => i.status === status);
    }
    if (type) {
      inquiries = inquiries.filter((i) => i.type === type);
    }

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(inquiries),
    };
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return { ...validationResponse, headers: corsHeaders };

    context.error('문의 목록 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '문의 목록을 불러오는데 실패했습니다.' }),
    };
  }
}

// 단일 문의 조회
async function getInquiryById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const db = getFirestore();
    const id = request.query.get('id');
    if (!isValidDocumentId(id)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '문의 ID가 필요합니다.' }),
      };
    }

    const doc = await db.collection('inquiries').doc(id).get();
    
    if (!doc.exists) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: '문의를 찾을 수 없습니다.' }),
      };
    }

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({ id: doc.id, ...doc.data() }),
    };
  } catch (error) {
    context.error('문의 조회 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '문의를 불러오는데 실패했습니다.' }),
    };
  }
}

// 문의 상태 업데이트 (관리자용)
async function updateInquiry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const db = getFirestore();
    const id = request.query.get('id');
    if (!isValidDocumentId(id)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '문의 ID가 필요합니다.' }),
      };
    }

    const body = await readJsonBody<UpdateInquiryBody>(request, UPDATE_BODY_LIMIT_BYTES);
    const now = new Date().toISOString();
    
    const updateData: InquiryUpdateData = {
      updatedAt: now,
    };

    if (body.status && !INQUIRY_STATUSES.includes(body.status)) {
      throw new RequestValidationError('문의 상태가 올바르지 않습니다.');
    }
    if (body.priority && !INQUIRY_PRIORITIES.includes(body.priority)) {
      throw new RequestValidationError('문의 우선순위가 올바르지 않습니다.');
    }

    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.adminNote !== undefined) {
      updateData.adminNote = validateText(body.adminNote, '관리자 메모', 3_000) || null;
    }
    if (body.assignedTo !== undefined) {
      updateData.assignedTo = validateText(body.assignedTo, '담당자', 100) || null;
    }
    
    if (body.status === 'resolved') {
      updateData.resolvedAt = now;
    }

    await db.collection('inquiries').doc(id).update(updateData);

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: '문의가 업데이트되었습니다.' }),
    };
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return { ...validationResponse, headers: corsHeaders };

    context.error('문의 업데이트 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '문의 업데이트에 실패했습니다.' }),
    };
  }
}

// 문의 삭제 (관리자용)
async function deleteInquiry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  const auth = await requireRoles(request, ['ADMIN'], context);
  if ('response' in auth) return auth.response;

  try {
    const db = getFirestore();
    const id = request.query.get('id');
    if (!isValidDocumentId(id)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '문의 ID가 필요합니다.' }),
      };
    }

    await db.collection('inquiries').doc(id).delete();

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: '문의가 삭제되었습니다.' }),
    };
  } catch (error) {
    context.error('문의 삭제 실패:', error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '문의 삭제에 실패했습니다.' }),
    };
  }
}

// Azure Functions 등록
app.http('createInquiry', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: createInquiry,
});

app.http('getInquiries', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: getInquiries,
});

app.http('getInquiryById', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: getInquiryById,
});

app.http('updateInquiry', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: updateInquiry,
});

app.http('deleteInquiry', {
  methods: ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: deleteInquiry,
});
