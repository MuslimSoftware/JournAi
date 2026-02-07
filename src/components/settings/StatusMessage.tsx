import { IoCheckmarkCircle, IoAlertCircle, IoInformationCircle, IoWarning } from 'react-icons/io5';

type StatusVariant = 'success' | 'warning' | 'error' | 'info';

interface StatusMessageProps {
  variant: StatusVariant;
  children: React.ReactNode;
}

const ICONS: Record<StatusVariant, React.ReactNode> = {
  success: <IoCheckmarkCircle size={14} />,
  warning: <IoWarning size={14} />,
  error: <IoAlertCircle size={14} />,
  info: <IoInformationCircle size={14} />,
};

export default function StatusMessage({ variant, children }: StatusMessageProps) {
  return (
    <div className={`settings-status settings-status--${variant}`}>
      <span className="settings-status__icon">{ICONS[variant]}</span>
      <span>{children}</span>
    </div>
  );
}
