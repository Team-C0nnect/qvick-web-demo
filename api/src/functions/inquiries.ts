// 문의 API 엔드포인트
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getFirestore } from "../lib/firebase-admin";

// CORS 헤더
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 문의 생성 (로그인 불필요)
async function createInquiry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const db = getFirestore();
    const body = await request.json() as any;
    
    // 필수 필드 검증
    if (!body.type || !body.studentId || !body.name || !body.title || !body.description) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '필수 항목을 모두 입력해주세요.' }),
      };
    }

    // 학번 형식 검증 (4자리 숫자)
    if (!/^\d{4}$/.test(body.studentId)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '학번은 4자리 숫자로 입력해주세요.' }),
      };
    }

    const now = new Date().toISOString();
    const inquiryData = {
      type: body.type,
      status: 'pending',
      priority: body.type === 'bug' ? 'medium' : 'low',
      
      studentId: body.studentId,
      name: body.name,
      email: body.email || null,
      
      title: body.title,
      description: body.description,
      
      // 오류 제보용
      errorPage: body.errorPage || null,
      errorTime: body.errorTime || null,
      reproductionSteps: body.reproductionSteps || null,
      expectedBehavior: body.expectedBehavior || null,
      actualBehavior: body.actualBehavior || null,
      deviceInfo: body.deviceInfo || null,
      
      // 기능 제안용
      featureCategory: body.featureCategory || null,
      featureBenefit: body.featureBenefit || null,
      
      attachments: body.attachments || [],
      
      adminNote: null,
      assignedTo: null,
      resolvedAt: null,
      
      createdAt: now,
      updatedAt: now,
    };

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

  try {
    const db = getFirestore();
    const status = request.query.get('status');
    const type = request.query.get('type');
    
    const query = db.collection('inquiries').orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    let inquiries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 필터링 (클라이언트 사이드)
    if (status) {
      inquiries = inquiries.filter((i: any) => i.status === status);
    }
    if (type) {
      inquiries = inquiries.filter((i: any) => i.type === type);
    }

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(inquiries),
    };
  } catch (error) {
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

  try {
    const db = getFirestore();
    const id = request.query.get('id');
    if (!id) {
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

  try {
    const db = getFirestore();
    const id = request.query.get('id');
    if (!id) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: '문의 ID가 필요합니다.' }),
      };
    }

    const body = await request.json() as any;
    const now = new Date().toISOString();
    
    const updateData: any = {
      updatedAt: now,
    };

    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.adminNote !== undefined) updateData.adminNote = body.adminNote;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    
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

  try {
    const db = getFirestore();
    const id = request.query.get('id');
    if (!id) {
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
