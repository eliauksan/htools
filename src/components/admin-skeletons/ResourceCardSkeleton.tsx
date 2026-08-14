import { ChevronDown, Github, Send, Star } from "lucide-react";
import { CompactTagRow } from "../../shared-ui";

export function AdminResourceCardSkeletonGrid({ ariaLabel }: { ariaLabel: string }) {
  return (
    <section className="admin-tool-grid" aria-label={ariaLabel}>
      {Array.from({ length: 8 }).map((_, index) => (
        <AdminResourceCardSkeleton key={index} />
      ))}
    </section>
  );
}

export function AdminResourceCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="admin-tool-card admin-resource-card-skeleton skeleton-layout-mask"
    >
      <div className="admin-tool-card-head">
        <span className="admin-tool-avatar is-github"><Github size={25} /></span>
        <div className="admin-tool-title">
          <div className="admin-tool-title-row">
            <h2>Resource title placeholder</h2>
          </div>
          <div className="admin-tool-title-meta">
            <span>2026-08-04</span>
          </div>
        </div>
        <div className="admin-tool-card-actions">
          <button className="icon-button" disabled type="button"><Send size={15} /></button>
          <button className="icon-button" disabled type="button"><Star size={16} /></button>
          <button className="icon-button" disabled type="button"><ChevronDown size={17} /></button>
        </div>
      </div>
      <p className="admin-tool-description">Resource description placeholder follows the shared card structure.</p>
      <div className="admin-tool-links">
        <div className="admin-tool-link-row">
          <span className="admin-tool-link-text">https://example.com/resource</span>
        </div>
      </div>
      <div className="admin-tool-card-footer">
        <CompactTagRow tags={["Resource", "Category", "Tag"]} />
      </div>
    </article>
  );
}
