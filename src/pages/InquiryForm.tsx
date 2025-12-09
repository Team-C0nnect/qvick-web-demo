import { useState } from 'react';
import type { InquiryType, DeviceInfo, CreateInquiryRequest } from '../types/inquiry';
import { INQUIRY_TYPE_CONFIG } from '../types/inquiry';
import '../styles/InquiryForm.css';

// 기기 정보 수집
function getDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export default function InquiryFormPage() {
  const [step, setStep] = useState<'type' | 'form' | 'success'>('type');
  const [inquiryType, setInquiryType] = useState<InquiryType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    title: '',
    description: '',
    // 오류 제보용
    errorPage: '',
    errorTime: '',
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: '',
    // 기능 제안용
    featureCategory: '',
    featureBenefit: '',
  });

  const handleTypeSelect = (type: InquiryType) => {
    setInquiryType(type);
    setStep('form');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const requestData: CreateInquiryRequest = {
        type: inquiryType,
        studentId: formData.studentId,
        name: formData.name,
        email: formData.email || undefined,
        title: formData.title,
        description: formData.description,
      };

      // 오류 제보인 경우 추가 정보
      if (inquiryType === 'bug') {
        requestData.errorPage = formData.errorPage || undefined;
        requestData.errorTime = formData.errorTime || undefined;
        requestData.reproductionSteps = formData.reproductionSteps || undefined;
        requestData.expectedBehavior = formData.expectedBehavior || undefined;
        requestData.actualBehavior = formData.actualBehavior || undefined;
        requestData.deviceInfo = getDeviceInfo();
      }

      // 기능 제안인 경우 추가 정보
      if (inquiryType === 'feature') {
        requestData.featureCategory = formData.featureCategory || undefined;
        requestData.featureBenefit = formData.featureBenefit || undefined;
      }

      const response = await fetch('/api/createInquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '문의 접수에 실패했습니다.');
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 접수에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('type');
    setInquiryType(null);
    setFormData({
      studentId: '',
      name: '',
      email: '',
      title: '',
      description: '',
      errorPage: '',
      errorTime: '',
      reproductionSteps: '',
      expectedBehavior: '',
      actualBehavior: '',
      featureCategory: '',
      featureBenefit: '',
    });
    setError(null);
  };

  // 타입 선택 화면
  if (step === 'type') {
    return (
      <div className="inquiry-page">
        <div className="inquiry-container">
          <div className="inquiry-header">
            <h1>Qvick 문의하기</h1>
            <p>어떤 종류의 문의인가요?</p>
          </div>

          <div className="inquiry-type-grid">
            {(Object.keys(INQUIRY_TYPE_CONFIG) as InquiryType[]).map((type) => (
              <button
                key={type}
                className="inquiry-type-card"
                onClick={() => handleTypeSelect(type)}
                style={{ 
                  borderColor: INQUIRY_TYPE_CONFIG[type].color,
                  '--hover-bg': INQUIRY_TYPE_CONFIG[type].bgColor,
                } as React.CSSProperties}
              >
                <div className="type-icon" style={{ backgroundColor: INQUIRY_TYPE_CONFIG[type].bgColor }}>
                  {type === 'bug' && '🐛'}
                  {type === 'feature' && '💡'}
                  {type === 'other' && '💬'}
                </div>
                <h3 style={{ color: INQUIRY_TYPE_CONFIG[type].color }}>
                  {INQUIRY_TYPE_CONFIG[type].label}
                </h3>
                <p>
                  {type === 'bug' && '서비스 이용 중 발생한 오류나 버그를 알려주세요.'}
                  {type === 'feature' && '새로운 기능이나 개선사항을 제안해주세요.'}
                  {type === 'other' && '기타 문의사항이나 의견을 남겨주세요.'}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 성공 화면
  if (step === 'success') {
    return (
      <div className="inquiry-page">
        <div className="inquiry-container">
          <div className="inquiry-success">
            <div className="success-icon">✅</div>
            <h2>문의가 접수되었습니다</h2>
            <p>
              소중한 의견 감사합니다.<br />
              확인 후 빠르게 처리하겠습니다.
            </p>
            <button className="btn-primary" onClick={handleReset}>
              새 문의하기
            </button>
            <a href="https://qvick.kr" className="btn-secondary">
              Qvick으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 폼 화면
  return (
    <div className="inquiry-page">
      <div className="inquiry-container">
        <div className="inquiry-header">
          <button className="back-button" onClick={() => setStep('type')}>
            ← 뒤로
          </button>
          <h1>
            <span 
              className="type-badge"
              style={{ 
                color: INQUIRY_TYPE_CONFIG[inquiryType!].color,
                backgroundColor: INQUIRY_TYPE_CONFIG[inquiryType!].bgColor,
              }}
            >
              {INQUIRY_TYPE_CONFIG[inquiryType!].label}
            </span>
          </h1>
        </div>

        <form className="inquiry-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* 필수 정보 섹션 */}
          <section className="form-section">
            <h3>기본 정보 <span className="required">*필수</span></h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="studentId">학번 *</label>
                <input
                  type="text"
                  id="studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  placeholder="예: 1101"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">이름 *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">이메일 (선택)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="답변 받으실 이메일 (선택사항)"
              />
            </div>
          </section>

          {/* 문의 내용 섹션 */}
          <section className="form-section">
            <h3>문의 내용</h3>
            
            <div className="form-group">
              <label htmlFor="title">제목 *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="문의 제목을 입력하세요"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">상세 설명 *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="문의 내용을 자세히 작성해주세요"
                rows={5}
                required
              />
            </div>
          </section>

          {/* 오류 제보 추가 정보 */}
          {inquiryType === 'bug' && (
            <section className="form-section">
              <h3>오류 상세 정보</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="errorPage">오류 발생 페이지</label>
                  <input
                    type="text"
                    id="errorPage"
                    name="errorPage"
                    value={formData.errorPage}
                    onChange={handleInputChange}
                    placeholder="예: 출석 체크 페이지"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="errorTime">오류 발생 시간</label>
                  <input
                    type="datetime-local"
                    id="errorTime"
                    name="errorTime"
                    value={formData.errorTime}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reproductionSteps">재현 방법</label>
                <textarea
                  id="reproductionSteps"
                  name="reproductionSteps"
                  value={formData.reproductionSteps}
                  onChange={handleInputChange}
                  placeholder="오류를 재현할 수 있는 단계를 알려주세요&#10;예:&#10;1. 출석 체크 페이지에 접속&#10;2. 날짜를 선택&#10;3. 저장 버튼 클릭"
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expectedBehavior">예상 동작</label>
                  <textarea
                    id="expectedBehavior"
                    name="expectedBehavior"
                    value={formData.expectedBehavior}
                    onChange={handleInputChange}
                    placeholder="어떻게 동작해야 하나요?"
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="actualBehavior">실제 동작</label>
                  <textarea
                    id="actualBehavior"
                    name="actualBehavior"
                    value={formData.actualBehavior}
                    onChange={handleInputChange}
                    placeholder="실제로는 어떻게 동작했나요?"
                    rows={2}
                  />
                </div>
              </div>

              <div className="device-info-notice">
                <p>💻 기기 정보가 자동으로 수집됩니다 (문제 해결에 활용)</p>
                <small>브라우저, 화면 크기, 운영체제 등</small>
              </div>
            </section>
          )}

          {/* 기능 제안 추가 정보 */}
          {inquiryType === 'feature' && (
            <section className="form-section">
              <h3>기능 제안 상세</h3>
              
              <div className="form-group">
                <label htmlFor="featureCategory">기능 카테고리</label>
                <select
                  id="featureCategory"
                  name="featureCategory"
                  value={formData.featureCategory}
                  onChange={handleInputChange}
                >
                  <option value="">선택하세요</option>
                  <option value="attendance">출석 관련</option>
                  <option value="schedule">일정 관련</option>
                  <option value="notice">공지사항 관련</option>
                  <option value="student">학생 관리 관련</option>
                  <option value="ui">UI/UX 개선</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="featureBenefit">기대 효과</label>
                <textarea
                  id="featureBenefit"
                  name="featureBenefit"
                  value={formData.featureBenefit}
                  onChange={handleInputChange}
                  placeholder="이 기능이 추가되면 어떤 점이 좋아질까요?"
                  rows={3}
                />
              </div>
            </section>
          )}

          {/* 제출 버튼 */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '접수 중...' : '문의 접수하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
