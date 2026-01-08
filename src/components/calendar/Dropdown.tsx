import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface DropdownOption<T> {
  value: T;
  label: string;
}

interface DropdownProps<T> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function Dropdown<T>({ options, value, onChange, className = '' }: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeItem = dropdownRef.current.querySelector('.active');
      activeItem?.scrollIntoView({ block: 'center' });
    }
  }, [isOpen]);

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="calendar-dropdown-container" ref={containerRef}>
      <button
        className="calendar-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="calendar-dropdown-text">{selectedOption?.label}</span>
        <FiChevronDown size={18} className="calendar-dropdown-arrow" />
      </button>
      {isOpen && (
        <div className={`calendar-dropdown ${className}`} ref={dropdownRef}>
          {options.map((option, index) => (
            <button
              key={index}
              className={`calendar-dropdown-item ${option.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
