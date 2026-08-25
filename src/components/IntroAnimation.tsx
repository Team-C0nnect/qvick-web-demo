import { useEffect, useState } from 'react';
import { QvickLogoIcon } from './Icons';
import '../styles/IntroAnimation.css';

const INTRO_STORAGE_KEY = 'qvick-intro-played';
const TAGLINE = '기숙사 관리 플랫폼';
const TYPING_START_DELAY = 1300;
const TYPING_INTERVAL = 90;

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

export default function IntroAnimation() {
  const [isVisible, setIsVisible] = useState(() => !hasIntroPlayed());
  const [isLeaving, setIsLeaving] = useState(false);
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    markIntroPlayed();

    let typingIntervalId: number | undefined;
    const typingStartId = window.setTimeout(() => {
      typingIntervalId = window.setInterval(() => {
        setTypedCount((count) => Math.min(count + 1, TAGLINE.length));
      }, TYPING_INTERVAL);
    }, TYPING_START_DELAY);

    return () => {
      window.clearTimeout(typingStartId);
      if (typingIntervalId !== undefined) {
        window.clearInterval(typingIntervalId);
      }
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
