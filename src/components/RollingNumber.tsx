import { useEffect, useState } from 'react';
import '../styles/RollingNumber.css';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const INITIAL_ROLL_DELAY = 50;
const INITIAL_ROLL_DURATION = 1800;

let hasPlayedInitialRoll = false;

export function RollingDigits({
  text,
  initial = false,
}: {
  text: string;
  initial?: boolean;
}) {
  return (
    <span
      className={`rolling-digits${initial ? ' rolling-digits-initial' : ''}`}
    >
      {text.split('').map((char, index) =>
        char >= '0' && char <= '9' ? (
          <span key={index} className="rolling-digit">
            <span
              className="rolling-digit-strip"
              style={{ transform: `translateY(-${Number(char)}em)` }}
            >
              {DIGITS.map((digit) => (
                <span key={digit}>{digit}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={index} className="rolling-digit-separator">
            {char}
          </span>
        ),
      )}
    </span>
  );
}

export function RollingNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const [isInitial, setIsInitial] = useState(!hasPlayedInitialRoll);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDisplay(value);
      hasPlayedInitialRoll = true;
    }, INITIAL_ROLL_DELAY);
    return () => window.clearTimeout(timerId);
  }, [value]);

  useEffect(() => {
    if (!isInitial) return;
    const timerId = window.setTimeout(
      () => setIsInitial(false),
      INITIAL_ROLL_DELAY + INITIAL_ROLL_DURATION,
    );
    return () => window.clearTimeout(timerId);
  }, [isInitial]);

  return (
    <RollingDigits
      text={String(display).padStart(String(value).length, '0')}
      initial={isInitial}
    />
  );
}
