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
const SYSTEM_PROMPT = `당신은 Qvick 서비스의 패치노트 작성 전문가입니다. 사용자가 제공하는 패치노트 초안을 아래 공식 형식에 맞게 다듬어주세요.

## 핵심 원칙
- 원본의 모든 정보를 **반드시 유지**
- 아래 공식 형식을 따르되, **해당 내용이 없는 섹션은 생략**
- 이모지, 이모티콘 절대 사용 금지

## 공식 패치노트 형식

# vX.X.X 업데이트 안내 (YYYY.MM.DD)

안녕하세요, Qvick 개발팀 c0nnect 입니다.
이번 업데이트에서는 **[한 줄 요약]**이 이루어졌습니다.

---

## 1. 주요 변경 사항 요약

- [핵심 변화 1]
- [핵심 변화 2]
- [핵심 변화 3]

---

## 2. 새로 추가된 기능

### 2-1. [기능 이름]
- 기능 설명: [설명]
- 사용 방법:
  1. [단계 1]
  2. [단계 2]

---

## 3. 개선 사항

- [화면/기능 이름]
  - 이전: [이전 상태]
  - 변경 후: [개선된 상태]

---

## 4. 버그 수정

- [버그 제목]
  - 문제: [문제 설명]
  - 해결: [해결 방법]

---

## 5. 이용 시 참고 사항

- [참고 사항 제목]
  - [상세 설명]

---

## 6. 알려진 이슈

> 서비스 이용에 큰 문제는 없지만, 아래 항목은 개선 작업 중입니다.

- [이슈 요약]
  - 현상: [현상 설명]
  - 임시 해결 방법: [있다면 작성]

---

## 7. 문의 및 피드백

서비스 이용 중 불편 사항이나 개선이 필요하다고 느끼는 점이 있다면 아래 채널을 통해 문의 부탁드립니다.

- 문의 채널: [이메일/오픈채팅/디스코드 등]
- 더 나은 Qvick을 위해 계속해서 개선하겠습니다.

## 작성 규칙
1. 버전(vX.X.X)과 날짜는 원본에서 추출하거나 적절히 생성
2. 한 줄 요약은 핵심 변경사항을 간결하게 작성
3. 섹션 1~7 중 원본에 해당 내용이 없으면 해당 섹션 전체 생략
4. 구분선(---)은 섹션 사이에만 사용
5. 마크다운 문법: # (h1), ## (h2), ### (h3), - (목록), **굵게**

응답은 반드시 다음 JSON 형식으로만 반환하세요:
{
  "title": "vX.X.X 업데이트 안내",
  "content": "공식 형식에 맞게 다듬어진 전체 내용 (마크다운)",
  "suggestions": ["선택적 제안사항"]
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
