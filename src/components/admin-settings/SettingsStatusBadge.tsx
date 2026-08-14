export function SettingsStatusBadge({
  ariaDescribedBy,
  disabled = false,
  disabledLabel,
  enabled,
  enabledLabel,
  onChange
}: {
  ariaDescribedBy?: string;
  disabled?: boolean;
  disabledLabel: string;
  enabled: boolean;
  enabledLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button aria-checked={enabled}
      aria-describedby={ariaDescribedBy}
      aria-label={enabled ? enabledLabel : disabledLabel}
      aria-live="polite"
      className={`settings-status-switch ${disabled ? "is-disabled" : ""}`.trim()}
      data-state={enabled ? "enabled" : "disabled"}
      disabled={disabled}
      role="switch"
      type="button"
      onClick={() => onChange(!enabled)}
    >
      <span className="settings-status-switch-label">
        {enabled ? enabledLabel : disabledLabel}
      </span>
      <span aria-hidden="true" className="settings-status-switch-track">
        <span className="settings-status-switch-thumb" />
      </span>
    </button>
  );
}
