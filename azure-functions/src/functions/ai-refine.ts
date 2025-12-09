// AI 다듬기 API 엔드포인트
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

// CORS 헤더
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// AI 다듬기 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 Qvick 서비스의 패치노트 작성 전문가입니다. 사용자가 제공하는 패치노트 초안을 다음 규칙에 맞게 다듬어주세요.

## 제목 형식
반드시 "[버전] 제목 (주요 변경사항 강조)" 형식으로 작성합니다.
예시: "[1.2.0] 출석 관리 시스템 개선 (지연출석 기능 추가)"

## 내용 형식
1. **개요** 섹션으로 시작 (2-3문장으로 이번 업데이트 요약)
2. **주요 변경사항**을 카테고리별로 구분:
   - ✨ 새 기능
   - 🔧 개선사항
   - 🐛 버그 수정
   - 📢 공지사항
3. 각 항목은 명확하고 간결하게 bullet point로 작성
4. 기술적 용어보다 사용자 친화적인 표현 사용
5. 이모지를 적절히 활용하여 가독성 향상

## 이미지 배치
- 제공된 이미지 ALT 텍스트를 분석하여 관련 섹션에 배치
- 이미지는 ![alt](이미지ID) 형식으로 삽입
- 이미지 설명이 있으면 이미지 바로 아래에 *이탤릭*으로 캡션 추가

## 마크다운 문법
- 제목: ## (h2), ### (h3) 사용
- 강조: **굵게**, *기울임*
- 목록: - 또는 1. 2. 3.
- 코드: \`인라인 코드\`

응답은 반드시 다음 JSON 형식으로만 반환하세요:
{
  "title": "다듬어진 제목",
  "content": "다듬어진 내용 (마크다운)",
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

// AI 다듬기 핸들러
async function refineHandler(request: HttpRequest): Promise<HttpResponseInit> {
  // OPTIONS (CORS preflight)
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: corsHeaders(),
    };
  }

  // POST만 허용
  if (request.method !== 'POST') {
    return {
      status: 405,
      headers: corsHeaders(),
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
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: '제목이나 내용을 입력해주세요.' 
        }),
      };
    }

    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
      // API 키 없으면 로컬 다듬기 수행
      const result = localRefine(version || '', title || '', content || '', images);
      return {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // 이미지 정보 문자열 생성
    const imageInfo = images.length > 0 
      ? `\n\n첨부된 이미지:\n${images.map(img => 
          `- ID: ${img.id}, ALT: "${img.alt}"${img.caption ? `, 설명: "${img.caption}"` : ''}`
        ).join('\n')}`
      : '';

    const userPrompt = `다음 패치노트를 다듬어주세요.

버전: ${version || '미정'}
제목: ${title || '(제목 없음)'}
내용:
${content || '(내용 없음)'}
${imageInfo}`;

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API 오류:', response.status, errorText);
      throw new Error(`OpenAI API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '';

    // JSON 파싱
    const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const result: RefineResult = {
      title: parsed.title || title,
      content: parsed.content || content,
      suggestions: parsed.suggestions || ['AI가 패치노트를 다듬었습니다.'],
      success: true,
    };

    return {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('AI 다듬기 오류:', error);
    
    // 오류 시 로컬 다듬기로 폴백
    try {
      const body = await request.json() as RefineRequest;
      const result = localRefine(
        body.version || '', 
        body.title || '', 
        body.content || '', 
        body.images || []
      );
      return {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    } catch {
      return {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'AI 다듬기에 실패했습니다.' 
        }),
      };
    }
  }
}

// 로컬 다듬기 (API 없이 기본 형식 적용)
function localRefine(
  version: string,
  title: string,
  content: string,
  images: Array<{ id: string; alt: string; caption?: string }> = []
): RefineResult {
  // 제목 형식화
  const refinedTitle = title.startsWith('[') 
    ? title 
    : `[${version || '1.0.0'}] ${title}`;

  // 내용 형식화
  let refinedContent = content;

  // 이미지 삽입 (내용 끝에 추가)
  if (images.length > 0) {
    const imageSection = `\n\n---\n\n### 📸 스크린샷\n\n${images.map(img => 
      `![${img.alt}](${img.id})${img.caption ? `\n*${img.caption}*` : ''}`
    ).join('\n\n')}`;
    refinedContent += imageSection;
  }

  // 기본 섹션 추가 (내용이 짧은 경우)
  if (!refinedContent.includes('##') && refinedContent.length < 100) {
    refinedContent = `## 개요\n\n이번 업데이트에서는 다양한 개선사항이 포함되었습니다.\n\n## 변경사항\n\n${refinedContent}`;
  }

  return {
    title: refinedTitle,
    content: refinedContent,
    suggestions: [
      '제목에 버전 정보를 추가했습니다.',
      '기본 마크다운 형식을 적용했습니다.',
      ...(images.length > 0 ? ['이미지를 스크린샷 섹션에 추가했습니다.'] : []),
      '(참고: OpenAI API 키가 설정되면 더 나은 결과를 얻을 수 있습니다.)',
    ],
    success: true,
  };
}

// Azure Functions 등록
app.http('ai-refine', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'ai/refine',
  handler: refineHandler,
});
