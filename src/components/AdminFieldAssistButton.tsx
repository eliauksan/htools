import type { ReactNode } from "react";

export default function AdminFieldAssistButton({
  busy = false,
  className = "",
  disabled = false,
  icon,
  label,
  mobileLabel,
  onClick,
  onUnavailable,
  title,
  unavailable = false,
  unavailableTitle
}: {
  busy?: boolean;
  className?: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  mobileLabel: string;
  onClick: () => void;
  onUnavailable?: () => void;
  title?: string;
  unavailable?: boolean;
  unavailableTitle?: string;
}) {
  const buttonTitle = unavailable && unavailableTitle
    ? unavailableTitle
    : title || label;

  return (
    <button
      aria-busy={busy || undefined}
      aria-disabled={unavailable || undefined}
      aria-label={buttonTitle}
      className={`ghost-button tool-editor-action-button field-assist-button has-mobile-label ${className}`.trim()}
      disabled={disabled || busy}
      title={buttonTitle}
      type="button"
      onClick={() => {
        if (unavailable) {
          onUnavailable?.();
          return;
        }
        onClick();
      }}
    >
      <span aria-hidden="true" className="field-assist-button-icon">{icon}</span>
      <span className="field-assist-button-label">{label}</span>
      <span aria-hidden="true" className="field-assist-button-mobile-label">
        {mobileLabel}
      </span>
    </button>
  );
}
