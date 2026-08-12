import { Github } from "lucide-react";
import { formatGitHubCount, formatGitHubUpdatedAt } from "../admin-display";
import type { GitHubToolMetadata } from "../types";
import AdminDetailPlaceholder from "./AdminDetailPlaceholder";
import AdminFieldAssistButton from "./AdminFieldAssistButton";

type AdminGitHubMetadataDetailText = {
  empty: string;
  failed: string;
  forks: string;
  language: string;
  license: string;
  loading: string;
  stars: string;
  title: string;
  updatedAt: string;
};

export function AdminGitHubMetadataButton({
  disabled = false,
  label,
  mobileLabel,
  onClick,
  onUnavailable,
  unavailable = false,
  unavailableTitle
}: {
  disabled?: boolean;
  label: string;
  mobileLabel: string;
  onClick: () => void;
  onUnavailable?: () => void;
  unavailable?: boolean;
  unavailableTitle?: string;
}) {
  return (
    <AdminFieldAssistButton
      className="tool-github-metadata-button"
      disabled={disabled}
      icon={<Github size={16} />}
      label={label}
      mobileLabel={mobileLabel}
      onClick={onClick}
      onUnavailable={onUnavailable}
      unavailable={unavailable}
      unavailableTitle={unavailableTitle}
    />
  );
}

export function AdminGitHubMetadataCard({
  canLoad,
  detailText,
  failed,
  loading,
  metadata,
  previewLoading
}: {
  canLoad: boolean;
  detailText: AdminGitHubMetadataDetailText;
  failed: boolean;
  loading: boolean;
  metadata: GitHubToolMetadata | null;
  previewLoading: boolean;
}) {
  if (!canLoad && !metadata) return null;

  const detailItems = metadata
    ? [
        { label: detailText.stars, value: formatGitHubCount(metadata.stars) },
        { label: detailText.forks, value: formatGitHubCount(metadata.forks) },
        { label: detailText.language, value: metadata.language || "-" },
        { label: detailText.license, value: metadata.license || "-" },
        { label: detailText.updatedAt, value: formatGitHubUpdatedAt(metadata.updatedAt) || "-" }
      ]
    : [];

  return (
    <div
      className={`tool-form-field tool-github-detail-field ${metadata ? "" : "is-placeholder"}`.trim()}
    >
      <span className="tool-form-label">{detailText.title}</span>
      <section className="tool-github-detail-card">
        {metadata ? (
          <>
            <div className="tool-github-detail-repo">
              <Github size={16} />
              <span>{metadata.fullName}</span>
            </div>
            <div className="tool-github-detail-grid">
              {detailItems.map((item) => (
                <div className="tool-github-detail-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <AdminDetailPlaceholder
            icon={<Github size={16} />}
            role={previewLoading || loading ? "status" : undefined}
          >
            {previewLoading || loading
              ? detailText.loading
              : failed
                ? detailText.failed
                : detailText.empty}
          </AdminDetailPlaceholder>
        )}
      </section>
    </div>
  );
}
