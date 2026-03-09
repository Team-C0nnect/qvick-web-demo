import { useDemoMode } from './DemoContext';
import '../styles/DemoBanner.css';

export default function DemoBanner() {
  const { isDemo, exitDemo } = useDemoMode();

  if (!isDemo) return null;

  return (
    <div className="demo-banner">
      <span className="demo-banner-badge">DEMO</span>
      <span className="demo-banner-text">데모 모드로 보고 있습니다 — 실제 데이터가 아닙니다</span>
      <button className="demo-banner-exit" onClick={exitDemo}>
        나가기
      </button>
    </div>
  );
}
