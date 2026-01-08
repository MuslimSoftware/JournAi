import { FiPlus } from 'react-icons/fi';

interface AddItemButtonProps {
  label: string;
  onClick: () => void;
}

export default function AddItemButton({ label, onClick }: AddItemButtonProps) {
  return (
    <button className="add-item-button" onClick={onClick}>
      <FiPlus size={16} />
      <span>{label}</span>
    </button>
  );
}
