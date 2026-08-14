import { ChevronDown, Github, SquarePen, Star, Trash2 } from "lucide-react";
import { formatAdminDate } from "../../admin-helpers";
import type { Messages } from "../../i18n";
import { proxifyUrl } from "../../proxy";
import { CompactTagRow } from "../../shared-ui";
import type { getTelegramText } from "../../telegram";
import { isGitHubUrl } from "../../admin-display";
import type { ProxySettings, Tool } from "../../types";
import { useAdminCardActionMenu } from "../../useAdminCardActionMenu";
import AdminSiteIcon from "../AdminSiteIcon";
import { AdminTelegramPushButton } from "../AdminTelegramPushButton";

export function AdminToolCard({
  isBusy,
  onDelete,
  onEdit,
  onTelegram,
  onToggleFeatured,
  proxySettings,
  t,
  telegramEnabled,
  telegramText,
  tool
}: {
  isBusy: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onTelegram: () => void;
  onToggleFeatured: () => void;
  proxySettings: ProxySettings;
  t: Messages;
  telegramEnabled: boolean;
  telegramText: ReturnType<typeof getTelegramText>;
  tool: Tool;
}) {
  const displayDate = formatAdminDate(tool.created_at ?? tool.updated_at);
  const actions = useAdminCardActionMenu(`tool:${tool.id}`);
  const isGitHubTool = isGitHubUrl(tool.url);
  const toolHref = proxifyUrl(tool.url, proxySettings);

  return (
    <article className="admin-tool-card">
      <div className="admin-tool-card-head">
        {isGitHubTool ? (
          <span className="admin-tool-avatar is-github">
            <Github size={25} strokeWidth={2.1} fill="currentColor" />
          </span>
        ) : (
          <AdminSiteIcon
            className="admin-tool-avatar"
            iconSize={20}
            proxySettings={proxySettings}
            url={tool.url}
          />
        )}
        <div className="admin-tool-title">
          <div className="admin-tool-title-row">
            <h2>{tool.name}</h2>
          </div>
          <div className="admin-tool-title-meta">
            {displayDate ? (
              <span>
                {displayDate}
              </span>
            ) : null}
          </div>
        </div>
        <div className="admin-tool-card-actions" ref={actions.rootRef}>
          {telegramEnabled ? (
            <AdminTelegramPushButton
              disabled={isBusy}
              label={`${telegramText.action}: ${tool.name}`}
              onClick={() => {
                actions.close();
                onTelegram();
              }}
            />
          ) : null}
          <button className={`icon-button admin-featured-badge ${
              tool.featured ? "is-active" : ""
            }`}
            type="button"
            aria-label={t.form.featuredTool}
            aria-pressed={tool.featured}
            disabled={isBusy}
            onClick={() => {
              actions.close();
              onToggleFeatured();
            }}
          >
            <Star size={16} fill={tool.featured ? "currentColor" : "none"} />
          </button>
          <button className={`icon-button admin-tool-menu-trigger ${
              actions.open ? "is-active" : ""
            }`}
            type="button"
            aria-expanded={actions.open}
            aria-haspopup="menu"
            aria-label={`${tool.name} actions`}
            disabled={isBusy}
            ref={actions.triggerRef}
            onKeyDown={actions.handleTriggerKeyDown}
            onClick={() => actions.setOpen((current) => !current)}
          >
            <ChevronDown size={17} />
          </button>
          {actions.open ? (
            <div className="admin-tool-action-menu" role="menu" onKeyDown={actions.handleMenuKeyDown}>
              <button disabled={isBusy}
                type="button"
                role="menuitem"
                onClick={() => {
                  actions.close();
                  onEdit();
                }}
              >
                <SquarePen size={18} />
                <span className="admin-action-label-full">{t.admin.editTool}</span>
                <span className="admin-action-label-short">
                  {t.admin.editAction}
                </span>
              </button>
              <button className="danger"
                disabled={isBusy}
                type="button"
                role="menuitem"
                onClick={() => {
                  actions.close();
                  onDelete();
                }}
              >
                <Trash2 size={16} />
                <span className="admin-action-label-full">{t.admin.deleteTool}</span>
                <span className="admin-action-label-short">
                  {t.admin.deleteAction}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <p className="admin-tool-description">{tool.description}</p>

      <div className="admin-tool-links">
        <div className="admin-tool-link-row" title={tool.url}>
          <a
            className="admin-tool-link-text"
            href={toolHref}
            rel="noreferrer"
            target="_blank"
            aria-label={`${t.actions.visit}: ${tool.name}`}
          >
            {tool.url}
          </a>
        </div>
      </div>

      <div className="admin-tool-card-footer">
        <CompactTagRow fallbackCategory={tool.category} tags={tool.tags} />
      </div>
    </article>
  );
}
