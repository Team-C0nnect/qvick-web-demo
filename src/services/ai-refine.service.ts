// 패치노트 AI 다듬기 서비스
import type { PatchNoteImage } from '../types/patchnote';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

interface RefineResult {
  title: string;
  content: string;
  suggestions: string[];
  success: boolean;
  error?: string;
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
  "content": "다듬어진 내용 (마크다운)"
}`;

// 패치노트 AI 다듬기
export async function refinePatchNote(
  version: string,
  title: string,
  content: string,
  images: PatchNoteImage[] = []
): Promise<RefineResult> {
  // API 키가 없으면 로컬 다듬기 수행
  if (!OPENAI_API_KEY) {
    return localRefine(version, title, content, images);
  }

  try {
    const imageInfo = images.length > 0 
      ? `\n\n첨부된 이미지:\n${images.map(img => `- ID: ${img.id}, ALT: "${img.alt}"${img.caption ? `, 설명: "${img.caption}"` : ''}`).join('\n')}`
      : '';

    const userPrompt = `다음 패치노트를 다듬어주세요.

버전: ${version}
제목: ${title}
내용:
${content}
${imageInfo}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || '';

    // JSON 파싱
    const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('응답에서 JSON을 찾을 수 없습니다.');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      title: result.title || title,
      content: result.content || content,
      suggestions: result.suggestions || ['AI가 제목과 내용을 개선했습니다.'],
      success: true,
    };
  } catch (error) {
    console.error('AI 다듬기 오류:', error);
    // 실패 시 로컬 다듬기 수행
    return localRefine(version, title, content, images);
  }
}

// 로컬 다듬기 (API 없이 기본 형식 적용)
function localRefine(
  version: string,
  title: string,
  content: string,
  images: PatchNoteImage[] = []
): RefineResult {
  // 제목 형식화
  const refinedTitle = title.startsWith('[') 
    ? title 
    : `[${version}] ${title}`;

  // 내용 형식화
  let refinedContent = content;

  // 이미지 삽입 위치 결정 (내용 끝에 추가)
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
    ],
    success: true,
  };
}

// 이미지를 내용에 자동 배치
export function insertImagesIntoContent(
  content: string,
  images: PatchNoteImage[]
): string {
  let result = content;
  
  images.forEach(image => {
    // 이미 삽입된 이미지는 스킵
    if (result.includes(`(${image.id})`)) return;
    
    // ALT 텍스트 기반으로 관련 섹션 찾기
    const altKeywords = image.alt.toLowerCase().split(' ');
    let insertPosition = result.length;
    
    // 관련 키워드가 있는 섹션 찾기
    for (const keyword of altKeywords) {
      if (keyword.length < 3) continue;
      
      const keywordIndex = result.toLowerCase().indexOf(keyword);
      if (keywordIndex !== -1) {
        // 해당 키워드 다음 줄바꿈 위치 찾기
        const nextLineBreak = result.indexOf('\n', keywordIndex);
        if (nextLineBreak !== -1 && nextLineBreak < insertPosition) {
          insertPosition = nextLineBreak;
        }
      }
    }
    
    // 이미지 삽입
    const imageMarkdown = `\n\n![${image.alt}](${image.id})${image.caption ? `\n*${image.caption}*` : ''}\n`;
    
    if (insertPosition === result.length) {
      result += imageMarkdown;
    } else {
      result = result.slice(0, insertPosition) + imageMarkdown + result.slice(insertPosition);
    }
  });
  
  return result;
}

// 서비스 객체로 export
export const aiRefineService = {
  refinePatchNote,
  insertImagesIntoContent,
};
