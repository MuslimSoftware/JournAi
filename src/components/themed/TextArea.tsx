import { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ ...props }, ref) => {
    return (
      <textarea
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

TextArea.displayName = 'TextArea';

export default TextArea;
