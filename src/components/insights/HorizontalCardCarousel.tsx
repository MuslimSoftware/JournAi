import type { ReactNode } from 'react';
import { Text } from '../themed';

interface HorizontalCardCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
}

export default function HorizontalCardCarousel<T>({
  items,
  renderItem,
  emptyMessage = 'No items to display',
}: HorizontalCardCarouselProps<T>) {

  if (items.length === 0) {
    return (
      <div
        className="horizontal-carousel-empty"
        style={{
          padding: '24px 16px',
          textAlign: 'center',
        }}
      >
        <Text variant="muted" style={{ fontSize: '0.875rem' }}>
          {emptyMessage}
        </Text>
      </div>
    );
  }

  return (
    <div className="horizontal-carousel">
      {items.map((item, index) => (
        <div key={index} className="carousel-card">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
