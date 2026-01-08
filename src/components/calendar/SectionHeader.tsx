import { Text } from '../themed';

type IndicatorType = 'entry' | 'sticky-note' | 'todo';

interface SectionHeaderProps {
  title: string;
  indicatorType: IndicatorType;
}

export default function SectionHeader({ title, indicatorType }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <span className={`section-indicator ${indicatorType}-indicator`} />
      <Text as="h4" variant="secondary">{title}</Text>
    </div>
  );
}
