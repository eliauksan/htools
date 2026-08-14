import { Send } from "lucide-react";

export function AdminTelegramPushButton({
  disabled,
  label,
  onClick
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="icon-button admin-telegram-button"
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Send size={15} />
    </button>
  );
}
