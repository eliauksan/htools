import {
  AdminSettingsActionsSkeleton,
  AdminSettingsFieldSkeleton,
  AdminSettingsHeadingSkeleton,
  AdminStatsSkeleton
} from "./SettingsPrimitiveSkeletons";
import { SkeletonLayoutMask } from "../../shared-ui";
import type { getAdminMaintenanceText } from "../../admin-text";
import type { Messages } from "../../i18n";

export function AdminLinkCheckSkeleton({
  maintenanceText,
  section,
  t
}: {
  maintenanceText: ReturnType<typeof getAdminMaintenanceText>;
  section: "import-export" | "link-check";
  t: Messages;
}) {
  return (
    <section className="admin-link-check admin-panel-skeleton" aria-hidden="true">
      {section === "import-export" ? (
        <section className="admin-maintenance-panel">
          <section className="source-import-panel">
          <div className="source-import-main">
            <AdminSettingsHeadingSkeleton className="link-check-heading" />
            <AdminSettingsFieldSkeleton />
            <div className="source-mode-row source-file-field">
              <span className="skeleton-shimmer skeleton-line is-short" />
              <AdminSettingsActionsSkeleton className="source-action-row source-file-actions" count={1} />
              <span className="skeleton-shimmer skeleton-line is-long" />
            </div>
            <div className="source-mode-row">
              <span className="skeleton-shimmer skeleton-line is-short" />
              <div className="admin-segmented-toggle admin-segmented-toggle-skeleton">
                <span className="skeleton-shimmer admin-settings-button-skeleton" />
                <span className="skeleton-shimmer admin-settings-button-skeleton" />
              </div>
              <span className="skeleton-shimmer skeleton-line is-long" />
            </div>
            <AdminSettingsActionsSkeleton className="source-action-row" />
            <AdminStatsSkeleton
              className="source-report-grid source-report-grid-skeleton"
              labels={[
                maintenanceText.sourceTotal,
                maintenanceText.sourceValid,
                maintenanceText.sourceDuplicate,
                maintenanceText.sourceExisting,
                maintenanceText.sourceMissing,
                maintenanceText.sourceWillCreate,
                maintenanceText.sourceWillUpdate,
                maintenanceText.sourceWillSkip
              ]}
            />
          </div>

          <div className="source-import-main source-export-card">
            <AdminSettingsHeadingSkeleton className="link-check-heading" />
            <AdminStatsSkeleton
              className="source-report-grid source-export-summary source-report-grid-skeleton"
              labels={[
                maintenanceText.sourceExportCount,
                maintenanceText.sourceExportFormat,
                maintenanceText.sourceExportScope
              ]}
            />
            <AdminSettingsActionsSkeleton className="source-action-row" count={1} />
          </div>
          </section>
        </section>
      ) : (
        <SkeletonLayoutMask className="admin-maintenance-panel admin-maintenance-link-panel">
          <div className="link-check-hero">
            <AdminSettingsHeadingSkeleton className="link-check-heading" />
            <div className="link-check-config">
              <label className="link-check-field">
                <span>{t.linkCheck.timeout}</span>
                <input disabled type="number" value="8" readOnly />
                <small>{t.linkCheck.timeoutHelp}</small>
              </label>
              <label className="link-check-field">
                <span>{t.linkCheck.batchSize}</span>
                <input disabled type="number" value="6" readOnly />
                <small>{t.linkCheck.batchSizeHelp}</small>
              </label>
            </div>
            <div className="link-check-actions">
              {[
                t.linkCheck.start,
                t.linkCheck.stop,
                t.linkCheck.reload,
                t.linkCheck.clear,
                t.linkCheck.exportCsv
              ].map((label, index) => (
                <button className={index === 0 ? "primary-button" : "ghost-button"}
                  disabled
                  key={label}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <AdminStatsSkeleton
            className="link-check-stats"
            labels={[
              t.linkCheck.total,
              t.linkCheck.checked,
              t.linkCheck.normal,
              t.linkCheck.abnormal,
              t.linkCheck.networkError
            ]}
          />

          <section className="link-check-progress">
            <div className="link-check-progress-head">
              <AdminSettingsHeadingSkeleton />
              <span className="skeleton-shimmer link-check-percent-skeleton" />
            </div>
            <div className="link-check-progress-track" aria-hidden="true">
              <span style={{ width: "0%" }} />
            </div>
          </section>

          <section className="link-check-results">
            <div className="link-check-results-head">
              <AdminSettingsHeadingSkeleton />
            </div>
            <div className="link-check-tabs" role="tablist">
              <button disabled type="button">{t.linkCheck.tabsAbnormal(0)}</button>
              <button disabled type="button">{t.linkCheck.tabsStatus(0, 0)}</button>
              <button disabled type="button">{t.linkCheck.tabsAll(0)}</button>
            </div>
            <div className="link-check-empty-state admin-link-empty-skeleton">
              <span className="skeleton-shimmer skeleton-line is-medium" />
            </div>
          </section>
        </SkeletonLayoutMask>
      )}
    </section>
  );
}
