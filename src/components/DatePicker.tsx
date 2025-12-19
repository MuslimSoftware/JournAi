import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { FiCalendar } from 'react-icons/fi';
import 'react-day-picker/style.css';
import '../styles/date-picker.css';

interface DatePickerSingleProps {
    mode: 'single';
    selected: Date;
    onSelect: (date: Date) => void;
    displayFormat?: string;
}

interface DatePickerRangeProps {
    mode: 'range';
    selected: { from: Date | undefined; to: Date | undefined } | undefined;
    onSelect: (range: { from: Date | undefined; to: Date | undefined } | undefined) => void;
    displayFormat?: string;
}

type DatePickerProps = (DatePickerSingleProps | DatePickerRangeProps) & {
    className?: string;
};

export function DatePicker(props: DatePickerProps) {
    const { mode, selected, onSelect, displayFormat = 'MMM d, yyyy', className } = props;
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (value: Date | { from: Date | undefined; to: Date | undefined } | undefined) => {
        if (mode === 'single' && value instanceof Date) {
            (onSelect as DatePickerSingleProps['onSelect'])(value);
            setIsOpen(false);
        } else if (mode === 'range') {
            (onSelect as DatePickerRangeProps['onSelect'])(value as { from: Date | undefined; to: Date | undefined } | undefined);
        }
    };

    const getDisplayText = () => {
        if (mode === 'single') {
            return format(selected as Date, displayFormat);
        } else {
            const range = selected as { from: Date | undefined; to: Date | undefined } | undefined;
            if (!range?.from) return 'Select dates';
            if (!range.to) return format(range.from, displayFormat);
            return `${format(range.from, 'MMM d')} - ${format(range.to, displayFormat)}`;
        }
    };

    return (
        <div className={`date-picker-container ${className || ''}`} ref={containerRef}>
            <button
                className="date-picker-trigger"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <FiCalendar size={14} />
                <span>{getDisplayText()}</span>
            </button>
            {isOpen && (
                <div className="date-picker-dropdown">
                    {mode === 'single' ? (
                        <DayPicker
                            mode="single"
                            selected={selected as Date}
                            onSelect={handleSelect as (date: Date | undefined) => void}
                            defaultMonth={selected as Date}
                        />
                    ) : (
                        <DayPicker
                            mode="range"
                            selected={selected as { from: Date | undefined; to: Date | undefined }}
                            onSelect={handleSelect as (range: { from: Date | undefined; to: Date | undefined } | undefined) => void}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
