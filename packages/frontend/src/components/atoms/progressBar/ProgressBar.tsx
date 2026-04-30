import "./ProgressBar.css";

interface ProgressBarProps {
  value: number; // 0–1; values >1 indicate over-budget
}

export function ProgressBar({ value }: ProgressBarProps) {
  const fill = Math.min(value, 1) * 100;
  const isOver = value > 1;

  return (
    <div className="progress-bar">
      <div
        className={`progress-bar__fill${isOver ? " progress-bar__fill--over" : ""}`}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}
