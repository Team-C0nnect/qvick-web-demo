import { useEffect, useState } from 'react';
import '../styles/RollingNumber.css';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function RollingDigits({ text }: { text: string }) {
  return (
    <span className="rolling-digits">
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

  useEffect(() => {
    const timerId = window.setTimeout(() => setDisplay(value), 50);
    return () => window.clearTimeout(timerId);
  }, [value]);

  return <RollingDigits text={String(display)} />;
}
