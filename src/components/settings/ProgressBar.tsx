interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const indeterminate = total === 0;

  return (
    <div>
      <div className="settings-progress-container">
        <div
          className={`settings-progress-bar${indeterminate ? ' settings-progress-bar--indeterminate' : ''}`}
          style={{ width: indeterminate ? '100%' : `${percent}%` }}
        />
      </div>
      <div className="settings-progress-row">
        <span className="settings-progress-text">{label ?? (indeterminate ? 'Processing...' : `${current}/${total}`)}</span>
        {!indeterminate && <span className="settings-progress-text">{percent}%</span>}
      </div>
    </div>
  );
}
