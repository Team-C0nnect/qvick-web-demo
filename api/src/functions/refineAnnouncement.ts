import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function refineAnnouncement(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request.');

  try {
    // CORS 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        headers,
      };
    }

    // POST 요청만 허용
    if (request.method !== 'POST') {
      return {
        status: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // 요청 본문 파싱
    const body = await request.json() as { content: string };
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return {
        status: 400,
        headers,
        body: JSON.stringify({ error: '내용을 입력해주세요.' }),
      };
    }

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 기숙사 학교의 공지사항을 작성하는 전문가입니다. 
사용자가 작성한 내용을 다음 기준에 맞게 다듬어주세요:

1. 기숙사 생활 특성을 고려한 공식적이고 명확한 어조
2. 마크다운 형식 활용 (제목, 목록, 강조 등)
3. 중요한 정보는 **굵게** 표시
4. 날짜, 시간, 장소, 호실 등 핵심 정보 강조
5. 기숙사 일과 및 규칙을 고려한 내용 구성
6. 문단 구조를 명확하게 정리
7. 어법과 맞춤법 교정
8. 이모지는 필수적인 경우에만 최소한으로 사용 (예: ⚠️ 중요 공지, 📅 일정)

기숙사 생활과 관련된 용어를 적절히 사용하고 (예: 호실, 사감실, 취침시간, 점호, 외출/외박 등),
원본의 의미와 내용은 반드시 유지하되 가독성과 전달력을 높여주세요.
응답은 다듬어진 마크다운 텍스트만 제공하고, 설명이나 메타 정보는 포함하지 마세요.`
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const refinedContent = completion.choices[0]?.message?.content;

    if (!refinedContent) {
      return {
        status: 500,
        headers,
        body: JSON.stringify({ error: '내용을 다듬는 중 오류가 발생했습니다.' }),
      };
    }

    return {
      status: 200,
      headers,
      body: JSON.stringify({ 
        refinedContent,
        usage: completion.usage 
      }),
    };

  } catch (error) {
    context.error('Error refining announcement:', error);
    
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
      }),
    };
  }
}

app.http('refineAnnouncement', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: refineAnnouncement
});
