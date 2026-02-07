import { IoCheckmarkCircle } from 'react-icons/io5';

interface ResultItem {
  label: string;
  className?: string;
}

interface ResultGridProps {
  items: ResultItem[];
}

export default function ResultGrid({ items }: ResultGridProps) {
  return (
    <div className="settings-result-grid">
      {items.map((item) => (
        <div key={item.label} className={`settings-result-grid__item ${item.className ?? ''}`}>
          <span className="settings-result-grid__icon">
            <IoCheckmarkCircle size={14} />
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
