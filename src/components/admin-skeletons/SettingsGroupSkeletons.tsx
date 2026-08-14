import {
  AdminSettingsActionsSkeleton,
  AdminSettingsCopySkeleton,
  AdminSettingsFieldSkeleton,
  AdminSettingsHeadingSkeleton,
  AdminSettingsTextMask
} from "./SettingsPrimitiveSkeletons";
import type { getAdminMaintenanceText } from "../../admin-text";

export function SiteSettingsGroupSkeleton() {
  return (
    <>
      <article className="source-public-card site-identity-card admin-settings-card-skeleton">
        <AdminSettingsHeadingSkeleton />
        <div className="proxy-settings-form">
          <div className="settings-grid">
            <AdminSettingsFieldSkeleton />
            <AdminSettingsFieldSkeleton />
          </div>
          <AdminSettingsFieldSkeleton />
          <span className="skeleton-shimmer skeleton-line is-medium admin-settings-help-skeleton" />
          <div className="site-identity-footer">
            <div className="site-identity-preview-shell">
              <div className="site-identity-preview">
                <span className="skeleton-shimmer admin-settings-logo-skeleton" />
                <span className="admin-settings-preview-lines">
                  <span className="skeleton-shimmer skeleton-line is-medium" />
                  <span className="skeleton-shimmer skeleton-line is-short" />
                </span>
              </div>
              <span className="skeleton-shimmer admin-settings-icon-action-skeleton" />
            </div>
            <AdminSettingsActionsSkeleton className="site-identity-actions" />
          </div>
        </div>
      </article>

      <HomeHeroSettingsSkeleton />

      <article className="source-public-card footer-settings-card admin-settings-card-skeleton">
        <AdminSettingsHeadingSkeleton />
        <div className="footer-settings-form">
          <AdminSettingsFieldSkeleton />
          <div className="footer-settings-pair">
            <AdminSettingsFieldSkeleton />
            <AdminSettingsFieldSkeleton />
          </div>
          <AdminSettingsFieldSkeleton
            className="footer-social-links-field"
            textareaClassName="admin-settings-textarea-skeleton"
          />
          <AdminSettingsFieldSkeleton textareaClassName="admin-settings-textarea-skeleton" />
          <span className="skeleton-shimmer skeleton-line is-long admin-settings-help-skeleton" />
          <AdminSettingsActionsSkeleton />
        </div>
      </article>

      {Array.from({ length: 3 }).map((_, index) => (
        <article className="source-public-card legal-settings-card admin-settings-card-skeleton" key={index}>
          <AdminSettingsHeadingSkeleton />
          <div className="legal-settings-form">
            <AdminSettingsFieldSkeleton textareaClassName="admin-settings-textarea-skeleton is-editor" />
            <AdminSettingsFieldSkeleton textareaClassName="admin-settings-textarea-skeleton is-editor" />
            <AdminSettingsActionsSkeleton />
          </div>
        </article>
      ))}
    </>
  );
}

export function HomeHeroSettingsSkeleton() {
  return (
    <article className="source-public-card home-copy-settings-card admin-settings-card-skeleton">
      <AdminSettingsHeadingSkeleton />
      <div className="home-copy-settings-form">
        {Array.from({ length: 2 }).map((_, index) => (
          <div className="home-copy-language-group" key={index}>
            <span className="skeleton-shimmer skeleton-line is-short" />
            <AdminSettingsFieldSkeleton />
            <AdminSettingsFieldSkeleton />
            <AdminSettingsFieldSkeleton
              className="home-copy-description-field"
              textareaClassName="admin-settings-textarea-skeleton"
            />
          </div>
        ))}
        <AdminSettingsActionsSkeleton />
      </div>
    </article>
  );
}

export function ProxySettingsCardSkeleton({
  maintenanceText
}: {
  maintenanceText: ReturnType<typeof getAdminMaintenanceText>;
}) {
  return (
    <div className="admin-settings-card-loading" aria-hidden="true">
      <AdminSettingsCopySkeleton
        className="source-card-heading"
        description={maintenanceText.proxyDescription}
        title={maintenanceText.proxyTitle}
        withStatus
      />
      <div className="proxy-settings-form">
        <AdminSettingsFieldSkeleton />
        <AdminSettingsFieldSkeleton />
        <AdminSettingsFieldSkeleton />
        <span className="skeleton-shimmer skeleton-line is-long admin-settings-help-skeleton" />
        <span className="skeleton-shimmer skeleton-line is-medium admin-settings-help-skeleton" />
        <AdminSettingsActionsSkeleton count={1} />
      </div>
    </div>
  );
}

export function FactoryResetCardSkeleton({
  maintenanceText
}: {
  maintenanceText: ReturnType<typeof getAdminMaintenanceText>;
}) {
  return (
    <div className="admin-settings-card-loading" aria-hidden="true">
      <div className="admin-settings-copy-skeleton">
        <h3><AdminSettingsTextMask>{maintenanceText.resetTitle}</AdminSettingsTextMask></h3>
        <p><AdminSettingsTextMask>{maintenanceText.resetDescription}</AdminSettingsTextMask></p>
        <p><AdminSettingsTextMask>{maintenanceText.resetWarning}</AdminSettingsTextMask></p>
      </div>
      <AdminSettingsActionsSkeleton count={1} />
    </div>
  );
}

export function BackupRestoreCardSkeleton({
  maintenanceText
}: {
  maintenanceText: ReturnType<typeof getAdminMaintenanceText>;
}) {
  return (
    <div className="admin-settings-card-loading" aria-hidden="true">
      <div className="admin-settings-copy-skeleton">
        <h3><AdminSettingsTextMask>{maintenanceText.backupTitle}</AdminSettingsTextMask></h3>
        <p><AdminSettingsTextMask>{maintenanceText.backupDescription}</AdminSettingsTextMask></p>
        <p><AdminSettingsTextMask>{maintenanceText.backupHelp}</AdminSettingsTextMask></p>
      </div>
      <div className="source-public-actions">
        <span className="skeleton-shimmer admin-settings-button-skeleton" />
        <span className="skeleton-shimmer admin-settings-button-skeleton is-secondary" />
        <span className="skeleton-shimmer admin-settings-button-skeleton is-secondary" />
      </div>
    </div>
  );
}

export function GitHubSettingsFormSkeleton({
  maintenanceText
}: {
  maintenanceText: ReturnType<typeof getAdminMaintenanceText>;
}) {
  return (
    <div className="tool-form github-settings-form" aria-hidden="true">
      <AdminSettingsCopySkeleton
        className="settings-card-heading github-settings-heading"
        description={maintenanceText.githubSubmissionDescription}
        title={maintenanceText.githubSubmissionTitle}
        withStatus
        wrapTitle
      />
      <div className="settings-grid">
        <AdminSettingsFieldSkeleton className="github-owner-skeleton" />
        <AdminSettingsFieldSkeleton className="github-repo-skeleton" />
      </div>
      <AdminSettingsFieldSkeleton className="github-labels-skeleton" />
      <AdminSettingsActionsSkeleton className="github-settings-actions" count={1} />
    </div>
  );
}
