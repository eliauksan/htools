import {
  getGitHubSession,
  getGitHubSettings,
  isGitHubConfigured,
  json,
  jsonError,
  verifyTurnstileRequest,
  type Env
} from "../_shared";

type SubmissionPayload = {
  name?: unknown;
  description?: unknown;
  url?: unknown;
  category?: unknown;
  locale?: unknown;
  tags?: unknown;
  turnstileToken?: unknown;
};

type SubmissionLocale = "zh" | "en";

type GitHubIssueResponse = {
  html_url?: string;
  number?: number;
  message?: string;
  errors?: Array<{
    field?: string;
    message?: string;
    resource?: string;
  }>;
};

type GitHubIssueSummary = {
  body?: string | null;
  html_url?: string;
  number?: number;
  pull_request?: unknown;
};

const SUBMISSION_COOLDOWN_MS = 60_000;
const GITHUB_SUBMISSION_TIMEOUT_MS = 15_000;

class SubmissionHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly headers?: HeadersInit
  ) {
    super(message);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const settings = await getGitHubSettings(env);

  if (!isGitHubConfigured(settings)) {
    return jsonError(
      "GitHub submissions are not configured.",
      "GITHUB_NOT_CONFIGURED",
      { status: 400 }
    );
  }

  const session = await getGitHubSession(request, env);
  if (!session) {
    return jsonError(
      "Please sign in with GitHub first.",
      "GITHUB_AUTH_REQUIRED",
      { status: 401 }
    );
  }

  let cooldownReservation: { githubId: number; reservedAt: string } | null = null;
  let githubRequestTimeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const rawPayload = (await request.json()) as SubmissionPayload;
    const turnstileError = await verifyTurnstileRequest(
      request,
      env,
      rawPayload.turnstileToken
    );
    if (turnstileError) return turnstileError;
    const payload = validateSubmissionPayload(rawPayload);
    const canonicalUrl = getCanonicalSubmissionUrl(payload.url);
    const existingTool = await findExistingTool(env.DB, canonicalUrl);
    if (existingTool) {
      return jsonError(
        `This tool is already listed as ${existingTool.name}.`,
        "TOOL_ALREADY_EXISTS",
        { status: 409 },
        {
          existingTool: {
            name: existingTool.name,
            url: existingTool.url
          }
        }
      );
    }

    const cooldown = await reserveSubmissionCooldown(
      env.DB,
      session.github_id
    );
    if (!cooldown.reserved) {
      return jsonError(
        "Please wait 60 seconds before submitting another tool.",
        "SUBMISSION_RATE_LIMITED",
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
    cooldownReservation = {
      githubId: session.github_id,
      reservedAt: cooldown.reservedAt
    };

    const githubRequestController = new AbortController();
    githubRequestTimeout = setTimeout(
      () => githubRequestController.abort(),
      GITHUB_SUBMISSION_TIMEOUT_MS
    );

    const pendingIssue = await findPendingGitHubIssue({
      accessToken: session.access_token,
      canonicalUrl,
      owner: settings.owner,
      repo: settings.repo,
      signal: githubRequestController.signal
    });
    if (pendingIssue?.html_url && pendingIssue.number) {
      await releaseSubmissionCooldown(env.DB, session.github_id, cooldown.reservedAt);
      cooldownReservation = null;
      return json({
        submission: {
          kind: "pending",
          issueUrl: pendingIssue.html_url,
          issueNumber: pendingIssue.number
        }
      });
    }

    const title = buildIssueTitle(payload);
    const body = buildIssueBody(payload, session.github_login, canonicalUrl);
    const firstAttempt = await createGitHubIssue({
      accessToken: session.access_token,
      body,
      labels: settings.labels,
      owner: settings.owner,
      repo: settings.repo,
      signal: githubRequestController.signal,
      title
    });

    const result =
      shouldRetryWithoutLabels(firstAttempt.issue, settings.labels)
        ? await createGitHubIssue({
            accessToken: session.access_token,
            body,
            labels: [],
            owner: settings.owner,
            repo: settings.repo,
            signal: githubRequestController.signal,
            title
          })
        : firstAttempt;

    if (!result.response.ok || !result.issue.html_url || !result.issue.number) {
      await releaseSubmissionCooldown(env.DB, session.github_id, cooldown.reservedAt);
      cooldownReservation = null;
      return json(
        {
          error:
            result.issue.message ??
            "GitHub rejected this submission. Check repository issue permissions."
        },
        {
          status: result.response.status,
          headers: result.response.headers.get("Retry-After")
            ? { "Retry-After": result.response.headers.get("Retry-After")! }
            : undefined
        }
      );
    }

    return json({
      submission: {
        kind: "created",
        issueUrl: result.issue.html_url,
        issueNumber: result.issue.number
      }
    });
  } catch (error) {
    if (cooldownReservation) {
      await releaseSubmissionCooldown(
        env.DB,
        cooldownReservation.githubId,
        cooldownReservation.reservedAt
      );
    }
    const message =
      error instanceof Error ? error.message : "Unable to submit this tool.";
    return json(
      { error: message },
      error instanceof SubmissionHttpError
        ? { status: error.status, headers: error.headers }
        : { status: 400 }
    );
  } finally {
    if (githubRequestTimeout) clearTimeout(githubRequestTimeout);
  }
};

async function findExistingTool(db: D1Database, canonicalUrl: string) {
  const result = await db
    .prepare("SELECT name, url, demo_url FROM tools")
    .all<{ name: string; url: string; demo_url: string }>();
  return (result.results ?? []).find(
    (tool) =>
      getCanonicalSubmissionUrl(tool.url) === canonicalUrl ||
      (tool.demo_url && getCanonicalSubmissionUrl(tool.demo_url) === canonicalUrl)
  );
}

async function reserveSubmissionCooldown(
  db: D1Database,
  githubId: number
) {
  const key = `github_submission_cooldown:${githubId}`;
  const reservedAt = new Date().toISOString();
  const cutoff = new Date(Date.now() - SUBMISSION_COOLDOWN_MS).toISOString();
  const result = await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP
       WHERE app_settings.value <= ?`
    )
    .bind(key, reservedAt, cutoff)
    .run();
  return { reserved: (result.meta.changes ?? 0) > 0, reservedAt };
}

async function releaseSubmissionCooldown(
  db: D1Database,
  githubId: number,
  reservedAt: string
) {
  await db
    .prepare(
      "DELETE FROM app_settings WHERE key = ? AND value = ?"
    )
    .bind(`github_submission_cooldown:${githubId}`, reservedAt)
    .run();
}

async function findPendingGitHubIssue({
  accessToken,
  canonicalUrl,
  owner,
  repo,
  signal
}: {
  accessToken: string;
  canonicalUrl: string;
  owner: string;
  repo: string;
  signal: AbortSignal;
}) {
  const marker = getSubmissionMarker(canonicalUrl);
  const repositoryPath = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  for (let page = 1; page <= 3; page += 1) {
    let response: Response;
    let issues: GitHubIssueSummary[];
    try {
      response = await fetch(
        `https://api.github.com/repos/${repositoryPath}/issues?state=open&per_page=100&page=${page}`,
        {
          signal,
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "htools",
            "X-GitHub-Api-Version": "2022-11-28"
          }
        }
      );
      if (!response.ok) throwGitHubLookupError(response);
      issues = (await response.json()) as GitHubIssueSummary[];
    } catch (error) {
      if (error instanceof SubmissionHttpError) throw error;
      throw new SubmissionHttpError(
        "GitHub is temporarily unavailable. Please try again later.",
        503
      );
    }
    const match = issues.find((issue) => {
      if (issue.pull_request || typeof issue.body !== "string") return false;
      if (issue.body.includes(marker)) return true;
      return (issue.body.match(/https?:\/\/[^\s)<>]+/gi) ?? []).some(
        (url) => getCanonicalSubmissionUrl(url.replace(/[.,;:!?]+$/, "")) === canonicalUrl
      );
    });
    if (match) return match;
    if (issues.length < 100) break;
  }
  return null;
}

