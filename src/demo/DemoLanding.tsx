import { useDemoMode } from './DemoContext';
import '../styles/DemoLanding.css';

function QvickLogo() {
  return (
    <svg viewBox="0 0 87 87" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-logo-svg">
      <path d="M48.59 86.3644C48.5604 77.3388 53.1267 67.8702 60.476 60.5369C67.8247 53.2043 77.3438 48.6201 86.4 48.5904L86.3647 37.7915C73.8271 37.8326 61.7151 44.0464 52.8491 52.8929C43.9837 61.739 37.7513 73.8314 37.7925 86.3998L48.59 86.3644Z" fill="white"/>
      <path d="M48.5898 86.382C48.5897 73.8285 42.3675 61.7266 33.5116 52.8706C24.6555 44.0147 12.5536 37.7926 0 37.7926L3.9085e-05 48.5901C9.04186 48.5901 18.5359 53.1652 25.8765 60.5057C33.217 67.8463 37.7922 77.3403 37.7923 86.3821L48.5898 86.382Z" fill="white"/>
      <path d="M37.7929 0.000186511C37.7929 8.81036 33.2308 18.311 25.8642 25.7269C18.5021 33.138 9.00902 37.7926 0 37.7926L3.9085e-05 48.5901C12.5865 48.5901 24.6901 42.2307 33.5247 33.3372C42.3545 24.4485 48.5895 12.3533 48.5895 0L37.7929 0.000186511Z" fill="white"/>
      <path d="M48.5895 0C48.5895 9.04185 53.1652 18.5357 60.5058 25.8763C67.8464 33.2169 77.3403 37.7918 86.3822 37.7918L86.3822 48.5894C73.8286 48.5893 61.7267 42.3674 52.8707 33.5113C44.0147 24.6553 37.7929 12.5538 37.7929 0.000186511L48.5895 0Z" fill="url(#paint0_linear_landing)"/>
      <defs>
        <linearGradient id="paint0_linear_landing" x1="39.0554" y1="4.24454" x2="82.8" y2="46.8675" gradientUnits="userSpaceOnUse">
          <stop stopColor="#897EED"/>
          <stop offset="1" stopColor="#6D23ED"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const features = [
  {
    icon: <CheckIcon />,
    title: '실시간 출결 관리',
    desc: 'QR 코드 스캔으로 빠르고 정확한 출석 체크. 남/여 기숙사별 현황을 한눈에 확인할 수 있습니다.',
  },
  {
    icon: <CalendarIcon />,
    title: '일정 & 스케줄 관리',
    desc: '월별 달력에서 기숙사 점호 일정을 손쉽게 등록하고 관리합니다. 요일별 일괄 설정을 지원합니다.',
  },
  {
    icon: <BellIcon />,
    title: '공지사항 시스템',
    desc: 'Markdown을 지원하는 공지사항 작성, 고정(Pin) 기능으로 중요 공지를 상단에 표시합니다.',
  },
  {
    icon: <ShieldIcon />,
    title: '역할 기반 권한 제어',
    desc: 'Admin / Teacher / Student 역할별 접근 제어와 전용 기능을 제공합니다.',
  },
];

const techStack = ['React', 'TypeScript', 'Vite', 'React Query', 'Azure SWA', 'Spring Boot'];

export default function DemoLanding() {
  const { enterDemo } = useDemoMode();

  return (
    <div className="demo-landing">
      {/* Hero */}
      <section className="demo-hero">
        <div className="demo-hero-bg" />
        <div className="demo-hero-content">
          <div className="demo-hero-logo">
            <QvickLogo />
          </div>
          <h1 className="demo-hero-title">Qvick Admin</h1>
          <p className="demo-hero-subtitle">
            기숙사 출결 관리 시스템
          </p>
          <p className="demo-hero-desc">
            QR 기반 출석 체크, 일정 관리, 공지사항 등<br />
            기숙사 운영에 필요한 모든 기능을 하나의 대시보드에서 관리합니다.
          </p>
          <button className="demo-cta-btn" onClick={enterDemo}>
            데모 체험하기
          </button>
          <p className="demo-cta-hint">로그인 없이 모든 기능을 둘러볼 수 있습니다</p>
        </div>
      </section>

      {/* Features */}
      <section className="demo-features">
        <h2 className="demo-section-title">주요 기능</h2>
        <div className="demo-features-grid">
          {features.map((f) => (
            <div key={f.title} className="demo-feature-card">
              <div className="demo-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="demo-tech">
        <h2 className="demo-section-title">기술 스택</h2>
        <div className="demo-tech-chips">
          {techStack.map((t) => (
            <span key={t} className="demo-tech-chip">{t}</span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="demo-footer">
        <p>Qvick &mdash; Team C0nnect</p>
      </footer>
    </div>
  );
}
