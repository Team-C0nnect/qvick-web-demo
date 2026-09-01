import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Landing.css';

const STORE_LINKS = [
  { name: 'Google Play', url: import.meta.env.VITE_GOOGLE_PLAY_URL?.trim(), badgeSrc: '/store-badges/google-play.svg', badgeAlt: 'Google Play에서 다운로드' },
  { name: 'App Store', url: import.meta.env.VITE_APP_STORE_URL?.trim(), badgeSrc: '/store-badges/app-store.svg', badgeAlt: 'App Store에서 다운로드' },
] as const;

const FEATURES = [
  { number: '01', label: 'ATTENDANCE', title: '출석은 빠르게,\n기록은 정확하게.', description: 'QR을 스캔하면 출석이 바로 처리됩니다. 바쁜 저녁에도 필요한 확인을 놓치지 않도록 간단하게 만들었어요.', type: 'attendance' },
  { number: '02', label: 'SCHEDULE', title: '오늘의 일정을\n한눈에.', description: '점호 시간과 기숙사 주요 일정을 한 화면에서 확인하세요. 매일의 흐름을 미리 알고 편안하게 준비할 수 있어요.', type: 'schedule' },
  { number: '03', label: 'NOTICE', title: '중요한 공지는\n놓치지 않게.', description: '기숙사에서 전하는 안내를 필요한 때 바로 확인합니다. 새 소식이 쌓여도 중요한 내용부터 차분하게 볼 수 있어요.', type: 'notice' },
] as const;

function Reveal({ children, delayed = false }: { children: ReactNode; delayed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      element?.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }, { threshold: 0.14 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`landing-reveal${delayed ? ' is-delayed' : ''}`}>{children}</div>;
}

function StoreBadge({ name, url, badgeSrc, badgeAlt }: (typeof STORE_LINKS)[number]) {
  const badge = <img src={badgeSrc} alt={badgeAlt} />;

  if (!url) {
    return <div className="landing-store-badge is-unavailable" aria-label={`${name} 출시 준비 중`}>{badge}<span>출시 준비 중</span></div>;
  }

  return <a className="landing-store-badge" href={url} target="_blank" rel="noreferrer" aria-label={`${name}에서 Qvick 다운로드`}>{badge}</a>;
}

function FeatureVisual({ type }: { type: (typeof FEATURES)[number]['type'] }) {
  if (type === 'attendance') {
    return <div className="feature-visual feature-attendance" aria-hidden="true"><div className="feature-visual-top"><span>오늘 저녁 점호</span><strong>19:00</strong></div><div className="feature-qr"><i /><i /><i /><i /><i /><i /><i /><i /><b>Q</b></div><span className="feature-status">출석 확인 완료</span></div>;
  }

  if (type === 'schedule') {
    return <div className="feature-visual feature-schedule" aria-hidden="true"><p>9월 1일 · 월요일</p><div><span>18:30</span><strong>저녁 입실</strong></div><div><span>19:00</span><strong>점호</strong></div><div><span>21:30</span><strong>자습 종료</strong></div></div>;
  }

  return <div className="feature-visual feature-notice" aria-hidden="true"><span className="notice-dot" /><p>새로운 공지</p><strong>9월 기숙사 생활 안내</strong><small>오늘의 변경 사항을 확인해 주세요.</small><div><span>확인하기</span><b>→</b></div></div>;
}

