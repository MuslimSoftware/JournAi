import { ButtonHTMLAttributes } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import '../../styles/themed.css';

interface TrashButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  iconSize?: number;
  className?: string;
}

export default function TrashButton({
  label = 'Delete',
  size = 'sm',
  iconSize,
  className,
  disabled,
  ...props
}: TrashButtonProps) {
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const classes = ['trash-button', `size-${size}`, className].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...props}
    >
      <FiTrash2 size={iconSize ?? iconSizes[size]} />
    </button>
  );
}
