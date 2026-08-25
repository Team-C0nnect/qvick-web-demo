import { useEffect, useState } from 'react';
import { QvickLogoIcon } from './Icons';
import '../styles/IntroAnimation.css';

export default function IntroAnimation() {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const leaveTimerId = window.setTimeout(() => setIsLeaving(true), 1400);
    const doneTimerId = window.setTimeout(() => setIsDone(true), 1800);

    return () => {
      window.clearTimeout(leaveTimerId);
      window.clearTimeout(doneTimerId);
    };
  }, []);

  if (isDone) return null;

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
      </div>
    </div>
  );
}
