import './Skeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', className }: SkeletonProps) {
  return (
    <span
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function MetricRowSkeleton() {
  return (
    <div className="skeleton-metrics" role="status" aria-label="Loading report">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="skeleton-metric">
          <Skeleton width="40%" height="0.7rem" />
          <Skeleton width="70%" height="1.6rem" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = '280px' }: { height?: string }) {
  return (
    <div className="skeleton-chart" role="status" aria-label="Loading chart">
      <Skeleton width="35%" height="1.05rem" />
      <Skeleton width="55%" height="0.8rem" />
      <Skeleton width="100%" height={height} className="skeleton--block" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-table" role="status" aria-label="Loading table">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-table__row">
          <Skeleton width="18%" height="0.8rem" />
          <Skeleton width="42%" height="0.8rem" />
          <Skeleton width="15%" height="0.8rem" />
        </div>
      ))}
    </div>
  );
}
