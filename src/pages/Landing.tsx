import { Link } from 'react-router-dom';
import '../styles/Landing.css';

const STORE_LINKS = [
  {
    name: 'Google Play',
    url: import.meta.env.VITE_GOOGLE_PLAY_URL?.trim(),
    badgeSrc: '/store-badges/google-play.svg',
    badgeAlt: 'Google Play에서 다운로드',
  },
  {
    name: 'App Store',
    url: import.meta.env.VITE_APP_STORE_URL?.trim(),
    badgeSrc: '/store-badges/app-store.svg',
    badgeAlt: 'App Store에서 다운로드',
  },
] as const;

const FEATURES = [
  {
    number: '01',
    title: 'QR로 빠르게 출석',
    description: '복잡한 절차 없이 QR을 스캔하고, 오늘의 출석을 간편하게 완료하세요.',
    icon: '⌁',
  },
  {
    number: '02',
    title: '한눈에 보는 일정',
    description: '출석 일정과 기숙사 주요 일정을 한곳에서 확인할 수 있어요.',
    icon: '◫',
  },
  {
    number: '03',
    title: '놓치지 않는 공지',
    description: '중요한 기숙사 안내를 앱에서 빠르게 확인하고 일상을 준비하세요.',
    icon: '✦',
  },
] as const;

function StoreBadge({
  name,
  url,
  badgeSrc,
  badgeAlt,
}: (typeof STORE_LINKS)[number]) {
  const badge = <img src={badgeSrc} alt={badgeAlt} />;

  if (!url) {
    return (
      <div className="landing-store-badge is-unavailable" aria-label={`${name} 출시 준비 중`}>
        {badge}
        <span>출시 준비 중</span>
      </div>
    );
  }

  return (
    <a
      className="landing-store-badge"
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${name}에서 Qvick 다운로드`}
    >
      {badge}
    </a>
  );
}

export default function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Qvick 홈">
          <img src="/qvick.svg" alt="" />
          <span>Qvick</span>
        </Link>
        <Link className="landing-login-link" to="/login">
          운영 화면 로그인
          <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">DORMITORY LIFE, MADE SIMPLE</p>
            <h1 id="landing-title">
              기숙사 생활의 모든 순간을
              <strong>더 가볍고 빠르게.</strong>
            </h1>
            <p className="landing-description">
              출석부터 일정, 공지 확인까지. Qvick과 함께 더 편안한 기숙사 생활을 시작하세요.
            </p>
            <a className="landing-primary-link" href="#download">
              앱 다운로드하기 <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="landing-phone-stage" aria-hidden="true">
            <div className="landing-orbit landing-orbit-one" />
            <div className="landing-orbit landing-orbit-two" />
            <div className="landing-phone">
              <div className="landing-phone-speaker" />
              <div className="landing-phone-screen">
                <div className="landing-phone-appbar">
                  <img src="/qvick.svg" alt="" />
                  <span>Qvick</span>
                  <i />
                </div>
                <p className="landing-phone-greeting">좋은 저녁이에요,</p>
                <h2>오늘도 반가워요!</h2>
                <div className="landing-phone-card">
                  <span>오늘의 출석</span>
                  <strong>출석 체크하기</strong>
                  <b>→</b>
                </div>
                <div className="landing-phone-schedule">
                  <span>오늘의 일정</span>
                  <strong>20:00 · 점호 시간</strong>
                </div>
                <div className="landing-phone-nav">
                  <i />
                  <i className="is-active" />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features" aria-labelledby="features-title">
          <div className="landing-section-heading">
            <p>EVERYDAY WITH QVICK</p>
            <h2 id="features-title">필요한 순간에, 필요한 기능만.</h2>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <article className="landing-feature-card" key={feature.number}>
                <div className="landing-feature-topline">
                  <span>{feature.number}</span>
                  <b aria-hidden="true">{feature.icon}</b>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-download" id="download" aria-labelledby="download-title">
          <div>
            <p className="landing-eyebrow">GET STARTED WITH QVICK</p>
            <h2 id="download-title">지금 Qvick을 만나보세요.</h2>
            <p>더 편리한 기숙사 생활, 앱 하나로 시작할 수 있어요.</p>
          </div>
          <div className="landing-store-list">
            {STORE_LINKS.map((store) => (
              <StoreBadge key={store.name} {...store} />
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <Link className="landing-brand" to="/" aria-label="Qvick 홈">
          <img src="/qvick.svg" alt="" />
          <span>Qvick</span>
        </Link>
        <div className="landing-footer-links">
          <Link to="/terms">이용약관</Link>
          <Link to="/privacy">개인정보처리방침</Link>
        </div>
        <p>© 2026 Qvick. All rights reserved.</p>
      </footer>
    </div>
  );
}
