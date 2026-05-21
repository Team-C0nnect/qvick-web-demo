import '../styles/Skeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  className = ''
}: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

// 테이블 행 스켈레톤
export function TableRowSkeleton({ columns = 10 }: { columns?: number }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton height="16px" width={i === 0 ? '50px' : i === 2 ? '60px' : '80%'} />
        </td>
      ))}
    </tr>
  );
}

// 인원 확인 테이블 스켈레톤
export function CheckTableSkeleton() {
  return (
    <div className="check-skeleton">
      <div className="skeleton-controls">
        <Skeleton width="300px" height="40px" borderRadius="8px" />
        <div className="skeleton-stats">
          <Skeleton width="100px" height="36px" borderRadius="8px" />
          <Skeleton width="100px" height="36px" borderRadius="8px" />
          <Skeleton width="100px" height="36px" borderRadius="8px" />
          <Skeleton width="80px" height="36px" borderRadius="8px" />
        </div>
      </div>
      <div className="skeleton-filters">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-filter-group">
            <Skeleton width="60px" height="16px" />
            <div className="skeleton-filter-buttons">
              <Skeleton width="50px" height="32px" borderRadius="6px" />
              <Skeleton width="50px" height="32px" borderRadius="6px" />
              <Skeleton width="50px" height="32px" borderRadius="6px" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} width={i === 0 ? '60px' : '80px'} height="16px" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-table-row">
            {Array.from({ length: 10 }).map((_, j) => (
              <Skeleton key={j} width={j === 0 ? '50px' : j === 1 ? '20px' : '70px'} height="14px" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 공지사항 카드 스켈레톤
export function NoticeCardSkeleton() {
  return (
    <div className="notice-card-skeleton">
      <div className="skeleton-card-header">
        <div className="skeleton-notice-badges">
          <Skeleton width="52px" height="24px" borderRadius="12px" />
          <Skeleton width="92px" height="24px" borderRadius="12px" />
        </div>
        <Skeleton width="28px" height="28px" borderRadius="8px" />
      </div>
      <Skeleton width="88%" height="24px" className="skeleton-title" />
      <Skeleton width="62%" height="18px" />
      <div className="skeleton-notice-card-footer">
        <Skeleton width="64px" height="14px" />
        <Skeleton width="104px" height="14px" />
      </div>
    </div>
  );
}

// 공지사항 그리드 스켈레톤
export function NoticeGridSkeleton() {
  return (
    <div className="notice-skeleton">
      <div className="skeleton-notice-hero">
        <div>
          <Skeleton width="120px" height="16px" />
          <Skeleton width="150px" height="34px" className="skeleton-page-title" />
          <Skeleton width="310px" height="18px" />
        </div>
        <Skeleton width="112px" height="40px" borderRadius="8px" />
      </div>

      <div className="skeleton-notice-toolbar">
        <div className="skeleton-filter-section">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="64px" height="36px" borderRadius="8px" />
          ))}
        </div>
        <div className="skeleton-notice-summary">
          <Skeleton width="72px" height="32px" borderRadius="16px" />
          <Skeleton width="72px" height="32px" borderRadius="16px" />
          <Skeleton width="72px" height="32px" borderRadius="16px" />
        </div>
      </div>

      <div className="skeleton-notice-list-heading">
        <div>
          <Skeleton width="42px" height="14px" />
          <Skeleton width="96px" height="26px" className="skeleton-panel-title" />
        </div>
        <Skeleton width="88px" height="40px" borderRadius="8px" />
      </div>

      <div className="skeleton-notice-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <NoticeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// 대시보드 스켈레톤
export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-dashboard-hero">
        <div className="skeleton-welcome">
          <Skeleton width="120px" height="16px" />
          <Skeleton width="180px" height="34px" />
          <Skeleton width="260px" height="18px" />
        </div>
        <Skeleton width="98px" height="40px" borderRadius="8px" />
      </div>

      <div className="skeleton-dashboard-summary">
        <div className="skeleton-summary-top">
          <div>
            <Skeleton width="90px" height="16px" />
            <Skeleton width="88px" height="34px" className="skeleton-summary-rate" />
          </div>
          <Skeleton width="90px" height="30px" borderRadius="15px" />
        </div>
        <Skeleton width="100%" height="10px" borderRadius="999px" />
        <div className="skeleton-summary-meta">
          <Skeleton width="80px" height="14px" />
          <Skeleton width="100px" height="14px" />
        </div>
      </div>

      <div className="skeleton-dashboard-metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-dashboard-metric">
            <div className="skeleton-metric-top">
              <Skeleton width="52px" height="16px" />
              <Skeleton width="56px" height="14px" />
            </div>
            <Skeleton width="76px" height="30px" />
            <Skeleton width="100%" height="6px" borderRadius="999px" />
            <Skeleton width="34px" height="12px" />
          </div>
        ))}
      </div>

      <div className="skeleton-dashboard-grid">
        <div className="skeleton-dashboard-panel">
          <Skeleton width="64px" height="14px" />
          <Skeleton width="140px" height="26px" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-detail-row">
              <Skeleton width="120px" height="16px" />
              <Skeleton width="48px" height="24px" />
            </div>
          ))}
        </div>
        <div className="skeleton-dashboard-panel">
          <div className="skeleton-notice-heading">
            <div>
              <Skeleton width="110px" height="14px" />
              <Skeleton width="126px" height="26px" className="skeleton-panel-title" />
            </div>
            <Skeleton width="88px" height="40px" borderRadius="8px" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-notice-row">
              <Skeleton width="32px" height="32px" borderRadius="8px" />
              <Skeleton width="60%" height="16px" />
              <Skeleton width="86px" height="28px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
