import { ChevronDown, Circle, Globe, RefreshCw, Send } from "lucide-react";
import { ArticleDetailContentSkeleton } from "../ArticleDetailContent";
import type { getContentFlowText } from "../../admin-text";
import type { Locale } from "../../i18n";

export function ContentFlowSkeleton({
  contentText,
  locale
}: {
  contentText: ReturnType<typeof getContentFlowText>;
  locale: Locale;
}) {
  return (
    <section
      className="content-flow-layout content-flow-skeleton skeleton-layout-mask"
      aria-hidden="true"
    >
      <aside className="content-flow-rail">
        <div className="content-flow-section-head">
          <h2>{contentText.title}</h2>
          <p>{contentText.description}</p>
        </div>

        <div className="content-source-list">
          <div className="content-source-group">
            <span className="content-source-group-chevron" />
            <span className="content-source-group-main">
              <span className="content-source-group-copy"><strong>{contentText.allSources}</strong><small>2</small></span>
            </span>
          </div>
          {Array.from({ length: 2 }).map((_, groupIndex) => (
            <div className="content-source-group-wrap" key={groupIndex}>
              <div className="content-source-group">
                <span className="content-source-group-toggle"><ChevronDown size={15} /></span>
                <span className="content-source-group-main">
                  <span className="content-source-group-copy"><strong>{contentText.categoryLabel}</strong><small>1</small></span>
                </span>
              </div>
              <div className="content-source-group-items">
                <div className="content-source-item">
                  <span className="content-source-main">
                    <span className="content-source-icon"><Globe aria-hidden="true" size={15} /></span>
                    <span className="content-source-copy"><strong>{contentText.addSource}</strong><small>30</small></span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="content-flow-main">
        <div className="content-source-toolbar">
          <div className="content-source-toolbar-title">
            <span className="content-source-icon"><Globe aria-hidden="true" size={15} /></span>
            <strong>{contentText.addSource}</strong>
          </div>
          <div className="content-source-toolbar-actions">
            <button className="icon-button" disabled type="button"><RefreshCw size={15} /></button>
            <button className="icon-button" disabled type="button"><ChevronDown size={17} /></button>
          </div>
        </div>
        <div className="content-flow-main-scroll">
          <div className="content-item-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <article className="content-item-card has-source-icon" key={index}>
                <span className="content-source-icon"><Globe aria-hidden="true" size={15} /></span>
                <div className="content-item-select">
                  <span className="content-item-title-row"><strong>Content item title placeholder</strong><time>2026-07-18</time></span>
                  <span className="content-item-summary">
                    Content item summary follows the final responsive list structure.
                  </span>
                </div>
                <div className="content-item-mobile-actions"><div className="admin-tool-card-actions">
                  <button className="icon-button" disabled type="button"><Send size={15} /></button>
                  <button className="icon-button" disabled type="button"><Circle size={16} /></button>
                  <button className="icon-button" disabled type="button"><ChevronDown size={17} /></button>
                </div></div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <aside className="content-flow-reader">
        <div className="content-reader-toolbar"><div className="content-reader-actions">
          <button className="icon-button" disabled type="button"><Send size={15} /></button>
          <button className="icon-button" disabled type="button"><Circle size={16} /></button>
          <button className="icon-button" disabled type="button"><ChevronDown size={17} /></button>
        </div></div>
        <div className="content-flow-reader-scroll">
          <ArticleDetailContentSkeleton locale={locale} />
        </div>
      </aside>
    </section>
  );
}
