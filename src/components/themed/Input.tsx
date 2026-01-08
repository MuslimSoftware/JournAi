import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ ...props }, ref) => {
    return (
      <input
        ref={ref}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
