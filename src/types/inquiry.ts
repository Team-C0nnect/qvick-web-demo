// 문의 타입 정의

export type InquiryType = 'bug' | 'feature' | 'other';
export type InquiryStatus = 'pending' | 'in-progress' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'medium' | 'high' | 'critical';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  timezone: string;
}

export interface Inquiry {
  id: string;
  type: InquiryType;
  status: InquiryStatus;
  priority: InquiryPriority;
  
  // 필수 정보
  studentId: string;      // 학번
  name: string;           // 이름
  email?: string;         // 이메일 (선택)
  
  // 문의 내용
  title: string;          // 제목
  description: string;    // 상세 설명
  
  // 오류 제보용 추가 필드
  errorPage?: string;     // 오류 발생 페이지
  errorTime?: string;     // 오류 발생 시간
  reproductionSteps?: string; // 재현 방법
  expectedBehavior?: string;  // 예상 동작
  actualBehavior?: string;    // 실제 동작
  deviceInfo?: DeviceInfo;    // 기기 정보
  
  // 기능 제안용 추가 필드
  featureCategory?: string;   // 기능 카테고리
  featureBenefit?: string;    // 기대 효과
  
  // 첨부 파일 (스크린샷 등)
  attachments?: string[];
  
  // 관리자 필드
  adminNote?: string;     // 관리자 메모
  assignedTo?: string;    // 담당자
  resolvedAt?: string;    // 해결 일시
  
  // 메타데이터
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryRequest {
  type: InquiryType;
  studentId: string;
  name: string;
  email?: string;
  title: string;
  description: string;
  
  // 오류 제보용
  errorPage?: string;
  errorTime?: string;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  deviceInfo?: DeviceInfo;
  
  // 기능 제안용
  featureCategory?: string;
  featureBenefit?: string;
  
  attachments?: string[];
}

export interface UpdateInquiryRequest {
  status?: InquiryStatus;
  priority?: InquiryPriority;
  adminNote?: string;
  assignedTo?: string;
}

// 타입별 설정
export const INQUIRY_TYPE_CONFIG: Record<InquiryType, { label: string; color: string; bgColor: string }> = {
  bug: { label: '오류 제보', color: 'var(--app-danger-strong)', bgColor: 'var(--app-danger-soft)' },
  feature: { label: '기능 제안', color: 'var(--app-info)', bgColor: 'var(--app-info-soft)' },
  other: { label: '기타 문의', color: 'var(--app-text-muted)', bgColor: 'var(--app-surface-subtle)' },
};

export const INQUIRY_STATUS_CONFIG: Record<InquiryStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기중', color: 'var(--app-warning)', bgColor: 'var(--app-warning-soft)' },
  'in-progress': { label: '처리중', color: 'var(--app-info)', bgColor: 'var(--app-info-soft)' },
  resolved: { label: '해결됨', color: 'var(--app-success)', bgColor: 'var(--app-success-soft)' },
  closed: { label: '종료', color: 'var(--app-text-muted)', bgColor: 'var(--app-surface-subtle)' },
};

export const INQUIRY_PRIORITY_CONFIG: Record<InquiryPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: '낮음', color: 'var(--app-text-muted)', bgColor: 'var(--app-surface-subtle)' },
  medium: { label: '보통', color: 'var(--app-warning)', bgColor: 'var(--app-warning-soft)' },
  high: { label: '높음', color: 'var(--app-warning)', bgColor: 'var(--app-warning-soft)' },
  critical: { label: '긴급', color: 'var(--app-danger-strong)', bgColor: 'var(--app-danger-soft)' },
};
