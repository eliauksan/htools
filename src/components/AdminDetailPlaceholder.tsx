import type { AriaRole, ReactNode } from "react";

export default function AdminDetailPlaceholder({
  children,
  className = "",
  icon,
  role
}: {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  role?: AriaRole;
}) {
  return (
    <div className={`admin-detail-placeholder ${className}`.trim()} role={role}>
      {icon}
      <span>{children}</span>
    </div>
  );
}
