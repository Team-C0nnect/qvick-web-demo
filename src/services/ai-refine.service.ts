// 패치노트 AI 다듬기 서비스 (Azure Functions API 호출)
import type { PatchNoteImage } from '../types/patchnote';

// Azure Static Web Apps는 /api를 Functions로 자동 라우팅
const API_BASE_URL = '/api';

interface RefineResult {
  title: string;
  content: string;
  suggestions: string[];
  success: boolean;
  error?: string;
}

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

// 패치노트 AI 다듬기 - Azure Functions API 호출
export async function refinePatchNote(
  version: string,
  title: string,
  content: string,
  images: PatchNoteImage[] = []
): Promise<RefineResult> {
  try {
    const requestBody: RefineRequest = {
      version,
      title,
      content,
      images: images.map(img => ({
        id: img.id,
        alt: img.alt,
        caption: img.caption,
      })),
    };

    const response = await fetch(`${API_BASE_URL}/refinePatchnote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const result = await response.json() as RefineResult;
    return result;

  } catch (error) {
    console.error('AI 다듬기 API 호출 실패:', error);
    
    // API 호출 실패 시 로컬 폴백
    return localRefine(version, title, content, images);
  }
}

// 로컬 다듬기 (API 실패 시 폴백)
function localRefine(
  version: string,
  title: string,
  content: string,
  images: PatchNoteImage[] = []
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
      '(오프라인 모드: 서버 연결 시 더 나은 결과를 얻을 수 있습니다.)',
    ],
    success: true,
  };
}

// 서비스 객체로 export
export const aiRefineService = {
  refinePatchNote,
};