export default function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Qvick 홈"><img src="/qvick.svg" alt="" /><span>Qvick</span></Link>
        <Link className="landing-login-link" to="/login">Qvick Teacher <span aria-hidden="true">↗</span></Link>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <Reveal><div className="landing-hero-copy"><p className="landing-eyebrow">DORMITORY LIFE, SIMPLIFIED</p><h1 id="landing-title">기숙사 생활을<br /><strong>더 스마트하게.</strong></h1><p className="landing-description">출석부터 일정, 공지 확인까지. Qvick은 기숙사에서 필요한 일상을 한곳에 모아두었습니다.</p><div className="landing-store-list" aria-label="Qvick 앱 다운로드">{STORE_LINKS.map((store) => <StoreBadge key={store.name} {...store} />)}</div></div></Reveal>
          <Reveal delayed><div className="landing-hero-stage"><div className="landing-hero-art"><span className="landing-art-note">YOUR DORMITORY, IN ONE PLACE</span><img src="/images/qvick-iphone-mockup.png" alt="Qvick 앱의 시작 화면과 프로필 화면을 담은 iPhone 목업" /></div><a className="landing-hero-ribbon" href="#features">Qvick 살펴보기 <span aria-hidden="true">→</span></a></div></Reveal>
        </section>

        <section className="landing-intro" aria-label="Qvick 소개">
          <Reveal><p className="landing-eyebrow">EVERYDAY, MADE CLEAR</p><h2>매일 반복되는 작은 일들을,<br /><strong>더 쉽고 분명하게.</strong></h2></Reveal>
          <Reveal delayed><p>기숙사 생활에는 확인할 것이 많습니다. Qvick은 학생과 운영진이 서로 필요한 정보를 빠르게 확인하고, 일상에 집중할 수 있도록 돕습니다.</p></Reveal>
        </section>

        <section className="landing-features" id="features" aria-labelledby="features-title">
          <Reveal><div className="landing-section-heading"><p className="landing-eyebrow">ONE APP, THREE ESSENTIALS</p><h2 id="features-title">필요한 순간에,<br />필요한 기능만.</h2></div></Reveal>
          <div className="landing-feature-list">
            {FEATURES.map((feature, index) => (
              <Reveal delayed={index > 0} key={feature.number}>
                <article className={`landing-feature-panel is-${feature.type}`}>
                  <div className="landing-feature-copy"><p><span>{feature.number}</span>{feature.label}</p><h3>{feature.title}</h3><div className="landing-feature-rule" /><span className="landing-feature-description">{feature.description}</span></div>
                  <FeatureVisual type={feature.type} />
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="landing-flow" aria-labelledby="flow-title">
          <Reveal><p className="landing-eyebrow">A CALMER DAILY RHYTHM</p><h2 id="flow-title">하루의 시작부터 끝까지,<br />필요한 정보는 가까이에.</h2></Reveal>
          <div className="landing-flow-grid">
            <Reveal><div className="landing-flow-item"><span>01</span><h3>오늘을 확인하고</h3><p>일정과 공지로 하루에 필요한 내용을 먼저 살펴봅니다.</p></div></Reveal>
            <Reveal delayed><div className="landing-flow-item"><span>02</span><h3>필요한 일을 마치고</h3><p>QR 출석처럼 꼭 해야 하는 일을 빠르게 처리합니다.</p></div></Reveal>
            <Reveal delayed><div className="landing-flow-item"><span>03</span><h3>내일을 준비합니다</h3><p>쌓인 안내와 변경된 일정을 놓치지 않고 확인합니다.</p></div></Reveal>
          </div>
        </section>

        <section className="landing-closing" aria-labelledby="closing-title">
          <Reveal><p className="landing-eyebrow">WITH QVICK</p><h2 id="closing-title">기숙사 생활을<br /><strong>조금 더 가볍게.</strong></h2></Reveal>
          <Reveal delayed><p>필요한 기능을 필요한 순간에. Qvick과 함께 더 편안한 일상을 시작하세요.</p></Reveal>
        </section>
      </main>

      <footer className="landing-footer">
        <Link className="landing-brand" to="/" aria-label="Qvick 홈"><img src="/qvick.svg" alt="" /><span>Qvick</span></Link>
        <div className="landing-footer-links"><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link></div>
        <p>© 2026 Qvick. All rights reserved.</p>
      </footer>
    </div>
  );
}
