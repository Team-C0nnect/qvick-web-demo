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
        <Skeleton width="100px" height="14px" />
        <Skeleton width="18px" height="18px" borderRadius="4px" />
      </div>
      <Skeleton width="90%" height="20px" className="skeleton-title" />
      <Skeleton width="60px" height="14px" />
      <Skeleton width="120px" height="12px" />
    </div>
  );
}

// 공지사항 그리드 스켈레톤
export function NoticeGridSkeleton() {
  return (
    <div className="notice-skeleton">
      <Skeleton width="120px" height="32px" className="skeleton-page-title" />
      <div className="skeleton-filter-section">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="60px" height="32px" borderRadius="6px" />
        ))}
        <Skeleton width="200px" height="32px" borderRadius="6px" />
      </div>
      <div className="skeleton-tabs">
        <Skeleton width="60px" height="32px" />
        <Skeleton width="100px" height="32px" />
        <Skeleton width="100px" height="32px" />
      </div>
      <div className="skeleton-action-section">
        <Skeleton width="80px" height="28px" borderRadius="14px" />
        <Skeleton width="100px" height="36px" borderRadius="8px" />
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
      <div className="skeleton-welcome">
        <Skeleton width="200px" height="32px" />
        <Skeleton width="350px" height="18px" />
      </div>
      <div className="skeleton-quick-links">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-quick-link-card">
            <Skeleton width="48px" height="48px" borderRadius="12px" />
            <Skeleton width="80px" height="20px" />
            <Skeleton width="160px" height="14px" />
          </div>
        ))}
      </div>
      <div className="skeleton-stats-overview">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <Skeleton width="60px" height="14px" />
            <Skeleton width="80px" height="28px" />
          </div>
        ))}
      </div>
    </div>
  );
}
