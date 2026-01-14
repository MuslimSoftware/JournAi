import '../../styles/themed.css';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
}

export default function RadioGroup({ options, value, onChange, name }: RadioGroupProps) {
  return (
    <div className="radio-group">
      {options.map((option) => {
        const isSelected = value === option.value;
        const optionClass = `radio-group__option${isSelected ? ' radio-group__option--selected' : ''}`;
        const labelClass = `radio-group__label${option.description ? ' radio-group__label--with-description' : ''}`;

        return (
          <label key={option.value} className={optionClass}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="radio-group__input"
            />
            <div className="radio-group__content">
              <div className={labelClass}>{option.label}</div>
              {option.description && (
                <div className="radio-group__description">{option.description}</div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
