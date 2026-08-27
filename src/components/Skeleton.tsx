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
const CHECK_DONUT_LEGEND_TONES = ['present', 'absent', 'late', 'sleepover'] as const;

export function CheckTableSkeleton({
  nightCard = false,
}: {
  nightCard?: boolean;
}) {
  const donutLegendCounts = nightCard ? [4, 2, 2] : [4, 2];

  return (
    <div className="check-skeleton">
      <div className="skeleton-donut-cards">
        {donutLegendCounts.map((count, cardIndex) => (
          <div key={cardIndex} className="skeleton-donut-card">
            <Skeleton width="110px" height="15px" />
            <div className="skeleton-donut-card-body">
              <div className="skeleton-donut-circle">
                <Skeleton width="100%" height="100%" borderRadius="50%" />
              </div>
              <div className="skeleton-legend">
                {Array.from({ length: count }).map((_, row) => (
                  <div key={row} className="skeleton-legend-row">
                    <span className="skeleton-legend-label">
                      <i
                        className={`skeleton-legend-dot ${
                          CHECK_DONUT_LEGEND_TONES[
                            row % CHECK_DONUT_LEGEND_TONES.length
                          ]
                        }`}
                      />
                      <Skeleton width="52px" height="13px" />
                    </span>
                    <Skeleton width="84px" height="13px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton-table-panel">
        <div className="skeleton-table-toolbar">
          <Skeleton width="100%" height="40px" borderRadius="8px" />
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
const DASHBOARD_LEGEND_TONES = ['present', 'absent', 'late', 'sleepover'] as const;

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-dashboard-header">
        <Skeleton width="120px" height="26px" borderRadius="8px" />
        <Skeleton width="280px" height="16px" />
      </div>

      <div className="skeleton-dashboard-section">
        <div className="skeleton-section-heading">
          <Skeleton width="150px" height="18px" />
          <Skeleton width="84px" height="28px" borderRadius="8px" />
        </div>
        <div className="skeleton-period-grid">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton-period-card">
              <Skeleton width="64px" height="15px" />
              <div className="skeleton-period-body">
                <div className="skeleton-period-donut">
                  <Skeleton width="100%" height="100%" borderRadius="50%" />
                  <div className="skeleton-donut-center">
                    <Skeleton width="26px" height="10px" />
                    <Skeleton width="40px" height="16px" />
                  </div>
                </div>
                <div className="skeleton-legend">
                  {DASHBOARD_LEGEND_TONES.map((tone) => (
                    <div key={tone} className="skeleton-legend-row">
                      <span className="skeleton-legend-label">
                        <i className={`skeleton-legend-dot ${tone}`} />
                        <Skeleton width="48px" height="13px" />
                      </span>
                      <Skeleton width="88px" height="13px" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-dashboard-section">
        <div className="skeleton-section-heading">
          <Skeleton width="60px" height="18px" />
        </div>
        <div className="skeleton-quick-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-quick-card">
              <Skeleton width="40px" height="40px" borderRadius="10px" />
              <div className="skeleton-quick-text">
                <Skeleton width="84px" height="15px" />
                <Skeleton width="90%" height="13px" />
              </div>
              <Skeleton width="6px" height="16px" borderRadius="3px" />
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-dashboard-section">
        <div className="skeleton-section-heading">
          <Skeleton width="110px" height="18px" />
          <Skeleton width="76px" height="28px" borderRadius="8px" />
        </div>
        <div className="skeleton-notice-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-notice-row">
              <Skeleton width="32px" height="32px" borderRadius="8px" />
              <Skeleton width="55%" height="15px" />
              <div className="skeleton-notice-meta">
                <Skeleton width="72px" height="12px" />
                <Skeleton width="54px" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
