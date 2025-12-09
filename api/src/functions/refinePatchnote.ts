// 패치노트 AI 다듬기 API 엔드포인트
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS 헤더
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// AI 다듬기 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 Qvick 서비스의 패치노트 작성 전문가입니다. 사용자가 제공하는 패치노트 초안을 다듬어주세요.

## 핵심 원칙: 내용 보존
- 원본의 모든 정보와 세부사항을 **반드시 유지**하세요
- 요약하지 마세요. 다듬기만 하세요
- 원본에 있는 내용을 삭제하거나 생략하지 마세요
- 문장을 더 읽기 쉽게 정리하되, 정보는 그대로 유지하세요

## 금지 사항
- 이모지, 이모티콘 절대 사용 금지
- 원본 내용 요약 또는 축약 금지
- 정보 생략 금지

## 제목 형식
"[버전] 제목 (주요 변경사항)" 형식으로 작성합니다.

## 내용 형식
1. **개요** 섹션 (2-3문장)
2. **주요 변경사항**을 카테고리별로 정리:
   - 새 기능
   - 개선사항  
   - 버그 수정
   - 공지사항
3. 원본의 모든 항목을 bullet point로 명확하게 작성
4. 원본에 있는 세부 설명도 모두 포함

## 마크다운
- 제목: ## (h2), ### (h3)
- 강조: **굵게**, *기울임*
- 목록: - (하이픈)

응답은 반드시 다음 JSON 형식으로만 반환하세요:
{
  "title": "다듬어진 제목",
  "content": "다듬어진 내용 (마크다운, 원본 내용 모두 포함)",
  "suggestions": ["제안사항1", "제안사항2"]
}`;

interface RefineRequest {
  version: string;
  title: string;
  content: string;
  images?: Array<{
    id: string;
    alt: string;
    caption?: string;
  }>;
}

interface RefineResult {
  title: string;
  content: string;
  suggestions: string[];
  success: boolean;
  error?: string;
}

// 로컬 다듬기 (AI 실패 시 폴백)
function localRefine(version: string, title: string, content: string): RefineResult {
  let refinedTitle = title.trim();
  if (version && !refinedTitle.startsWith('[')) {
    refinedTitle = `[${version}] ${refinedTitle}`;
  }

  let refinedContent = content.trim();
  
  // 기본 마크다운 구조 추가
  if (!refinedContent.includes('##')) {
    refinedContent = `## 개요\n\n${refinedContent}`;
  }

  // 줄바꿈 정리
  refinedContent = refinedContent.replace(/\n{3,}/g, '\n\n');

  return {
    title: refinedTitle,
    content: refinedContent,
    suggestions: [
      '제목에 버전 번호가 추가되었습니다.',
      '내용에 기본 구조가 적용되었습니다.',
      '더 나은 결과를 위해 OpenAI API 키를 설정해주세요.',
    ],
    success: true,
  };
}

// AI 다듬기 핸들러
export async function refinePatchnote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('refinePatchnote function processed a request.');

  // OPTIONS (CORS preflight)
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: corsHeaders,
    };
  }

  // POST만 허용
  if (request.method !== 'POST') {
    return {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = await request.json() as RefineRequest;
    const { version, title, content, images = [] } = body;

    // 입력 검증
    if (!title?.trim() && !content?.trim()) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false, 
          error: '제목이나 내용을 입력해주세요.' 
        }),
      };
    }

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      context.log('OpenAI API 키가 설정되지 않아 로컬 다듬기를 수행합니다.');
      const result = localRefine(version, title, content);
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify(result),
      };
    }

    // 이미지 정보 포함한 프롬프트 생성
    let userPrompt = `버전: ${version}\n제목: ${title}\n\n내용:\n${content}`;
    
    if (images.length > 0) {
      userPrompt += '\n\n이미지 정보:\n';
      images.forEach((img) => {
        userPrompt += `- ${img.id}: ${img.alt}${img.caption ? ` (${img.caption})` : ''}\n`;
      });
    }

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    const result = JSON.parse(responseContent) as {
      title: string;
      content: string;
      suggestions: string[];
    };

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...result,
        success: true,
      }),
    };

  } catch (error) {
    context.error('AI 다듬기 실패:', error);
    
    // 에러 발생 시 로컬 다듬기 폴백
    try {
      const body = await request.text();
      const parsed = JSON.parse(body) as RefineRequest;
      const result = localRefine(parsed.version, parsed.title, parsed.content);
      result.suggestions.unshift('AI 처리 중 오류가 발생하여 기본 다듬기가 적용되었습니다.');
      
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify(result),
      };
    } catch {
      return {
        status: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false, 
          error: '다듬기 처리 중 오류가 발생했습니다.' 
        }),
      };
    }
  }
}

app.http('refinePatchnote', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: refinePatchnote
});
