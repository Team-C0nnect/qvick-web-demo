import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import '../styles/DonutChart.css';

export interface DonutSegment {
  key: string;
  color: string;
  value: number;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DRAW_DURATION = 900;
const MIN_SEGMENT_RATIO = 0.03;

export default function DonutChart({
  segments,
  total,
  label = '비율',
  className = '',
  children,
}: {
  segments: DonutSegment[];
  total: number;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [isDrawn, setIsDrawn] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => setIsDrawn(true), 50);
    return () => window.clearTimeout(timerId);
  }, []);

  const adjustedRatios = segments.map(({ value }) =>
    value > 0 && total > 0 ? Math.max(value / total, MIN_SEGMENT_RATIO) : 0,
  );
  const ratioSum = adjustedRatios.reduce((sum, ratio) => sum + ratio, 0) || 1;

  let accumulated = 0;
  const rendered = segments.map((segment, index) => {
    const ratio = adjustedRatios[index] / ratioSum;
    const length = ratio * CIRCUMFERENCE;
    const style = {
      transitionDuration: `${Math.max(ratio * DRAW_DURATION, 1)}ms`,
      transitionDelay: `${(accumulated / CIRCUMFERENCE) * DRAW_DURATION}ms`,
    };
    accumulated += length;
    return { ...segment, length, offset: accumulated - length, style };
  });

  return (
    <div className={`donut-chart ${className}`.trim()}>
      <svg viewBox="0 0 100 100" role="img" aria-label={label}>
        <circle
          className="donut-chart-track"
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="11"
        />
        {rendered.map((segment) => (
          <circle
            key={segment.key}
            className="donut-chart-segment"
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={segment.color}
            strokeWidth="11"
            strokeDasharray={`${
              isDrawn ? segment.length : 0
            } ${CIRCUMFERENCE - (isDrawn ? segment.length : 0)}`}
            strokeDashoffset={-segment.offset}
            style={segment.style}
          />
        ))}
      </svg>
      {children && <div className="donut-chart-center">{children}</div>}
    </div>
  );
}
