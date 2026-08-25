import { useEffect, useState } from 'react';
import { QvickLogoIcon } from './Icons';
import '../styles/IntroAnimation.css';

const INTRO_STORAGE_KEY = 'qvick-intro-played';
const TAGLINE = '기숙사 관리 플랫폼';
const TYPING_START_DELAY = 1200;

// 타닥타닥 타이핑 리듬: 글자마다 미세한 딜레이 편차, 띄어쓰기에서 살짝 긴 호흡
const getTypingDelay = (index: number): number => {
  const base = 170 + Math.random() * 80;
  return index > 0 && TAGLINE[index] === ' ' ? base + 90 : base;
};

function hasIntroPlayed(): boolean {
  try {
    return sessionStorage.getItem(INTRO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
  } catch {
    // 저장소 접근이 불가능해도 인트로 재생에는 문제 없음
  }
}

// React 마운트 전에 플래그를 확정해 새로고침 시 재생을 확실히 막는다
if (!hasIntroPlayed()) {
  markIntroPlayed();
}

export default function IntroAnimation() {
  const [isVisible, setIsVisible] = useState(() => !hasIntroPlayed());
  const [isLeaving, setIsLeaving] = useState(false);
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;
    let timerId: number;

    const typeNext = (count: number) => {
      if (cancelled || count >= TAGLINE.length) return;
      timerId = window.setTimeout(() => {
        if (cancelled) return;
        setTypedCount(count + 1);
        typeNext(count + 1);
      }, getTypingDelay(count));
    };

    timerId = window.setTimeout(() => typeNext(0), TYPING_START_DELAY);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [isVisible]);

  useEffect(() => {
    if (typedCount !== TAGLINE.length) return;

    const leaveId = window.setTimeout(() => setIsLeaving(true), 900);
    return () => window.clearTimeout(leaveId);
  }, [typedCount]);

  useEffect(() => {
    if (!isLeaving) return;

    const doneId = window.setTimeout(() => setIsVisible(false), 550);
    return () => window.clearTimeout(doneId);
  }, [isLeaving]);

  if (!isVisible) return null;

  const isTypingDone = typedCount === TAGLINE.length;

  return (
    <div
      className={`intro-animation ${isLeaving ? 'leaving' : ''}`}
      aria-hidden="true"
    >
      <div className="intro-animation-stage">
        <div className="intro-animation-logo">
          <QvickLogoIcon />
        </div>
        <div className="intro-animation-shadow" />
        <p
          className={`intro-animation-tagline ${isTypingDone ? 'done' : ''}`}
        >
          {TAGLINE.slice(0, typedCount)}
          <span className="intro-animation-cursor" />
        </p>
      </div>
    </div>
  );
}
