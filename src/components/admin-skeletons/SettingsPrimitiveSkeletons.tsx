import type { ReactNode } from "react";

export function AdminSettingsHeadingSkeleton({
  className = "",
  withStatus = false
}: {
  className?: string;
  withStatus?: boolean;
}) {
  return (
    <div
      className={`admin-settings-heading-skeleton ${className} ${
        withStatus ? "has-status" : ""
      }`.trim()}
    >
      <span className="skeleton-shimmer skeleton-line is-medium" />
      {withStatus ? (
        <span className="skeleton-shimmer settings-status-switch-skeleton" />
      ) : null}
      <span className="skeleton-shimmer skeleton-line is-long" />
    </div>
  );
}

export function AdminSettingsFieldSkeleton({
  className = "",
  textareaClassName = ""
}: {
  className?: string;
  textareaClassName?: string;
}) {
  const isTextarea = Boolean(textareaClassName);

  return (
    <div className={`admin-settings-field-skeleton ${className}`.trim()}>
      <span className="skeleton-shimmer skeleton-line is-short" />
      <span
        className={`skeleton-shimmer ${
          isTextarea ? textareaClassName : "admin-settings-input-skeleton"
        }`.trim()}
      />
    </div>
  );
}

export function AdminSettingsActionsSkeleton({
  className = "source-public-actions",
  count = 2
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          className={`skeleton-shimmer admin-settings-button-skeleton ${
            index > 0 ? "is-secondary" : ""
          }`.trim()}
          key={index}
        />
      ))}
    </div>
  );
}

export function AdminStatsSkeleton({
  className,
  labels
}: {
  className: string;
  labels: string[];
}) {
  return (
    <div className={className}>
      {labels.map((label) => (
        <div key={label}>
          <span className="skeleton-shimmer admin-stat-label-skeleton">{label}</span>
          <span className="skeleton-shimmer admin-stat-value-skeleton" />
        </div>
      ))}
    </div>
  );
}

export function AdminSettingsTextMask({ children }: { children: ReactNode }) {
  return (
    <span className="skeleton-shimmer admin-settings-text-mask">
      {children}
    </span>
  );
}

export function AdminSettingsCopySkeleton({
  className = "",
  description,
  title,
  withStatus = false,
  wrapTitle = false
}: {
  className?: string;
  description: string;
  title: string;
  withStatus?: boolean;
  wrapTitle?: boolean;
}) {
  const titleNode = (
    <h3><AdminSettingsTextMask>{title}</AdminSettingsTextMask></h3>
  );

  return (
    <div
      className={`admin-settings-copy-skeleton ${className} ${
        withStatus ? "has-status" : ""
      }`.trim()}
    >
      {wrapTitle ? <div>{titleNode}</div> : titleNode}
      {withStatus ? (
        <span className="skeleton-shimmer settings-status-switch-skeleton" />
      ) : null}
      <p><AdminSettingsTextMask>{description}</AdminSettingsTextMask></p>
    </div>
  );
}
