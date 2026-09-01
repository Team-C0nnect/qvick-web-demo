import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SplashCursor from '../components/SplashCursor';
import '../styles/Landing.css';

const STORE_LINKS = [
  {
    name: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=com.hs.dgsw.v3.qvick&pcampaignid=web_share'.trim(),
    badgeSrc: '/store-badges/google-play.svg',
    badgeAlt: 'Google Play에서 다운로드',
  },
  {
    name: 'App Store',
    url: 'https://apps.apple.com/us/app/%ED%81%90%EB%B9%85-%EC%8A%A4%EB%A7%88%ED%8A%B8-%EA%B8%B0%EC%88%99%EC%82%AC-%EA%B4%80%EB%A6%AC-%ED%94%8C%EB%9E%AB%ED%8F%BC/id6756354850'.trim(),
    badgeSrc: '/store-badges/app-store.svg',
    badgeAlt: 'App Store에서 다운로드',
  },
] as const;

const FAQS = [
  {
    question: 'Qvick은 어떤 서비스인가요?',
    answer:
      'Qvick은 기숙사 생활에 필요한 출석, 공지, 일정 등 다양한 기능을 한곳에서 이용할 수 있는 온라인 기숙사 관리 서비스입니다.',
  },
  {
    question: 'Qvick은 누가 사용할 수 있나요?',
    answer:
      'Qvick을 도입한 학교의 기숙사 학생과 담당 교사 및 사감 선생님이 사용할 수 있습니다. 학교에서 안내받은 계정으로 로그인해 주세요.',
  },
  {
    question: '출석은 어떻게 확인하나요?',
    answer:
      'Qvick에서 제공하는 출석 기능을 통해 간편하게 출석할 수 있습니다. 출석 가능 시간과 방식은 각 기숙사의 운영 정책에 따라 달라질 수 있습니다.',
  },
  {
    question: '공지사항과 일정은 어디에서 확인하나요?',
    answer:
      'Qvick에서 기숙사 공지사항과 주요 일정을 한눈에 확인할 수 있습니다. 새로운 공지나 중요한 변경 사항도 빠르게 확인할 수 있습니다.',
  },
  {
    question: '서비스 이용 중 문제가 발생하면 어떻게 하나요?',
    answer:
      '계정이나 기숙사 운영과 관련된 문제는 Team Connect에게 문의해 주세요.',
  },
] as const;

function Reveal({
  children,
  delayed = false,
}: {
  children: ReactNode;
  delayed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      element?.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      },
      { threshold: 0.16 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`landing-reveal${delayed ? ' is-delayed' : ''}`}>
      {children}
    </div>
  );
}

function StoreBadge({
  name,
  url,
  badgeSrc,
  badgeAlt,
}: (typeof STORE_LINKS)[number]) {
  const badge = <img src={badgeSrc} alt={badgeAlt} />;
  if (!url)
    return (
      <div
        className="landing-store-badge is-unavailable"
        aria-label={`${name} 출시 준비 중`}
      >
        {badge}
        <span>출시 준비 중</span>
      </div>
    );
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
  const pageRef = useRef<HTMLDivElement>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    const page = pageRef.current;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!page || !finePointer.matches || reducedMotion.matches) return;

    let animationFrame: number | undefined;
    let pointerPosition = { x: -400, y: -400 };

    const updatePointerSpotlight = () => {
      page.style.setProperty('--landing-pointer-x', `${pointerPosition.x}px`);
      page.style.setProperty('--landing-pointer-y', `${pointerPosition.y}px`);
      animationFrame = undefined;
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerPosition = { x: event.clientX, y: event.clientY };
      if (animationFrame !== undefined) return;
      animationFrame = window.requestAnimationFrame(updatePointerSpotlight);
    };

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    return () => {
      if (animationFrame !== undefined)
        window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div ref={pageRef} className="landing-page">
      <SplashCursor
        className="landing-splash-cursor"
        SIM_RESOLUTION={64}
        DYE_RESOLUTION={512}
        DENSITY_DISSIPATION={2.8}
        VELOCITY_DISSIPATION={2.4}
        PRESSURE_ITERATIONS={12}
        CURL={4}
        SPLAT_RADIUS={0.16}
        SPLAT_FORCE={3000}
        SHADING={false}
        RAINBOW_MODE={false}
        COLOR="#f2ebff"
      />
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Qvick 홈">
          <img src="/qvick.svg" alt="" />
          <span>Qvick</span>
        </Link>
        <Link className="landing-login-link" to="/login">
          Qvick Teacher <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <Reveal>
            <div className="landing-hero-copy">
              {/* <p className="landing-eyebrow">DORMITORY LIFE, SIMPLIFIED</p> */}
              <h1 id="landing-title">
                기숙사 생활을<strong>더 스마트하게.</strong>
              </h1>
              <p className="landing-description">
                출석부터 일정, 공지 확인까지. Qvick은 기숙사에서 필요한 일상을
                한곳에 모아두었습니다.
              </p>
              <div
                className="landing-store-list"
                aria-label="Qvick 앱 다운로드"
              >
                {STORE_LINKS.map((store) => (
                  <StoreBadge key={store.name} {...store} />
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delayed>
            <div className="landing-hero-art">
              <img
                src="/images/qvick-iphone-mockup.png"
                alt="Qvick 앱의 시작 화면과 프로필 화면을 담은 iPhone 목업"
              />
            </div>
          </Reveal>
        </section>

        <section className="landing-faq" aria-labelledby="faq-title">
          <Reveal>
            <div className="landing-faq-heading">
              <p className="landing-eyebrow">FAQ</p>
              <h2 id="faq-title">자주 묻는 질문</h2>
              <p>Qvick 이용 전 알아두면 좋은 내용을 모았습니다.</p>
            </div>
          </Reveal>
          <div className="landing-faq-list">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              const answerId = `faq-answer-${index}`;

              return (
                <Reveal delayed={index > 0} key={faq.question}>
                  <div className="landing-faq-item">
                    <button
                      className={`landing-faq-button${isOpen ? ' is-open' : ''}`}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    >
                      <span>{faq.question}</span>
                      <b aria-hidden="true">+</b>
                    </button>
                    {isOpen && (
                      <p id={answerId} className="landing-faq-answer">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                </Reveal>
              );
            })}
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