function throwGitHubLookupError(response: Response): never {
  if (response.status === 401) {
    throw new SubmissionHttpError("GitHub authorization has expired. Please sign in again.", 401);
  }
  if (response.status === 403 || response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") ?? "60";
    throw new SubmissionHttpError(
      "GitHub API rate limit reached. Please try again later.",
      429,
      { "Retry-After": retryAfter }
    );
  }
  if (response.status === 404) {
    throw new SubmissionHttpError(
      "The configured GitHub repository was not found or is not accessible.",
      503
    );
  }
  throw new SubmissionHttpError(
    "GitHub could not verify pending submissions. Please try again later.",
    503
  );
}

async function createGitHubIssue({
  accessToken,
  body,
  labels,
  owner,
  repo,
  signal,
  title
}: {
  accessToken: string;
  body: string;
  labels: string[];
  owner: string;
  repo: string;
  signal: AbortSignal;
  title: string;
}) {
  let response: Response;
  let issue: GitHubIssueResponse;
  try {
    response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      {
        method: "POST",
        signal,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "htools",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify({
          title,
          body,
          ...(labels.length ? { labels } : {})
        })
      }
    );
    issue = (await response.json()) as GitHubIssueResponse;
  } catch {
    throw new SubmissionHttpError(
      "GitHub is temporarily unavailable. Please try again later.",
      503
    );
  }

  return { issue, response };
}

