import "./ProgressBar.css";

interface ProgressBarProps {
  value: number; // 0–1; values >1 indicate over-budget
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const fill = Math.min(value, 1) * 100;
  const isOver = value > 1;
  const percent = Math.round(value * 100);

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      // aria-valuenow can't express over-100%; valuetext carries that state.
      aria-valuetext={`${percent}% of budget used${isOver ? ", over budget" : ""}`}
      aria-label={label}
    >
      <div
        className={`progress-bar__fill${isOver ? " progress-bar__fill--over" : ""}`}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}