function shouldRetryWithoutLabels(issue: GitHubIssueResponse, labels: string[]) {
  if (!labels.length) {
    return false;
  }

  const messages = [
    issue.message,
    ...(issue.errors ?? []).flatMap((error) => [
      error.field,
      error.message,
      error.resource
    ])
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return messages.some(
    (message) =>
      message.includes("label") ||
      message.includes("labels") ||
      message.includes("标签")
  );
}

function validateSubmissionPayload(payload: SubmissionPayload) {
  const name = sanitizeSubmissionText(readRequiredString(payload.name, "name", 100));
  const description = sanitizeSubmissionText(
    readRequiredString(payload.description, "description", 1000),
    true
  );
  const url = normalizeSubmissionUrl(readRequiredString(payload.url, "url"));
  const category = sanitizeSubmissionText(
    readRequiredString(payload.category, "category", 80)
  );
  const locale = normalizeSubmissionLocale(payload.locale);
  const tags = Array.isArray(payload.tags)
    ? [...new Set(payload.tags.flatMap((tag) =>
        typeof tag === "string" ? splitSubmissionTags(tag) : []
      )
        .map((tag) => sanitizeSubmissionText(tag).slice(0, 40))
        .filter(Boolean))]
        .slice(0, 8)
    : [];

  return {
    name,
    description,
    url,
    category,
    locale,
    tags
  };
}

function sanitizeSubmissionText(value: string, preserveNewlines = false) {
  const withoutControls = value.replace(
    preserveNewlines ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g,
    ""
  );
  return preserveNewlines
    ? withoutControls.replace(/\r\n?/g, "\n").trim()
    : withoutControls.replace(/\s+/g, " ").trim();
}

function normalizeSubmissionLocale(value: unknown): SubmissionLocale {
  return value === "en" ? "en" : "zh";
}

function splitSubmissionTags(value: string) {
  return value
    .split(/[\r\n,，、。;；|｜/／\\]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readRequiredString(value: unknown, field: string, maxLength?: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  const normalized = value.trim();
  if (maxLength && normalized.length > maxLength) {
    throw new Error(`${field} must not exceed ${maxLength} characters.`);
  }

  return normalized;
}

function normalizeSubmissionUrl(value: string) {
  const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("url must use HTTP or HTTPS.");
    }
    return parsed.toString();
  } catch {
    throw new Error("url must be a valid URL.");
  }
}

function getCanonicalSubmissionUrl(value: string) {
  try {
    const parsed = new URL(normalizeSubmissionUrl(value));
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    const githubMatch = parsed.hostname === "github.com"
      ? parsed.pathname.match(/^\/([^/]+)\/([^/]+)/)
      : null;
    if (githubMatch) {
      return `github.com/${githubMatch[1]}/${githubMatch[2].replace(/\.git$/i, "")}`.toLowerCase();
    }
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_.+|ref|source)$/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}

function getSubmissionMarker(canonicalUrl: string) {
  return `<!-- htools-submission-url:${canonicalUrl} -->`;
}

function buildIssueTitle(payload: ReturnType<typeof validateSubmissionPayload>) {
  return payload.locale === "en"
    ? `Tool submission: ${payload.name}`
    : `工具提交：${payload.name}`;
}

function buildIssueBody(
  payload: ReturnType<typeof validateSubmissionPayload>,
  githubLogin: string,
  canonicalUrl: string
) {
  const categoryLabel = getSubmissionCategoryLabel(payload.category, payload.locale);
  const tags = payload.tags.length
    ? payload.tags.join(", ")
    : payload.locale === "en"
      ? "None"
      : "无";

  if (payload.locale === "en") {
    return [
      getSubmissionMarker(canonicalUrl),
      "",
      "## Tool info",
      "",
      `- Name: ${payload.name}`,
      `- URL: ${payload.url}`,
      `- Category: ${categoryLabel}`,
      `- Tags: ${tags}`,
      "",
      "## Description",
      "",
      payload.description,
      "",
      "## Submitter",
      "",
      `Submitted by @${githubLogin} via HTools.`
    ].join("\n");
  }

  return [
    getSubmissionMarker(canonicalUrl),
    "",
    "## 工具信息",
    "",
    `- 名称：${payload.name}`,
    `- 地址：${payload.url}`,
    `- 分类：${categoryLabel}`,
    `- 标签：${tags}`,
    "",
    "## 简介",
    "",
    payload.description,
    "",
    "## 提交者",
    "",
    `由 @${githubLogin} 通过 HTools 提交。`
  ].join("\n");
}

function getSubmissionCategoryLabel(category: string, locale: SubmissionLocale) {
  if (locale === "en") {
    return category;
  }

  return zhCategoryLabels[category] ?? category;
}

const zhCategoryLabels: Record<string, string> = {
  "Web Framework": "Web 框架",
  "Browser Extension": "浏览器插件",
  Database: "数据库",
  "UI Framework": "UI 框架",
  Prototype: "原型设计",
  Authentication: "身份认证",
  Payment: "支付服务",
  "Ideas Creativity": "创意灵感",
  "SEO Opt": "SEO 优化",
  Ads: "广告联盟",
  I18N: "国际化",
  "AI Tools": "AI 工具",
  "Image Hosting": "图床",
  Email: "邮箱",
  Analytics: "网站分析",
  Tunnel: "隧道",
  Acceleration: "加速",
  "Speed Test": "测速",
  Monitoring: "监控",
  "Developer Tools": "开发者工具",
  "Customer Support": "客户服务",
  "Docs Tools": "文档工具",
  "Deploy Service": "部署服务",
  "Domain Service": "域名服务",
  "Project Management": "项目管理",
  "Product Launch": "产品发布",
  "Other Tools": "其他工具"
};
